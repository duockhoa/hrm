import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WarehouseReceiptListQueryDto } from './dto/warehouse-receipt-list-query.dto';
import { warehouseReceiptFilters } from './warehouse-receipt-filters';

describe('Warehouse receipt filters', () => {
  it('includes the entire received day in Vietnam time', () => {
    expect(
      warehouseReceiptFilters({
        from_date: '2026-11-25',
        to_date: '2026-11-25',
      }),
    ).toContainEqual({
      received_at: {
        gte: new Date('2026-11-24T17:00:00Z'),
        lt: new Date('2026-11-25T17:00:00Z'),
      },
    });
  });

  it('treats expiry dates as calendar dates and supports open-ended ranges', () => {
    expect(
      warehouseReceiptFilters({ expiry_from: '2026-11-25' }),
    ).toContainEqual({
      expiry_date: { gte: new Date('2026-11-25T00:00:00Z') },
    });
    expect(warehouseReceiptFilters({ expiry_to: '2026-11-25' })).toContainEqual(
      { expiry_date: { lt: new Date('2026-11-26T00:00:00Z') } },
    );
  });

  it('supports a zero actual quantity without treating missing values as zero', () => {
    expect(
      warehouseReceiptFilters({
        actual_quantity_min: '0',
        actual_quantity_max: '0',
      }),
    ).toEqual([{ actual_quantity: { gte: '0', lte: '0' } }]);
  });

  it.each([
    { from_date: '2026-11-26', to_date: '2026-11-25' },
    { expiry_from: '2026-11-26', expiry_to: '2026-11-25' },
    { quantity_min: '2', quantity_max: '1' },
    { actual_quantity_min: '0.002', actual_quantity_max: '0.001' },
  ])('rejects reversed ranges %j', (options) => {
    expect(() => warehouseReceiptFilters(options)).toThrow(BadRequestException);
  });

  it('combines independent status filters and requires the selected attachment type', () => {
    expect(
      warehouseReceiptFilters({
        dispatch_note_status: 'missing',
        coa_status: 'has',
        original_label_status: 'has',
        sampling_status: 'not_sent',
        sap_status: 'entered',
        sensory_status: 'fail',
      }),
    ).toEqual(
      expect.arrayContaining([
        { attachments: { none: { attachment_type: 'dispatch_note' } } },
        { attachments: { some: { attachment_type: 'coa' } } },
        { attachments: { some: { attachment_type: 'original_label' } } },
        { samplingRequest: { is: null } },
        { sapConfirmation: { isNot: null } },
        { sensory_passed: false },
      ]),
    );
    expect(warehouseReceiptFilters({ sensory_status: 'unrecorded' })).toEqual([
      { sensory_passed: null },
    ]);
  });

  it('escapes wildcard characters in text criteria', () => {
    expect(warehouseReceiptFilters({ lot_number: 'LOT_%' })).toEqual([
      { lot_number: { contains: 'LOT\\_\\%' } },
    ]);
  });

  it('preserves all validated filter query parameters and trims text', async () => {
    const dto = plainToInstance(WarehouseReceiptListQueryDto, {
      search: ' PEG ',
      item_code: ' NL001 ',
      lot_number: ' LOT ',
      quantity_min: '0',
      sap_status: 'not_entered',
      from_date: '2026-11-25',
      page: '2',
      limit: '300',
    });
    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect(dto).toMatchObject({
      search: 'PEG',
      item_code: 'NL001',
      lot_number: 'LOT',
      quantity_min: '0',
      sap_status: 'not_entered',
      from_date: '2026-11-25',
      page: 2,
      limit: 300,
    });
  });

  it.each([
    { coa_status: 'other' },
    { sap_status: ['entered', 'not_entered'] },
    { counting_method: 'other' },
    { sensory_status: 'false' },
    { expiry_from: '2026-02-30' },
    { quantity_min: '-1' },
    { actual_quantity_max: '1.1234' },
    { quantity_max: '1000000000' },
  ])('rejects malformed query values %j', async (options) => {
    expect(
      await validate(plainToInstance(WarehouseReceiptListQueryDto, options), {
        whitelist: true,
      }),
    ).not.toHaveLength(0);
  });
});

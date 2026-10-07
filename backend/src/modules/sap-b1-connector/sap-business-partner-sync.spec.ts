import { PrismaService } from 'src/prisma.service';
import { SapB1ConnectorService } from './sap-b1-connector.service';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';

describe('SAP business partner sync', () => {
  const partner = {
    CardCode: 'NC.0168',
    CardName: 'Dược Phúc Thái',
    CardType: 'cSupplier',
    GroupCode: 110,
    FederalTaxID: '0103906607',
    Address: null,
    U_Diachi: 'Hà Nội',
    U_NLH: 'Nguyễn Văn A',
    U_SDT: '0900000000',
    Valid: 'tYES',
    Frozen: 'tNO',
    CreateDate: '2025-04-03',
    UpdateDate: '2025-04-11',
    UpdateTime: '11:18:18',
  };
  let upsert: jest.Mock;
  let getBusinessPartners: jest.Mock;
  let service: SapB1ConnectorService;

  beforeEach(() => {
    upsert = jest.fn().mockResolvedValue({});
    getBusinessPartners = jest.fn().mockResolvedValue([partner]);
    service = new SapB1ConnectorService(
      { businessPartners: { upsert } } as unknown as PrismaService,
      { getBusinessPartners } as unknown as SapB1ServiceLayerClient,
    );
  });

  it('upserts by SAP code, preserving UDFs, nulls, tax code and date/time', async () => {
    await service.handleCronSyncBusinessPartners();
    expect(upsert).toHaveBeenCalledWith({
      where: { card_code: partner.CardCode },
      create: expect.objectContaining({
        card_name: partner.CardName,
        tax_code: '0103906607',
        address: null,
        custom_address: 'Hà Nội',
        custom_contact_person: 'Nguyễn Văn A',
        custom_phone: '0900000000',
        is_valid: true,
        is_frozen: false,
        sap_updated_date: new Date('2025-04-11T00:00:00Z'),
        sap_updated_time: '11:18:18',
      }),
      update: expect.any(Object),
    });
    expect(upsert.mock.calls[0][0].update).toEqual(
      upsert.mock.calls[0][0].create,
    );
    getBusinessPartners.mockResolvedValue([
      { ...partner, CardName: 'Tên mới', U_Diachi: null },
    ]);
    await service.handleCronSyncBusinessPartners();
    expect(upsert.mock.calls[1][0].update).toMatchObject({
      card_name: 'Tên mới',
      custom_address: null,
    });
  });

  it('skips invalid records and continues after a database failure', async () => {
    getBusinessPartners.mockResolvedValue([
      { ...partner, CardCode: null },
      { ...partner, CardCode: 'A'.repeat(192) },
      { ...partner, CardName: null },
      { ...partner, CardType: 'unknown' },
      { ...partner, UpdateDate: 'invalid-date' },
      { ...partner, Valid: 'unknown' },
      partner,
      { ...partner, CardCode: 'KH001', CardType: 'cCustomer' },
      { ...partner, CardCode: 'LEAD001', CardType: 'cLid' },
    ]);
    upsert.mockRejectedValueOnce(new Error('database unavailable'));
    await service.handleCronSyncBusinessPartners();
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert.mock.calls[2][0].where.card_code).toBe('LEAD001');
  });

  it('prevents overlapping runs and releases the lock after fetch failure', async () => {
    let rejectFetch!: (error: Error) => void;
    getBusinessPartners.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectFetch = reject;
      }),
    );
    const running = service.handleCronSyncBusinessPartners();
    await service.handleCronSyncBusinessPartners();
    expect(getBusinessPartners).toHaveBeenCalledTimes(1);
    rejectFetch(new Error('SAP unavailable'));
    await running;
    await service.handleCronSyncBusinessPartners();
    expect(getBusinessPartners).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});

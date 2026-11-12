import { PrismaService } from 'src/prisma.service';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';
import { SapItemSeriesSyncService } from './sap-item-series-sync.service';

describe('SAP item series sync', () => {
  const row = {
    Series: 108,
    Document: '4',
    Name: 'TP',
    Prefix: 'TP',
    Suffix: '',
    Locked: 'tNO',
    IsManual: 'tNO',
    NextNumber: 780,
    DocumentSubType: '--',
    InitialNumber: 1,
    LastNumber: 99999,
    Remarks: '',
    GroupCode: 'sg_Group1',
    PeriodIndicator: 'Default',
    IsDigitalSeries: 'tNO',
    DigitNumber: 6,
    SeriesType: 'stItem',
    BPLID: 1,
    ATDocumentType: 'test-type',
    IsElectronicCommEnabled: 'tYES',
    CostAccountOnly: 'tNO',
    InvoiceType: 0,
    InvoiceTypeOfNegativeInvoice: 0,
  };
  let aggregate: jest.Mock;
  let upsert: jest.Mock;
  let transaction: jest.Mock;
  let getItemSeries: jest.Mock;
  let service: SapItemSeriesSyncService;

  beforeEach(() => {
    aggregate = jest.fn().mockResolvedValue({ _max: { synced_at: null } });
    upsert = jest.fn().mockReturnValue(Promise.resolve({}));
    transaction = jest.fn().mockResolvedValue([]);
    getItemSeries = jest.fn().mockResolvedValue([row]);
    service = new SapItemSeriesSyncService(
      {
        sapItemSeries: { aggregate, upsert },
        $transaction: transaction,
      } as unknown as PrismaService,
      { getItemSeries } as unknown as SapB1ServiceLayerClient,
    );
  });

  it('populates the table on startup and preserves all SAP fields', async () => {
    await service.onModuleInit();
    expect(upsert).toHaveBeenCalledWith({
      where: { series: 108 },
      create: {
        series: 108,
        document: '4',
        name: 'TP',
        prefix: 'TP',
        suffix: '',
        is_manual: false,
        is_locked: false,
        document_sub_type: '--',
        initial_number: 1,
        last_number: 99999,
        next_number: 780,
        remarks: '',
        group_code: 'sg_Group1',
        period_indicator: 'Default',
        is_digital_series: false,
        digit_number: 6,
        series_type: 'stItem',
        bpl_id: 1,
        at_document_type: 'test-type',
        is_electronic_comm_enabled: true,
        cost_account_only: false,
        invoice_type: 0,
        invoice_type_of_negative_invoice: 0,
        synced_at: expect.any(Date),
      },
      update: expect.any(Object),
    });
    expect(upsert.mock.calls[0][0].create).toEqual(
      upsert.mock.calls[0][0].update,
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('stores nullable SAP properties as null without a raw_data field', async () => {
    getItemSeries.mockResolvedValue([
      {
        Series: 3,
        Document: '4',
        Name: 'Manual',
        LastNumber: null,
        DigitNumber: null,
        BPLID: null,
        InvoiceType: null,
        InvoiceTypeOfNegativeInvoice: null,
      },
    ]);
    await service.syncIfDue();
    const data = upsert.mock.calls[0][0].create as Record<string, unknown>;
    expect(Object.keys(data)).toHaveLength(24);
    expect(data).not.toHaveProperty('raw_data');
    expect(data).toEqual(
      expect.objectContaining({
        last_number: null,
        digit_number: null,
        bpl_id: null,
        invoice_type: null,
        invoice_type_of_negative_invoice: null,
        is_digital_series: null,
        is_electronic_comm_enabled: null,
        cost_account_only: null,
      }),
    );
  });

  it.each([0, 24, 71.99])(
    'does not call SAP when the last success was %s hours ago',
    async (hours) => {
      aggregate.mockResolvedValue({
        _max: { synced_at: new Date(Date.now() - hours * 3600000) },
      });
      await service.onModuleInit();
      expect(getItemSeries).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('syncs again after 72 hours using the persisted timestamp', async () => {
    aggregate.mockResolvedValue({
      _max: { synced_at: new Date(Date.now() - 72 * 3600000) },
    });
    await service.syncIfDue();
    expect(getItemSeries).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('prevents overlapping syncs and allows retry after a SAP failure', async () => {
    let rejectFetch!: (error: Error) => void;
    getItemSeries.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectFetch = reject;
      }),
    );
    const running = service.syncIfDue();
    await service.syncIfDue();
    expect(getItemSeries).toHaveBeenCalledTimes(1);
    rejectFetch(new Error('SAP unavailable'));
    await running;
    expect(transaction).not.toHaveBeenCalled();
    await service.syncIfDue();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    [],
    [{ ...row, Series: null }],
    [{ ...row, Document: '2' }],
    [{ ...row, Locked: 'unknown' }],
  ])('does not write empty or invalid responses: %j', async (...args) => {
    getItemSeries.mockResolvedValue(args);
    await service.syncIfDue();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('allows retry after a transaction failure', async () => {
    transaction.mockRejectedValueOnce(new Error('Database unavailable'));
    await service.syncIfDue();
    await service.syncIfDue();
    expect(transaction).toHaveBeenCalledTimes(2);
  });
});

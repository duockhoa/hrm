import axios from 'axios';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';

describe('SAP Service Layer pagination', () => {
  const originalUrl = process.env.SAP_SERVICE_LAYER_URL;
  const createAxios = axios.create.bind(axios);
  let get: jest.Mock;

  beforeEach(() => {
    get = jest.fn();
    jest.spyOn(axios, 'create').mockImplementation((config) => {
      const instance = createAxios(config);
      instance.get = get;
      instance.post = jest.fn().mockResolvedValue({
        data: { SessionId: 'test-session' },
      });
      return instance;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUrl === undefined) delete process.env.SAP_SERVICE_LAYER_URL;
    else process.env.SAP_SERVICE_LAYER_URL = originalUrl;
  });

  it.each([
    ['v1', 'odata.nextLink', '/b1s/v1/Items?$skip=1'],
    ['v2', '@odata.nextLink', 'Items?$skip=1'],
    ['v2', '@odata.nextLink', '?$skip=1'],
    ['v2', '@odata.nextLink', 'https://sap.test/b1s/v2/Items?$skip=1'],
  ])('follows %s pagination with %s at %s', async (version, key, link) => {
    process.env.SAP_SERVICE_LAYER_URL = `https://sap.test/b1s/${version}/`;
    get
      .mockResolvedValueOnce({ data: { value: ['A'], [key]: link } })
      .mockResolvedValueOnce({ data: { value: ['B'] } });

    await expect(new SapB1ServiceLayerClient().getItems()).resolves.toEqual([
      'A',
      'B',
    ]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(
      2,
      `https://sap.test/b1s/${version}/Items?$skip=1`,
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: 'B1SESSION=test-session' }),
      }),
    );
  });

  it('rejects a continuation on another origin', async () => {
    process.env.SAP_SERVICE_LAYER_URL = 'https://sap.test/b1s/v2/';
    get.mockResolvedValueOnce({
      data: {
        value: ['A'],
        '@odata.nextLink': 'https://elsewhere.test/b1s/v2/Items?$skip=1',
      },
    });

    await expect(new SapB1ServiceLayerClient().getItems()).rejects.toThrow(
      'different origin',
    );
    expect(get).toHaveBeenCalledTimes(1);
  });

  const localOrder = {
    id: 3353,
    item_code: 'TP001',
    lot_no: '001',
    production_order_code: 'TP001-001-3353',
  };

  it('uses the SAP internal key and groups matching lines across pages by receipt', async () => {
    process.env.SAP_SERVICE_LAYER_URL = 'https://sap.test/b1s/v2/';
    const header = { DocEntry: 8, DocNum: 42, DocDate: '2026-11-24' };
    const line = { BaseEntry: 3599, BaseType: 202, LineNum: 0 };
    const row = (receipt: typeof header, detail: typeof line) => ({
      InventoryGenEntries: receipt,
      'InventoryGenEntries/DocumentLines': detail,
    });
    get
      .mockResolvedValueOnce({
        data: {
          value: [
            {
              AbsoluteEntry: 3353,
              DocumentNumber: 3353,
              ItemNo: 'TP002',
              U_SL: '001',
            },
            {
              AbsoluteEntry: 3599,
              DocumentNumber: 3353,
              ItemNo: 'TP001',
              U_SL: '001',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          value: [row(header, line)],
          '@odata.nextLink': '?$skip=1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          value: [
            row(header, { ...line, LineNum: 1 }),
            row(header, { ...line, BaseEntry: 3353 }),
            row({ ...header, DocEntry: 7 }, line),
          ],
        },
      });

    const receipts = await new SapB1ServiceLayerClient().getProductionReceipts(
      localOrder,
    );
    expect(
      receipts?.map(({ DocEntry, DocumentLines }) => [
        DocEntry,
        DocumentLines.map(({ LineNum }) => LineNum),
      ]),
    ).toEqual([
      [8, [0, 1]],
      [7, [0]],
    ]);
    expect(decodeURIComponent(get.mock.calls[1][0])).toContain(
      '/BaseEntry eq 3599',
    );
    expect(decodeURIComponent(get.mock.calls[1][0])).toContain(
      '/BaseType eq 202',
    );
  });

  it('does not request receipts for a different lot with the same SAP document number', async () => {
    process.env.SAP_SERVICE_LAYER_URL = 'https://sap.test/b1s/v2/';
    get.mockResolvedValueOnce({
      data: {
        value: [
          {
            AbsoluteEntry: 3353,
            DocumentNumber: 3353,
            ItemNo: 'TP001',
            U_SL: '002',
          },
        ],
      },
    });

    await expect(
      new SapB1ServiceLayerClient().getProductionReceipts(localOrder),
    ).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });
});

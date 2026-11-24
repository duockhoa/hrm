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
});

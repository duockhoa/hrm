import axios, { AxiosInstance } from 'axios';
import { SapB1ServiceLayerClient } from './sap-b1-service-layer.client';

describe('SAP item series client', () => {
  let post: jest.Mock;
  let client: SapB1ServiceLayerClient;
  const originalUrl = process.env.SAP_SERVICE_LAYER_URL;

  beforeEach(() => {
    process.env.SAP_SERVICE_LAYER_URL = 'https://sap.test/b1s/v1/';
    post = jest.fn().mockImplementation((endpoint: string) => {
      if (endpoint === 'Login') {
        return Promise.resolve({ data: { SessionId: 'test-session' } });
      }
      return Promise.resolve({
        data: { value: [{ Series: 3, Document: '4', Name: 'Manual' }] },
      });
    });
    jest
      .spyOn(axios, 'create')
      .mockReturnValue({ post } as unknown as AxiosInstance);
    client = new SapB1ServiceLayerClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUrl === undefined) delete process.env.SAP_SERVICE_LAYER_URL;
    else process.env.SAP_SERVICE_LAYER_URL = originalUrl;
  });

  it('requests item document series using an authenticated POST', async () => {
    await expect(client.getItemSeries()).resolves.toEqual([
      { Series: 3, Document: '4', Name: 'Manual' },
    ]);
    expect(post).toHaveBeenCalledWith(
      'SeriesService_GetDocumentSeries',
      { DocumentTypeParams: { Document: '4' } },
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: 'B1SESSION=test-session' }),
      }),
    );
  });

  it('renews an expired SAP session and retries the read action once', async () => {
    post.mockReset();
    post
      .mockResolvedValueOnce({ data: { SessionId: 'expired' } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockResolvedValueOnce({ data: { SessionId: 'renewed' } })
      .mockResolvedValueOnce({ data: { value: [] } });
    await expect(client.getItemSeries()).resolves.toEqual([]);
    expect(post).toHaveBeenCalledTimes(4);
  });

  it('rejects a malformed response instead of treating it as an empty list', async () => {
    post.mockResolvedValueOnce({ data: { SessionId: 'test-session' } });
    post.mockResolvedValueOnce({ data: {} });
    await expect(client.getItemSeries()).rejects.toThrow('value array');
  });
});

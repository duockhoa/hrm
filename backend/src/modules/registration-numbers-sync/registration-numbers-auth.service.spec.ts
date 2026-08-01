import axios from 'axios';
import { RegistrationNumbersAuthService } from './registration-numbers-auth.service';

jest.mock('axios');

const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe('RegistrationNumbersAuthService', () => {
  let service: RegistrationNumbersAuthService;
  const originalEnv = process.env;

  beforeEach(() => {
    mockedAxiosPost.mockReset();
    process.env = { ...originalEnv };
    service = new RegistrationNumbersAuthService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('logs in with configured username and password', async () => {
    process.env.SCB_AUTH_LOGIN_URL = 'https://auth.example.test/auth/login';
    process.env.SCB_AUTH_USERNAME = '0029';
    process.env.SCB_AUTH_PASSWORD = 'password';
    mockedAxiosPost.mockResolvedValue({
      data: {
        accessToken: buildJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
      },
    });

    const token = await service.getAccessToken();

    expect(token).toBeTruthy();
    expect(mockedAxiosPost).toHaveBeenCalledWith(
      'https://auth.example.test/auth/login',
      {
        username: '0029',
        password: 'password',
      },
    );
  });

  it('reuses cached access token when it is not expiring soon', async () => {
    process.env.SCB_AUTH_LOGIN_URL = 'https://auth.example.test/auth/login';
    process.env.SCB_AUTH_USERNAME = '0029';
    process.env.SCB_AUTH_PASSWORD = 'password';
    const accessToken = buildJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    mockedAxiosPost.mockResolvedValue({
      data: {
        accessToken,
      },
    });

    await expect(service.getAccessToken()).resolves.toBe(accessToken);
    await expect(service.getAccessToken()).resolves.toBe(accessToken);

    expect(mockedAxiosPost).toHaveBeenCalledTimes(1);
  });

  it('returns null when auth env is missing', async () => {
    delete process.env.SCB_AUTH_LOGIN_URL;
    process.env.SCB_AUTH_USERNAME = '0029';
    process.env.SCB_AUTH_PASSWORD = 'password';

    await expect(service.getAccessToken()).resolves.toBeNull();

    expect(mockedAxiosPost).not.toHaveBeenCalled();
  });

  it('clears cached access token', async () => {
    process.env.SCB_AUTH_LOGIN_URL = 'https://auth.example.test/auth/login';
    process.env.SCB_AUTH_USERNAME = '0029';
    process.env.SCB_AUTH_PASSWORD = 'password';
    mockedAxiosPost
      .mockResolvedValueOnce({
        data: {
          accessToken: buildJwt({
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        },
      })
      .mockResolvedValueOnce({
        data: {
          accessToken: buildJwt({
            exp: Math.floor(Date.now() / 1000) + 3600,
            sub: 'second-login',
          }),
        },
      });

    await service.getAccessToken();
    service.clearAccessToken();
    await service.getAccessToken();

    expect(mockedAxiosPost).toHaveBeenCalledTimes(2);
  });
});

function buildJwt(payload: Record<string, unknown>) {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  return `${encodedHeader}.${encodedPayload}.`;
}

import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { OAuthRegistrationService } from './oauth-registration.service';

describe('OAuth registration abuse limits', () => {
  it('counts rejected requests, ignores forwarded IP spoofing and resets after an hour', async () => {
    const service = new OAuthRegistrationService({} as PrismaService);
    const req = {
      socket: { remoteAddress: '127.0.0.1' },
      headers: { 'x-forwarded-for': 'untrusted' },
      is: () => false,
    } as unknown as Request;
    const set = jest.fn();
    const res = { set } as unknown as Response;
    const clock = jest.spyOn(Date, 'now');
    const now = Date.now();
    clock.mockReturnValue(now);
    try {
      for (let attempt = 0; attempt < 30; attempt++) {
        req.headers['x-forwarded-for'] = `203.0.113.${attempt}`;
        await expect(service.register(req, res)).rejects.toMatchObject({
          name: 'invalid_client_metadata',
          code: 400,
        });
      }
      await expect(service.register(req, res)).rejects.toMatchObject({
        code: 429,
      });
      expect(set).toHaveBeenCalledWith('Retry-After', '3600');
      clock.mockReturnValue(now + 3600001);
      await expect(service.register(req, res)).rejects.toMatchObject({
        code: 400,
      });
    } finally {
      clock.mockRestore();
    }
  });
});

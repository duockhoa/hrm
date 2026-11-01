import { ForbiddenException } from '@nestjs/common';
import { NetworkPoliciesService } from './network-policies.service';
import { PrismaService } from 'src/prisma.service';
import { createProxyTrust, getClientIp } from './client-ip';
import type { IncomingMessage } from 'node:http';

describe('Network access decisions', () => {
  const findMany = jest.fn();
  const service = new NetworkPoliciesService({
    networkPolicyRanges: { findMany },
  } as unknown as PrismaService);
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([
      { cidr: '192.0.2.0/24' },
      { cidr: '2001:db8:1234::/48' },
    ]);
  });

  it('allows OPEN without consulting the allowlist', async () => {
    await service.assertAllowed('OPEN', undefined);
    expect(findMany).not.toHaveBeenCalled();
  });
  it.each([
    '192.0.2.18',
    '::ffff:192.0.2.18',
    '::ffff:c000:212',
    '2001:db8:1234::abcd',
  ])('allows matching client %s', async (ip) => {
    await expect(
      service.assertAllowed('IP_ALLOWLIST', ip),
    ).resolves.toBeUndefined();
  });
  it.each(['192.0.3.1', '2001:db8:1235::1', '', undefined, 'garbage'])(
    'denies unmatched or missing IP %s',
    async (ip) => {
      await expect(
        service.assertAllowed('IP_ALLOWLIST', ip),
      ).rejects.toMatchObject({
        response: { statusCode: 403, code: 'IP_ACCESS_DENIED' },
      });
    },
  );
  it('denies unknown policies, an empty list, invalid stored ranges and reflects list edits immediately', async () => {
    await expect(
      service.assertAllowed(undefined, '192.0.2.1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    findMany.mockResolvedValue([]);
    await expect(
      service.assertAllowed('IP_ALLOWLIST', '192.0.2.1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    findMany.mockResolvedValue([{ cidr: 'broken' }]);
    await expect(
      service.assertAllowed('IP_ALLOWLIST', '192.0.2.1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    findMany.mockResolvedValue([{ cidr: '192.0.2.1/32' }]);
    await expect(
      service.assertAllowed('IP_ALLOWLIST', '192.0.2.1'),
    ).resolves.toBeUndefined();
    findMany.mockResolvedValue([{ cidr: '192.0.2.2/32' }]);
    await expect(
      service.assertAllowed('IP_ALLOWLIST', '192.0.2.1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Trusted client IP resolution', () => {
  const original = process.env.TRUSTED_PROXY_CIDRS;
  afterEach(() => {
    if (original === undefined) delete process.env.TRUSTED_PROXY_CIDRS;
    else process.env.TRUSTED_PROXY_CIDRS = original;
  });
  const req = (peer: string, forwarded?: string) =>
    ({
      socket: { remoteAddress: peer },
      headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
    }) as IncomingMessage;
  it('ignores spoofed headers from direct clients by default', () => {
    delete process.env.TRUSTED_PROXY_CIDRS;
    expect(getClientIp(req('198.51.100.1', '192.0.2.1'))).toBe('198.51.100.1');
  });
  it('trusts only configured proxies and stops at the nearest untrusted hop', () => {
    process.env.TRUSTED_PROXY_CIDRS = '10.0.0.1/32,2001:db8::1/128';
    expect(getClientIp(req('::ffff:10.0.0.1', '192.0.2.1'))).toBe('192.0.2.1');
    expect(getClientIp(req('10.0.0.1', '192.0.2.1, 198.51.100.1'))).toBe(
      '198.51.100.1',
    );
    expect(getClientIp(req('10.0.0.1', '192.0.2.1, 2001:db8::1'))).toBe(
      '192.0.2.1',
    );
    expect(getClientIp(req('198.51.100.1', '192.0.2.1'))).toBe('198.51.100.1');
    expect(getClientIp(req('10.0.0.1', 'invalid'))).toBeUndefined();
  });
  it('rejects permissive boolean and hop-count configuration', () => {
    expect(() => createProxyTrust('true')).toThrow();
    expect(() => createProxyTrust('1')).toThrow();
  });
});

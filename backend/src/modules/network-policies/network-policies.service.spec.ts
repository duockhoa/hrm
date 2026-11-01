import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from 'src/prisma.service';
import {
  AssignNetworkPolicyDto,
  NetworkRangeDto,
} from './network-policies.dto';
import {
  NetworkPoliciesService,
  normalizeNetwork,
} from './network-policies.service';

describe('Network policy configuration', () => {
  it.each([
    ['14.241.38.18', '14.241.38.18/32'],
    ['192.0.2.123/24', '192.0.2.0/24'],
    ['2001:0db8:0000::1/48', '2001:db8::/48'],
    ['2001:db8::1', '2001:db8::1/128'],
    ['::ffff:192.0.2.1', '::ffff:c000:201/128'],
    ['192.0.2.1/0', '0.0.0.0/0'],
    ['2001:db8::1/0', '::/0'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeNetwork(input)).toBe(expected);
  });

  it.each([
    'not-an-ip',
    '192.168.1.999',
    '192.0.2.1/33',
    '::1/129',
    '::1/-1',
    '::1/',
    '::1/2/3',
    '::1/1e1',
    'fe80::1%eth0',
  ])('rejects invalid network %s', (value) => {
    expect(() => normalizeNetwork(value)).toThrow(BadRequestException);
  });

  it('only accepts the two fixed policy codes', async () => {
    for (const code of ['OPEN', 'IP_ALLOWLIST']) {
      expect(
        await validate(plainToInstance(AssignNetworkPolicyDto, { code })),
      ).toHaveLength(0);
    }
    expect(
      (
        await validate(
          plainToInstance(AssignNetworkPolicyDto, { code: 'OTHER' }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (await validate(plainToInstance(AssignNetworkPolicyDto, {}))).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(NetworkRangeDto, { name: '   ', cidr: '::1' }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('saves only canonical ranges under the default allowlist policy', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const service = new NetworkPoliciesService({
      networkPolicyRanges: { create },
    } as unknown as PrismaService);
    await service.saveRange({ name: ' Nhà máy A ', cidr: '192.0.2.100/24' });
    expect(create).toHaveBeenCalledWith({
      data: { name: 'Nhà máy A', cidr: '192.0.2.0/24' },
    });
  });

  it('reports duplicate and missing ranges as client errors', async () => {
    const create = jest
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: '6',
        }),
      );
    const remove = jest
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: '6',
        }),
      );
    const service = new NetworkPoliciesService({
      networkPolicyRanges: { create, delete: remove },
    } as unknown as PrismaService);
    await expect(
      service.saveRange({ name: 'A', cidr: '::1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(service.deleteRange(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

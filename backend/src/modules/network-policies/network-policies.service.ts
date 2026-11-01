import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isIP } from 'node:net';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { NetworkRangeDto } from './network-policies.dto';

// Canonicalize host bits and IPv6 notation so equivalent networks cannot be duplicated.
export function normalizeNetwork(value: string): string {
  const parts = value.trim().split('/');
  const version = isIP(parts[0]);
  const bits = version === 4 ? 32 : 128;
  const prefix = parts.length === 1 ? bits : Number(parts[1]);
  if (
    !version ||
    parts[0].includes('%') ||
    parts.length > 2 ||
    (parts.length === 2 && !/^\d+$/.test(parts[1])) ||
    prefix < 0 ||
    prefix > bits
  ) {
    throw new BadRequestException('Địa chỉ IPv4, IPv6 hoặc CIDR không hợp lệ');
  }
  let groups: number[];
  if (version === 4) {
    groups = parts[0].split('.').map(Number);
  } else {
    const canonical = new URL(`http://[${parts[0]}]/`).hostname.slice(1, -1);
    const [left, right] = canonical.split('::');
    const head = left ? left.split(':') : [];
    const tail = right ? right.split(':') : [];
    groups = (
      canonical.includes('::')
        ? [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail]
        : head
    ).map((x) => parseInt(x, 16));
  }
  const width = version === 4 ? 8 : 16;
  const address = groups.reduce(
    (acc, group) => (acc << BigInt(width)) | BigInt(group),
    0n,
  );
  const shift = BigInt(bits - prefix);
  let network = (address >> shift) << shift;
  const output: string[] = [];
  const mask = (1n << BigInt(width)) - 1n;
  for (let i = 0; i < bits / width; i++) {
    output.unshift(Number(network & mask).toString(version === 4 ? 10 : 16));
    network >>= BigInt(width);
  }
  const ip =
    version === 4
      ? output.join('.')
      : new URL(`http://[${output.join(':')}]/`).hostname.slice(1, -1);
  return `${ip}/${prefix}`;
}

@Injectable()
export class NetworkPoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.networkPolicies.findMany({ orderBy: { id: 'asc' } });
  }
  ranges() {
    return this.prisma.networkPolicyRanges.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async saveRange(dto: NetworkRangeDto, id?: number) {
    const data = { name: dto.name.trim(), cidr: normalizeNetwork(dto.cidr) };
    try {
      return id === undefined
        ? await this.prisma.networkPolicyRanges.create({ data })
        : await this.prisma.networkPolicyRanges.update({ where: { id }, data });
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteRange(id: number) {
    try {
      return await this.prisma.networkPolicyRanges.delete({ where: { id } });
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException('IP hoặc dải mạng đã tồn tại');
      if (error.code === 'P2025')
        throw new NotFoundException('Không tìm thấy IP');
    }
    throw error;
  }
}

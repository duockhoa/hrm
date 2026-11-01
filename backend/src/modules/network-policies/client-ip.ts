import { BlockList, isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';
import { normalizeNetwork } from './network-policies.service';

export function createProxyTrust(
  value = process.env.TRUSTED_PROXY_CIDRS ?? '',
) {
  const list = new BlockList();
  for (const entry of value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)) {
    const [address, prefix] = normalizeNetwork(entry).split('/');
    list.addSubnet(
      address,
      Number(prefix),
      isIP(address) === 4 ? 'ipv4' : 'ipv6',
    );
  }
  return (address: string) => {
    const version = isIP(address);
    return !!version && list.check(address, version === 4 ? 'ipv4' : 'ipv6');
  };
}

// Walk from the immediate peer towards the client; stop at the first untrusted hop.
// Never accept forwarded headers from a direct, untrusted caller.
export function getClientIp(
  request: Pick<IncomingMessage, 'headers' | 'socket'>,
): string | undefined {
  let address = request.socket?.remoteAddress;
  if (!address || !isIP(address)) return undefined;
  const trust = createProxyTrust();
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string') return address;
  for (const hop of forwarded.split(',').reverse()) {
    if (!trust(address)) break;
    address = hop.trim();
    if (!isIP(address)) return undefined;
  }
  return address;
}

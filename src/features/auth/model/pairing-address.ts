import { ARGUS_PAIRING_PORT } from '@/shared/constants';

export type ManualAddress = { ip: string; port: number };

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::(\d{1,5}))?$/;

const IPV6_PATTERN = /^\[?([0-9a-fA-F:]+)\]?(?::(\d{1,5}))?$/;

function validPort(value: string | undefined): number | null {
  const port = value ? Number(value) : ARGUS_PAIRING_PORT;
  return port > 0 && port < 65536 ? port : null;
}

export function parseAddress(address: string): ManualAddress | null {
  const value = address.trim();
  const ipv4 = value.match(IPV4_PATTERN);
  if (ipv4) {
    const octets = ipv4.slice(1, 5).map(Number);
    const port = validPort(ipv4[5]);
    if (octets.some((octet) => octet > 255) || port === null) return null;
    return { ip: octets.join('.'), port };
  }
  const [, host = '', rawPort] = value.match(IPV6_PATTERN) ?? [];
  if (host.includes(':') && (value.startsWith('[') || !rawPort)) {
    const port = validPort(rawPort);
    return port === null ? null : { ip: host, port };
  }
  return null;
}

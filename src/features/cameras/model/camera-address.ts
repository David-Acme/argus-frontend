const IPV4_PART = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_GROUP = /^[0-9a-fA-F]{1,4}$/;
const STREAM_PATH = /^\/[A-Za-z0-9/._~\-?=&%+,;:]*$/;
const STREAM_PATH_MAX = 200;

export function parseIpv4(text: string): number[] | null {
  const parts = text.split('.');
  if (parts.length !== 4 || !parts.every((part) => IPV4_PART.test(part))) return null;
  return parts.map(Number);
}

export function parseIpv6(text: string): number[] | null {
  const halves = text.split('::');
  if (halves.length > 2 || text.length === 0) return null;
  const groupsOf = (half: string | undefined): string[] => (half ? half.split(':') : []);
  const head = groupsOf(halves[0]);
  const tail = groupsOf(halves[1]);
  const lastGroup = tail.length > 0 ? tail[tail.length - 1] : head[head.length - 1];
  const mapped = lastGroup != null && lastGroup.includes('.') ? parseIpv4(lastGroup) : null;
  if (lastGroup != null && lastGroup.includes('.') && !mapped) return null;
  if (mapped) (tail.length > 0 ? tail : head).pop();
  const groups = [...head, ...tail];
  if (!groups.every((group) => IPV6_GROUP.test(group))) return null;
  const wanted = mapped ? 6 : 8;
  if (halves.length === 1 ? groups.length !== wanted : groups.length >= wanted) return null;
  const filler = Array.from({ length: wanted - groups.length }, () => '0');
  const words = [...head, ...filler, ...tail].map((group) => Number.parseInt(group, 16));
  const bytes = words.flatMap((word) => [word >> 8, word & 0xff]);
  return mapped ? [...bytes, ...mapped] : bytes;
}

function isPrivateV4([first = 0, second = 0]: readonly number[]): boolean {
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

export function isLiteralAddress(text: string): boolean {
  return parseIpv4(text) != null || parseIpv6(text) != null;
}

export function isPrivateAddress(text: string): boolean {
  const v4 = parseIpv4(text);
  if (v4) return isPrivateV4(v4);
  const v6 = parseIpv6(text);
  if (!v6) return false;
  const [first = 0, second = 0] = v6;
  const mapped = v6.slice(0, 10).every((byte) => byte === 0) && v6[10] === 0xff && v6[11] === 0xff;
  if (mapped) return isPrivateV4(v6.slice(12));
  const loopback = v6.slice(0, 15).every((byte) => byte === 0) && v6[15] === 1;
  const uniqueLocal = (first & 0xfe) === 0xfc;
  const linkLocal = first === 0xfe && (second & 0xc0) === 0x80;
  return loopback || uniqueLocal || linkLocal;
}

export function isStreamPath(text: string): boolean {
  return text.length === 0 || (text.length <= STREAM_PATH_MAX && STREAM_PATH.test(text));
}

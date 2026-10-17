import type { HttpMethod } from '@/core/types';
import { addressUnreachable } from '@/core/services/net/net-routes';

export type WriteRefusal = 'unsent' | 'unconfirmed';

export const WRITE_NOT_SENT = 'WRITE_NOT_SENT';
export const WRITE_UNCONFIRMED = 'WRITE_UNCONFIRMED';

const CHANGE_METHODS: ReadonlySet<HttpMethod> = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const LOST_ANSWER = 'TIMEOUT';

export type WriteRefusalInput = {
  method: HttpMethod;
  status: number;
  code: string;
};

export function serverWrite(method: HttpMethod): boolean {
  return CHANGE_METHODS.has(method);
}

export function writeRefusal({ method, status, code }: WriteRefusalInput): WriteRefusal | null {
  if (status !== 0 || !serverWrite(method)) return null;
  if (addressUnreachable(code)) return 'unsent';
  return code === LOST_ANSWER ? 'unconfirmed' : null;
}

export function writeRefusalCode(refusal: WriteRefusal): string {
  return refusal === 'unsent' ? WRITE_NOT_SENT : WRITE_UNCONFIRMED;
}

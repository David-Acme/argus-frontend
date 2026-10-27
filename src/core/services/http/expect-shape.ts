import type { z } from 'zod';
import type { IServiceResponse } from '@/core/interfaces';
import { errorResponse } from './http-envelope';

export type ShapeReader<T> = z.ZodType<T> | ((info: unknown) => T | null);

export function expectShape<T>(
  response: IServiceResponse<unknown>,
  shape: ShapeReader<T>,
  label: string
): IServiceResponse<T> {
  if (!response.ok) return { ...response, info: null };
  const invalid = () =>
    errorResponse(response.status, 'INVALID_RESPONSE', `${label} is not in the expected shape`);
  if (typeof shape === 'function') {
    const info = shape(response.info);
    return info === null ? invalid() : { ...response, info };
  }
  const result = shape.safeParse(response.info);
  return result.success ? { ...response, info: result.data } : invalid();
}

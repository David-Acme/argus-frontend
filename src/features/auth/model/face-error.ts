import type { IApiError } from '@/core/interfaces';
import type { TranslateFn, TranslationKey } from '@/core/types';
import { serviceErrorKey } from '@/shared/libs/service-error';

export type FaceError = IApiError & { status?: number };

const UNREACHABLE_DETAILS = [
  'connectexception',
  'failed to connect',
  'could not connect',
  'cannot connect',
  'econnrefused',
  'connection refused',
  'no route to host',
  'network is unreachable',
  'timed out',
];

export function faceNetworkKey(detail: string): TranslationKey {
  return UNREACHABLE_DETAILS.some((marker) => detail.includes(marker))
    ? 'common.server-unreachable.description'
    : 'screens.face.error-network';
}

export function faceErrorFromUnknown(error: unknown, fallbackCode: string): FaceError {
  if (error && typeof error === 'object') {
    const value = error as { code?: unknown; message?: unknown; status?: unknown };
    return {
      code: typeof value.code === 'string' ? value.code : fallbackCode,
      message: typeof value.message === 'string' ? value.message : String(error),
      ...(typeof value.status === 'number' ? { status: value.status } : {}),
    };
  }
  return { code: fallbackCode, message: String(error) };
}

export function faceErrorMessage(error: FaceError, t: TranslateFn): string {
  const detail = [error.message, ...Object.values(error.fields ?? {}).flat()].join(' ').toLowerCase();
  if (error.code === 'CAPTURE_FAILED' || error.code === 'CAPTURE_NO_URI') {
    return t('screens.face.error-camera-capture');
  }
  if (
    error.code === 'VALIDATION_ERROR' &&
    (detail.includes('exceed') || detail.includes('10mb') || detail.includes('empty'))
  ) {
    return detail.includes('empty') ? t('screens.face.error-empty-image') : t('screens.face.error-image-too-large');
  }
  if (error.code === 'LIVENESS_CHECK_FAILED') return t('screens.face.error-liveness');
  if (error.code === 'LIVENESS_UNAVAILABLE') return t('screens.face.error-liveness-unavailable');
  if (error.code === 'FACE_QUALITY_INSUFFICIENT') return t('screens.face.error-face-quality');
  if (detail.includes('face not detected')) return t('screens.face.error-face-not-detected');
  if (error.code === 'UNAUTHORIZED' || detail.includes('face not recognized')) {
    return t('screens.face.error-face-not-recognized');
  }
  if (error.code === 'PAIRING_REQUIRED') return t('screens.face.error-network');
  if (error.code === 'NETWORK_ERROR') return t(faceNetworkKey(detail));
  const known = serviceErrorKey(error);
  return known === 'common.errors.unknown' ? t('screens.face.error') : t(known);
}

/** Server banner QR validation (JSON, not a plain code). */
export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_FINGERPRINT_LENGTH = 64;
export const PAIRING_HOST_SUFFIX = '.local';

export const PAIRING_QR_REQUIRED_KEYS = [
  'host',
  'port',
  'scheme',
  'code',
  'instanceId',
  'caFingerprint',
  'serverFingerprint',
] as const;

export const PAIRING_CODE_PATTERN = /^[0-9A-Fa-f]{8,12}$/;
export const PAIRING_FINGERPRINT_PATTERN = /^[0-9A-Fa-f]{64}$/;
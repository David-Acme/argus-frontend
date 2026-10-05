import type { TranslationKey } from '@/core/types';
import {
  CAMERA_DRIVER_SPECS,
  CAMERA_RETENTION_DEFAULT_DAYS,
  CAMERA_RETENTION_INCIDENT_MAX_DAYS,
  CAMERA_RETENTION_MAX_DAYS,
} from '@/features/cameras/constants';
import type { CameraFormValues } from '@/features/cameras/components/camera-form-schema';

export const RETENTION_DEFAULT_DAYS = CAMERA_RETENTION_DEFAULT_DAYS;

export type CredentialRetype = {
  addressChanged: boolean;
  password: boolean;
  cloudPassword: boolean;
};

type AddressValues = Pick<
  CameraFormValues,
  'isEdit' | 'ip' | 'port' | 'storedIp' | 'storedPort' | 'driver'
>;

export function retentionCap(incident: boolean): number {
  return incident ? CAMERA_RETENTION_INCIDENT_MAX_DAYS : CAMERA_RETENTION_MAX_DAYS;
}

export function parseRetentionDays(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  return Number(trimmed);
}

export function retentionIssue(text: string, incident: boolean): TranslationKey | null {
  const days = parseRetentionDays(text);
  if (days === null) return null;
  if (!Number.isInteger(days) || days < 0) return 'screens.cameras.retention.invalid';
  if (days <= retentionCap(incident)) return null;
  return incident ? 'screens.cameras.retention.max-incident' : 'screens.cameras.retention.max';
}

export function retentionWithIncident(text: string, incident: boolean): string {
  const days = parseRetentionDays(text);
  if (days === null || Number.isNaN(days) || days <= retentionCap(incident)) return text;
  return String(retentionCap(incident));
}

export function addressChanged(values: AddressValues): boolean {
  if (!values.isEdit || values.storedIp.length === 0) return false;
  return values.ip.trim() !== values.storedIp || Number(values.port) !== Number(values.storedPort);
}

export function credentialsToRetype(values: AddressValues): CredentialRetype {
  const changed = addressChanged(values);
  return {
    addressChanged: changed,
    password: changed,
    cloudPassword: changed && CAMERA_DRIVER_SPECS[values.driver].requiresCloud,
  };
}

import { describe, expect, test } from 'bun:test';
import { cameraFormDefaults, cameraFormSchema, type CameraFormValues } from '@/features/cameras/components/camera-form-schema';
import { cameraAddressLabel } from '@/features/cameras/model/camera-address';
import { cameraBodyOf, withCameraWriteCode } from '@/features/cameras/model/camera-form-steps';
import { probeRefusalOf } from '@/features/cameras/model/camera-probe';
import {
  credentialsToRetype,
  retentionIssue,
  retentionWithIncident,
} from '@/features/cameras/model/camera-retention';

const edited = (overrides: Partial<CameraFormValues> = {}): CameraFormValues => ({
  ...cameraFormDefaults('tapo', true),
  name: 'Gate',
  ip: '192.168.1.40',
  port: '443',
  username: 'admin',
  cloudUsername: 'me@example.com',
  retentionDays: '30',
  storedIp: '192.168.1.40',
  storedPort: '443',
  ...overrides,
});

const issues = (values: CameraFormValues) => {
  const parsed = cameraFormSchema.safeParse(values);
  return parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

describe('camera retention', () => {
  test('days run 0 to 60, or to 120 with a documented incident', () => {
    expect(retentionIssue('', false)).toBeNull();
    expect(retentionIssue('0', false)).toBeNull();
    expect(retentionIssue('60', false)).toBeNull();
    expect(retentionIssue('61', false)).toBe('screens.cameras.retention.max');
    expect(retentionIssue('120', true)).toBeNull();
    expect(retentionIssue('121', true)).toBe('screens.cameras.retention.max-incident');
    expect(retentionIssue('-1', false)).toBe('screens.cameras.retention.invalid');
    expect(retentionIssue('7.5', false)).toBe('screens.cameras.retention.invalid');
  });

  test('clearing the incident brings a longer value back to 60, as the server does', () => {
    expect(retentionWithIncident('90', false)).toBe('60');
    expect(retentionWithIncident('45', false)).toBe('45');
    expect(retentionWithIncident('90', true)).toBe('90');
    expect(retentionWithIncident('', false)).toBe('');
  });

  test('a new camera starts at 30 days and the body carries the flag', () => {
    const defaults = cameraFormDefaults('rtsp', false);
    expect(defaults.retentionDays).toBe('30');
    const body = cameraBodyOf({ ...defaults, name: 'Yard', ip: '192.168.1.9', retentionIncident: true, retentionDays: '100' });
    expect(body.retentionDays).toBe(100);
    expect(body.retentionIncident).toBe(true);
    expect(cameraBodyOf({ ...defaults, retentionDays: '' }).retentionDays).toBeUndefined();
  });

  test('the form refuses more than 60 days without an incident', () => {
    expect(issues(edited({ retentionDays: '90' }))).toContain('retentionDays:screens.cameras.retention.max');
    expect(issues(edited({ retentionDays: '90', retentionIncident: true }))).toEqual([]);
  });
});

describe('a new camera address needs its passwords again', () => {
  test('an unchanged address keeps the stored passwords', () => {
    expect(credentialsToRetype(edited())).toEqual({ addressChanged: false, password: false, cloudPassword: false });
    expect(issues(edited())).toEqual([]);
  });

  test('a new ip asks for the password and the cloud password', () => {
    const values = edited({ ip: '192.168.1.41' });
    expect(credentialsToRetype(values)).toEqual({ addressChanged: true, password: true, cloudPassword: true });
    expect(issues(values)).toEqual([
      'password:screens.cameras.retype-password',
      'cloudPassword:screens.cameras.retype-password',
    ]);
    expect(issues({ ...values, password: 'secret', cloudPassword: 'cloud' })).toEqual([]);
  });

  test('a new port counts as a new address, for any driver', () => {
    expect(credentialsToRetype(edited({ port: '2020' })).addressChanged).toBe(true);
    const rtsp = edited({ driver: 'rtsp', username: '', ip: '192.168.1.41' });
    expect(credentialsToRetype(rtsp)).toEqual({ addressChanged: true, password: true, cloudPassword: false });
    expect(issues(rtsp)).toEqual(['password:screens.cameras.retype-password']);
  });

  test('saying the camera has no password lets an empty password through, and only that one', () => {
    const moved = edited({ ip: '192.168.1.41', noPassword: true });
    expect(issues(moved)).toEqual(['cloudPassword:screens.cameras.retype-password']);
    expect(issues({ ...moved, noCloudPassword: true })).toEqual([]);
    expect(issues({ ...moved, noPassword: false, noCloudPassword: true })).toEqual([
      'password:screens.cameras.retype-password',
    ]);
    const body = cameraBodyOf({ ...moved, noCloudPassword: true });
    expect(body.password).toBeUndefined();
    expect(body.cloudPassword).toBeUndefined();
  });

  test('a new camera never counts as moved', () => {
    const created = { ...cameraFormDefaults('tapo', false), ip: '192.168.1.41', username: 'admin' };
    expect(credentialsToRetype(created).addressChanged).toBe(false);
  });
});

describe('camera refusals', () => {
  test('the probe names a stored-secret refusal and a busy test', () => {
    expect(
      probeRefusalOf({
        status: 422,
        errors: {
          code: 'VALIDATION_ERROR',
          message: "Stored credentials are only tested against the camera's stored address; type them again for a new address",
        },
      }),
    ).toBe('stored-elsewhere');
    expect(
      probeRefusalOf({ status: 429, errors: { code: 'TOO_MANY_REQUESTS', message: 'A connection test is already running' } }),
    ).toBe('busy');
    expect(probeRefusalOf({ status: 422, errors: { code: 'VALIDATION_ERROR', message: 'ip is invalid' } })).toBeNull();
    expect(
      probeRefusalOf(
        { status: 422, errors: { code: 'VALIDATION_ERROR', message: "only tested against the camera's stored address" } },
        true,
      ),
    ).toBe('no-password');
  });

  test('a password the server could not encrypt gets its own words', () => {
    const response = withCameraWriteCode({
      status: 500,
      ok: false,
      info: null,
      errors: { code: 'INTERNAL_ERROR', message: 'The camera password could not be encrypted' },
    });
    expect(response.errors?.code).toBe('CAMERA_SECRET_NOT_SEALED');
    const other = withCameraWriteCode({
      status: 500,
      ok: false,
      info: null,
      errors: { code: 'INTERNAL_ERROR', message: 'The change could not be recorded' },
    });
    expect(other.errors?.code).toBe('INTERNAL_ERROR');
  });
});

describe('camera rows without an address', () => {
  test('a Guard or Guest row shows no address instead of ":0"', () => {
    expect(cameraAddressLabel({ ip: '', port: 0 })).toBeNull();
    expect(cameraAddressLabel({ ip: '192.168.1.40', port: 443 })).toBe('192.168.1.40:443');
    expect(cameraAddressLabel({ ip: 'fd00::5', port: 554 })).toBe('[fd00::5]:554');
    expect(cameraAddressLabel({ ip: '192.168.1.40', port: 0 })).toBe('192.168.1.40');
  });
});

import { describe, expect, test } from 'bun:test';
import { cameraAimSchema, maintenanceListSchema } from '@/core/contracts/camera-sight.contract';
import { serviceErrorKey } from '@/shared/libs/service-error';

const AIM = {
  cameraId: 4,
  ptz: true,
  homePreset: '2',
  atHome: false,
  pan: -12.5,
  tilt: 4,
  lease: { holder: 'argus', userId: 0, mine: false, sinceMs: 1_760_000_000_000, parkUntilMs: 0 },
  activity: 'looking',
  settings: {
    activeLook: true,
    followIntruders: true,
    noAimSectors: [{ name: 'Vecino', panFrom: -40, panTo: -10, tiltFrom: -5, tiltTo: 20 }],
  },
  wear: { movesToday: 12, dailyCap: 400 },
};

const WINDOW = {
  id: 9,
  environmentId: 1,
  cameraIds: [4, 5],
  declaredBy: 7,
  declaredByName: 'Ana',
  startedAt: 1_760_000_000,
  endsAt: 1_760_000_900,
  endedAt: null,
  endReason: null,
  active: true,
  duress: false,
  source: 'app',
  viewChecks: [{ cameraId: 4, cameraName: 'Patio', state: 'pending' }],
};

describe('the camera aim answer', () => {
  test('the documented shape parses', () => {
    expect(cameraAimSchema.safeParse(AIM).success).toBe(true);
  });

  test('a holder or activity this build does not know reads as the calm one', () => {
    const parsed = cameraAimSchema.parse({ ...AIM, activity: 'dancing', lease: { ...AIM.lease, holder: 'robot' } });
    expect(parsed.activity).toBe('idle');
    expect(parsed.lease.holder).toBe('none');
  });

  test('a missing home is null, never a guess', () => {
    expect(cameraAimSchema.parse({ ...AIM, homePreset: null }).homePreset).toBeNull();
    expect(cameraAimSchema.safeParse({ ...AIM, settings: { activeLook: true } }).success).toBe(false);
  });
});

describe('the maintenance list', () => {
  test('active and ended windows parse', () => {
    const parsed = maintenanceListSchema.parse({
      windows: [WINDOW, { ...WINDOW, id: 10, active: false, endedAt: 1_760_000_500, endReason: 'unknown_person' }],
    });
    expect(parsed.windows.map((window) => window.endReason)).toEqual([null, 'unknown_person']);
  });

  test('a Resident payload without duress reads as no duress', () => {
    const withoutDuress: Record<string, unknown> = { ...WINDOW };
    delete withoutDuress.duress;
    expect(maintenanceListSchema.parse({ windows: [withoutDuress] }).windows[0]?.duress).toBe(false);
  });
});

describe('camera sight refusals have their own words', () => {
  test('every refusal code of the contract maps to a localized key', () => {
    expect(serviceErrorKey({ code: 'GUARD_OFF_DUTY', message: '' })).toBe('common.errors.guard-off-duty');
    expect(serviceErrorKey({ code: 'MAINTENANCE_OFF_DUTY', message: '' })).toBe('common.errors.maintenance-off-duty');
    expect(serviceErrorKey({ code: 'MAINTENANCE_OUT_OF_SCOPE', message: '' })).toBe('common.errors.maintenance-out-of-scope');
    expect(serviceErrorKey({ code: 'PRESETS_NOT_YOURS', message: '' })).toBe('common.errors.presets-not-yours');
    expect(serviceErrorKey({ code: 'CAMERA_CONTROL_LOCKED', message: '' })).toBe('common.errors.camera-control-locked');
    expect(serviceErrorKey({ code: 'NOT_A_TAMPER', message: '' })).toBe('common.errors.not-a-tamper');
  });
});

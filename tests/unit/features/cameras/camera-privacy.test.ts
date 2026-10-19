import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ICameraCacheRow, ICameraOverviewRow } from '@/core/interfaces';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { CameraPrivacyState, TranslateFn } from '@/core/types';
import { cameraMasked, privacyOf, privacyUnconfirmed } from '@/features/cameras/model/camera-overview';
import { cameraPrivacyMasked, cameraPrivacyUnconfirmed, privacyStateOf } from '@/shared/libs/camera-privacy';
import { privacyApplyConfirm } from '@/features/cameras/model/camera-device';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const toggleSource = readFileSync(
  join(import.meta.dir, '../../../../src/features/cameras/components/privacy-toggle.tsx'),
  'utf8'
);

describe('the privacy state the settings row shows', () => {
  test('a state that is not known is unknown, never off', () => {
    expect(privacyStateOf(null)).toBe('unknown');
    expect(privacyStateOf(undefined)).toBe('unknown');
    expect(privacyStateOf(false)).toBe('off');
    expect(privacyStateOf(true)).toBe('on');
  });

  test('the unknown state has words of its own', () => {
    expect(es('screens.cameras.privacy-unknown')).toBe('Estado desconocido');
    expect(en('screens.cameras.privacy-unknown')).toBe('Unknown state');
  });

  test('an unknown state has no switch: it offers a re-read, and says so when the camera stays silent', () => {
    expect(es('screens.cameras.privacy-recheck')).toBe('Volver a leer');
    expect(en('screens.cameras.privacy-recheck')).toBe('Read again');
    expect(es('screens.cameras.privacy-unknown-hint')).toBe(
      'La cámara no informa su estado; revisa la app Tapo.'
    );
    expect(en('screens.cameras.privacy-unknown-hint')).toBe(
      'The camera does not report its state; check the Tapo app.'
    );

    const unknownAt = toggleSource.indexOf("t('screens.cameras.privacy-unknown')");
    const switchAt = toggleSource.indexOf('<Switch');
    expect(unknownAt).toBeGreaterThan(-1);
    expect(switchAt).toBeGreaterThan(unknownAt);
    expect(toggleSource.match(/<Switch/g)).toHaveLength(1);
    expect(toggleSource).toContain("t('screens.cameras.privacy-recheck')");
    expect(toggleSource).toContain("t('screens.cameras.privacy-unknown-hint')");
  });
});

describe('the confirmation before masking', () => {
  const copy = {
    title: es('screens.cameras.privacy'),
    description: es('screens.cameras.privacy-confirm'),
  };

  test('turning privacy on asks first, in the ruled words', () => {
    expect(es('screens.cameras.privacy-confirm')).toBe(
      'Argus dejará de ver, escuchar y grabar esta cámara.'
    );
    expect(en('screens.cameras.privacy-confirm')).toBe(
      'Argus will stop seeing, hearing and recording this camera.'
    );
    expect(privacyApplyConfirm(true, copy)).toEqual({
      title: 'Modo privacidad',
      description: 'Argus dejará de ver, escuchar y grabar esta cámara.',
      intent: 'warning',
    });
  });

  test('turning privacy off does not ask', () => {
    expect(privacyApplyConfirm(false, copy)).toBeUndefined();
  });
});

describe('the placeholder the masked surfaces show', () => {
  test('it is one name in both languages', () => {
    expect(es('screens.cameras.privacy-placeholder')).toBe('En modo privacidad');
    expect(en('screens.cameras.privacy-placeholder')).toBe('In privacy mode');
    expect(es('screens.cameras.privacy-placeholder-hint')).toBe('Argus no ve, no escucha ni graba esta cámara.');
    expect(en('screens.cameras.privacy-placeholder-hint')).toBe('Argus does not see, hear or record this camera.');
    expect(es('screens.cameras.privacy-badge')).toBe('Privacidad');
    expect(en('screens.cameras.privacy-badge')).toBe('Privacy');
    expect(es('screens.cameras.clips.privacy')).toBe('Esta cámara está en modo privacidad');
    expect(es('screens.cameras.clips.privacy-hint')).toBe(
      'Argus no graba mientras la lente esté cubierta; los clips vuelven al desactivarla.'
    );
    expect(en('screens.cameras.clips.privacy-hint')).toBe(
      'Argus does not record while the lens is covered; clips return when it is turned off.'
    );
  });
});

const row = (privacyState: CameraPrivacyState): ICameraCacheRow => ({
  id: '2',
  driver: 'tapo',
  icon: 'video',
  name: 'Gate',
  ip: '192.168.1.60',
  port: 554,
  username: '',
  cloudUsername: '',
  manufacturer: 'Tapo',
  model: 'C225',
  modelLabel: 'Tapo C225',
  recordMode: 'events',
  privacyState,
  privacyObeyed: false,
  watchman: false,
  noAudio: false,
  retentionDays: null,
  retentionIncident: false,
  isOnline: true,
  isEnabled: true,
  streamPath: '',
  subStreamPath: '',
  catalogId: '',
  capabilities: [],
  zones: [],
});

const liveRow = (privacyState: CameraPrivacyState): ICameraOverviewRow => ({
  id: 2,
  lastSeenAt: 1,
  sampledAt: 1,
  health: 'ok',
  width: 1280,
  height: 720,
  viewers: 0,
  stream: null,
  mainActive: false,
  privacyState,
  lastEvent: null,
});

describe('the state the surfaces read', () => {
  test('the synced row is the state, and the overview can only add a mask', () => {
    expect(privacyOf({ camera: row('on'), live: null })).toBe('on');
    expect(privacyOf({ camera: row('off'), live: null })).toBe('off');
    expect(privacyOf({ camera: row('unknown'), live: null })).toBe('unknown');
    expect(privacyOf({ camera: row('off'), live: liveRow('on') })).toBe('on');
    expect(privacyOf({ camera: row('on'), live: liveRow('off') })).toBe('on');
    expect(privacyOf({ camera: row('unknown'), live: liveRow('off') })).toBe('off');
    expect(cameraMasked({ camera: row('on'), live: liveRow('unknown') })).toBe(true);
    expect(cameraMasked({ camera: row('unknown'), live: liveRow('unknown') })).toBe(false);
  });
});

describe('a mask Argus obeys without a confirmed state', () => {
  const view = (
    privacyState: CameraPrivacyState,
    privacyObeyed: boolean,
    live: Partial<ICameraOverviewRow> | null = null
  ) => ({
    camera: { privacyState, privacyObeyed } as ICameraCacheRow,
    live: live as ICameraOverviewRow | null,
  });

  test('an unknown state the server obeys is masked and unconfirmed', () => {
    expect(privacyUnconfirmed(view('unknown', true))).toBe(true);
    expect(cameraMasked(view('unknown', true))).toBe(true);
    expect(cameraPrivacyMasked('unknown', true)).toBe(true);
    expect(cameraPrivacyUnconfirmed('unknown', true)).toBe(true);
  });

  test('the overview row alone is enough to mark the doubt', () => {
    expect(privacyUnconfirmed(view('unknown', false, { privacyObeyed: true }))).toBe(true);
  });

  test('a confirmed state is never unconfirmed, and an unknown state nobody obeys is not masked', () => {
    expect(privacyUnconfirmed(view('on', true))).toBe(false);
    expect(cameraMasked(view('on', true))).toBe(true);
    expect(privacyUnconfirmed(view('off', true))).toBe(false);
    expect(cameraMasked(view('off', true))).toBe(false);
    expect(cameraMasked(view('unknown', false))).toBe(false);
    expect(cameraPrivacyMasked('unknown')).toBe(false);
  });

  test('the doubt has words of its own in both languages', () => {
    expect(es('screens.cameras.privacy-badge-unconfirmed')).toBe('Privacidad (sin confirmar)');
    expect(en('screens.cameras.privacy-badge-unconfirmed')).toBe('Privacy (unconfirmed)');
    expect(es('screens.cameras.privacy-placeholder-unconfirmed')).toBe('Privacidad sin confirmar');
    expect(en('screens.cameras.privacy-placeholder-unconfirmed')).toBe('Privacy unconfirmed');
  });
});

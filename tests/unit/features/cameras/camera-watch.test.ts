import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/locales/all';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import { TABLE_MAPS } from '@/core/services/sync/entity-mappers';
import {
  CAMERA_SOURCE_COLUMNS,
  CAMERA_SOURCE_FIELDS,
  projectCameras,
} from '@/core/services/view-cache/camera.projection';
import type { CameraSource } from '@/core/services/view-cache/camera.projection';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import {
  CAMERA_LISTENING_LABEL,
  cameraListening,
  watchPatchOf,
} from '@/features/cameras/model/camera-watch';
import type { CameraListeningInput } from '@/features/cameras/model/camera-watch';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const listening: CameraListeningInput = {
  watchman: true,
  noAudio: false,
  masked: false,
  enabled: true,
  talk: true,
  household: 'ready',
};

const source = (overrides: Partial<CameraSource> = {}): CameraSource => ({
  id: '4',
  driver: 'tapo',
  icon: 'video',
  name: 'Sala',
  ip: '10.0.0.6',
  port: 554,
  username: 'admin',
  cloudUsername: '',
  manufacturer: 'TP-Link',
  model: 'C225',
  recordMode: 'events',
  privacyState: 'off',
  privacyObeyed: false,
  watchman: false,
  noAudio: false,
  retentionDays: null,
  isOnline: true,
  isEnabled: true,
  capabilities: [],
  config: {},
  ...overrides,
});

describe('a camera that listens for its name', () => {
  test('it listens only when every switch on the way allows it', () => {
    expect(cameraListening(listening)).toBe('listening');
    expect(cameraListening({ ...listening, household: null })).toBe('listening');
    expect(cameraListening({ ...listening, watchman: false })).toBe('off');
    expect(cameraListening({ ...listening, noAudio: true })).toBe('no-audio');
    expect(cameraListening({ ...listening, watchman: false, noAudio: true })).toBe('no-audio');
    expect(cameraListening({ ...listening, enabled: false })).toBe('disabled');
    expect(cameraListening({ ...listening, masked: true })).toBe('masked');
    expect(cameraListening({ ...listening, talk: false })).toBe('no-speaker');
    expect(cameraListening({ ...listening, talk: null })).toBe('listening');
    expect(cameraListening({ ...listening, household: 'off' })).toBe('household-off');
    expect(cameraListening({ ...listening, household: 'audio-off' })).toBe('household-audio');
    expect(cameraListening({ ...listening, household: 'audio-held' })).toBe('household-audio');
  });

  test('every state has its words in both languages', () => {
    for (const key of Object.values(CAMERA_LISTENING_LABEL)) {
      expect(es(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
    }
    expect(es(CAMERA_LISTENING_LABEL.masked)).toContain('lente');
  });

  test('a switch sends only its own field, under the names camera reads', () => {
    expect(watchPatchOf('watchman', true)).toEqual({ watchman: true });
    expect(watchPatchOf('noAudio', false)).toEqual({ noAudio: false });
  });

  test('the synced row carries both flags into the camera list', () => {
    expect(Object.keys(TABLE_MAPS.camera)).toEqual(expect.arrayContaining(['watchman', 'noAudio']));
    expect(CAMERA_SOURCE_FIELDS).toEqual(expect.arrayContaining(['watchman', 'noAudio']));
    expect(CAMERA_SOURCE_COLUMNS).toEqual(expect.arrayContaining(['watchman', 'no_audio']));
    const writes = projectCameras({ cameras: [source({ watchman: true })], zones: [] });
    const write = writes.find((item) => item.key === VIEW_CACHE_KEYS.cameraList);
    const rows = write && 'rows' in write ? write.rows : [];
    expect(rows[0]).toMatchObject({ watchman: true, noAudio: false });
  });
});

import { describe, expect, test } from 'bun:test';
import type { ICameraCacheRow, ICameraCatalogModel, ICameraOverview, ICameraProbeResult } from '@/core/interfaces';
import { applyGain, decodeFlacFrame, levelOf, talkFrame } from '@/features/cameras/model/camera-audio';
import {
  catalogPrefill,
  filterCatalog,
  findCatalogModel,
  formFactorOf,
  megapixelsOf,
} from '@/features/cameras/model/camera-catalog';
import { cameraBodyOf, connectionFields, formSteps, nextStep, previousStep, probeInputOf } from '@/features/cameras/model/camera-form-steps';
import { cameraViews, countViews, gridColumns, relativeTime, selectViews, streamSummary } from '@/features/cameras/model/camera-overview';
import { nextPresetName, parsePresets, sensitivityLevel } from '@/features/cameras/model/camera-presets';
import { probeStepCopy, probeVerdict } from '@/features/cameras/model/camera-probe';
import { cameraFormDefaults } from '@/features/cameras/components/camera-form-schema';

const features = {
  ptz: false,
  presets: false,
  autoTrack: false,
  microphone: false,
  speaker: false,
  siren: false,
  privacy: false,
  led: false,
  dayNight: false,
  motion: false,
  sdCard: false,
};

const c225: ICameraCatalogModel = {
  id: 'tapo-c225',
  brand: 'TP-Link Tapo',
  manufacturer: 'TP-Link',
  model: 'C225',
  driver: 'tapo',
  formFactor: 'pan-tilt',
  outdoor: false,
  generic: false,
  resolution: '2688x1520',
  subResolution: '1280x720',
  defaults: { port: 554, onvifPort: 2020, username: '', streamPath: '/stream1', subStreamPath: '/stream2' },
  features: { ...features, ptz: true, presets: true, speaker: true, microphone: true, siren: true },
  note: 'tapo-camera-account',
};

const c310: ICameraCatalogModel = {
  ...c225,
  id: 'tapo-c310',
  model: 'C310',
  formFactor: 'bullet',
  outdoor: true,
  resolution: '2304x1296',
  features: { ...features, speaker: true, microphone: true, siren: true },
};

const hikvision: ICameraCatalogModel = {
  ...c225,
  id: 'hikvision',
  brand: 'Hikvision',
  manufacturer: 'Hikvision',
  model: '',
  driver: 'onvif',
  formFactor: 'bullet',
  generic: true,
  resolution: '',
  defaults: { port: 554, onvifPort: 80, username: 'admin', streamPath: '/Streaming/Channels/101', subStreamPath: '/Streaming/Channels/102' },
  features,
  note: '',
};

const catalog = [hikvision, c310, c225];

function camera(id: string, partial: Partial<ICameraCacheRow> = {}): ICameraCacheRow {
  return {
    id,
    driver: 'tapo',
    icon: 'video',
    name: `Camera ${id}`,
    ip: `192.168.1.${id}`,
    port: 554,
    username: 'u',
    cloudUsername: 'me@example.com',
    manufacturer: 'TP-Link',
    model: 'C225',
    modelLabel: 'TP-Link C225',
    recordMode: 'events',
    retentionDays: null,
    isOnline: true,
    isEnabled: true,
    resolution: '',
    streamPath: '',
    subStreamPath: '',
    catalogId: '',
    capabilities: [],
    zones: [],
    ...partial,
  };
}

function flacFrame(samples: readonly number[]): Uint8Array {
  const header = [0xff, 0xf9, 0x74, 0x08, 0x00, (samples.length - 1) >> 8, (samples.length - 1) & 0xff, 0x00, 0x02];
  const out = new Uint8Array(header.length + samples.length * 2 + 2);
  out.set(header, 0);
  const view = new DataView(out.buffer);
  samples.forEach((sample, index) => view.setInt16(header.length + index * 2, sample));
  return out;
}

describe('camera catalog', () => {
  test('search matches brand and model tokens, filters combine, generic profiles come last', () => {
    expect(filterCatalog(catalog, { query: 'tapo c2', brand: null, formFactor: null, feature: null }).map((m) => m.id)).toEqual(['tapo-c225']);
    expect(filterCatalog(catalog, { query: 'axis', brand: null, formFactor: null, feature: null })).toEqual([]);
    expect(filterCatalog(catalog, { query: 'c225', brand: null, formFactor: null, feature: null }).map((m) => m.id)).toEqual(['tapo-c225']);
    expect(filterCatalog(catalog, { query: '', brand: null, formFactor: null, feature: null }).at(-1)?.id).toBe('hikvision');
    expect(filterCatalog(catalog, { query: '', brand: 'TP-Link Tapo', formFactor: 'bullet', feature: null }).map((m) => m.id)).toEqual(['tapo-c310']);
    expect(filterCatalog(catalog, { query: '', brand: null, formFactor: null, feature: 'ptz' }).map((m) => m.id)).toEqual(['tapo-c225']);
  });

  test('picking a model pre-fills the driver, port, user and paths', () => {
    expect(catalogPrefill(c225)).toEqual({
      catalogId: 'tapo-c225',
      driver: 'tapo',
      port: '554',
      username: '',
      manufacturer: 'TP-Link',
      model: 'C225',
      streamPath: '',
      subStreamPath: '',
    });
    expect(catalogPrefill(hikvision).streamPath).toBe('/Streaming/Channels/101');
    expect(catalogPrefill(hikvision).username).toBe('admin');
  });

  test('a camera finds its model by id first and by its model word otherwise', () => {
    expect(findCatalogModel(catalog, { catalogId: 'tapo-c310', driver: 'tapo', model: 'C225' })?.id).toBe('tapo-c310');
    expect(findCatalogModel(catalog, { catalogId: '', driver: 'tapo', model: 'Tapo C225 v2' })?.id).toBe('tapo-c225');
    expect(findCatalogModel(catalog, { catalogId: '', driver: 'tapo', model: 'C2250' })).toBeNull();
    expect(formFactorOf(catalog, { catalogId: '', driver: 'rtsp', model: '' })).toBe('bullet');
    expect(megapixelsOf('2688x1520')).toBe('4 MP');
    expect(megapixelsOf('1920x1080')).toBe('1080p');
  });
});

describe('camera creation steps', () => {
  test('create walks model, connection, test, details; edit skips the model', () => {
    const steps = formSteps(false);
    expect(steps).toEqual(['model', 'connection', 'test', 'details']);
    expect(nextStep(steps, 'connection')).toBe('test');
    expect(previousStep(steps, 'model')).toBeNull();
    expect(formSteps(true)[0]).toBe('connection');
  });

  test('the connection step validates only what the driver needs', () => {
    expect(connectionFields({ driver: 'tapo' })).toContain('cloudPassword');
    expect(connectionFields({ driver: 'tapo' })).not.toContain('streamPath');
    expect(connectionFields({ driver: 'rtsp' })).toContain('subStreamPath');
  });

  test('the probe gets the typed values and the body carries the catalog id without a blank password', () => {
    const values = { ...cameraFormDefaults('tapo', true), ip: ' 192.168.1.9 ', catalogId: 'tapo-c225', name: 'Patio' };
    expect(probeInputOf(values, '12')).toMatchObject({ driver: 'tapo', ip: '192.168.1.9', port: 554, cameraId: 12, streamPath: '' });
    expect(probeInputOf(values, 'pending-1').cameraId).toBeUndefined();
    const body = cameraBodyOf(values);
    expect(body.catalogId).toBe('tapo-c225');
    expect('password' in body).toBe(false);
  });
});

describe('connection test results', () => {
  const result: ICameraProbeResult = {
    ok: true,
    steps: [
      { id: 'network', status: 'ok', code: 'ok', detail: '' },
      { id: 'main', status: 'ok', code: 'ok', detail: '' },
      { id: 'talk', status: 'warning', code: 'cloud_password_missing', detail: '' },
    ],
    stream: { videoCodec: 'H264', audioCodec: 'PCMA', width: 2688, height: 1520 },
    device: { model: 'C225' },
    catalogId: 'tapo-c225',
  };

  test('a working camera with a warning says so, a failed one says why', () => {
    expect(probeVerdict(result)).toBe('warning');
    expect(probeStepCopy(result.steps[2]!).hint).toBe('screens.cameras.probe.hint-cloud');
    expect(probeVerdict({ ...result, ok: false })).toBe('failed');
    expect(probeStepCopy({ id: 'network', status: 'failed', code: 'unreachable', detail: '' }).hint).toBe(
      'screens.cameras.probe.hint-unreachable',
    );
    expect(probeStepCopy({ id: 'device', status: 'failed', code: 'auth_failed', detail: '' }).hint).toBe(
      'screens.cameras.probe.hint-device-auth',
    );
  });
});

describe('cameras overview', () => {
  const overview: ICameraOverview = {
    cameras: [
      {
        id: 1,
        lastSeenAt: 1_000_000,
        sampledAt: 1_000_000,
        health: 'ok',
        width: 1280,
        height: 720,
        viewers: 2,
        stream: { codec: 'H264', profile: 'Main', audio: 'PCMA', width: 1280, height: 720, fps: 15, kbps: 1430 },
        mainActive: false,
        lastEvent: null,
      },
    ],
    events: [
      { id: 'a', cameraId: 1, at: 900_000, rule: 'person_day', severity: 'info', label: 'person', zoneName: 'Door' },
      { id: 'b', cameraId: 2, at: 950_000, rule: 'person_day', severity: 'info', label: 'car', zoneName: '' },
    ],
  };
  const cameras = [camera('1', { name: 'Patio' }), camera('2', { name: 'Garage', isOnline: false }), camera('3', { name: 'attic', isEnabled: false })];

  test('rows join live data and last events, counts and filters follow status', () => {
    const views = cameraViews(cameras, overview);
    expect(views[0]?.live?.viewers).toBe(2);
    expect(views[0]?.lastEvent?.id).toBe('a');
    expect(views[1]?.lastEvent?.id).toBe('b');
    expect(countViews(views)).toEqual({ all: 3, online: 1, offline: 1, disabled: 1 });
    expect(selectViews(views, { query: '', status: 'offline', sort: 'name' }).map((v) => v.camera.id)).toEqual(['2']);
    expect(selectViews(views, { query: '', status: 'all', sort: 'name' }).map((v) => v.camera.name)).toEqual(['attic', 'Garage', 'Patio']);
    expect(selectViews(views, { query: '', status: 'all', sort: 'status' }).map((v) => v.camera.id)).toEqual(['2', '1', '3']);
    expect(selectViews(views, { query: '', status: 'all', sort: 'activity' }).map((v) => v.camera.id)).toEqual(['2', '1', '3']);
    expect(selectViews(views, { query: '192.168.1.1', status: 'all', sort: 'name' }).map((v) => v.camera.id)).toEqual(['1']);
    expect(streamSummary(views[0]!.live)).toBe('1280×720 · 15 fps · 1.4 Mbps');
  });

  test('relative time and grid columns', () => {
    expect(relativeTime(0, 10)).toBeNull();
    expect(relativeTime(1000, 30_000)).toEqual({ unit: 'now', count: 0 });
    expect(relativeTime(0 + 1, 5 * 60_000 + 1)).toEqual({ unit: 'minutes', count: 5 });
    expect(relativeTime(1, 3 * 3_600_000 + 1)).toEqual({ unit: 'hours', count: 3 });
    expect(gridColumns(1500, 2)).toBe(2);
    expect(gridColumns(1190, 4)).toBe(4);
    expect(gridColumns(1190, 5)).toBe(3);
    expect(gridColumns(1500, 10)).toBe(5);
    expect(gridColumns(900, 4)).toBe(2);
    expect(gridColumns(400, 9)).toBe(1);
  });
});

describe('camera audio', () => {
  test('go2rtc verbatim FLAC frames decode to the PCM they carry', () => {
    const pcm = decodeFlacFrame(flacFrame([0, 1000, -1000, 32767, -32768]));
    expect(Array.from(pcm ?? [])).toEqual([0, 1000, -1000, 32767, -32768]);
    expect(decodeFlacFrame(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8]))).toBeNull();
    const fixed = flacFrame([1, 2]);
    fixed[8] = 0x00;
    expect(decodeFlacFrame(fixed)).toBeNull();
  });

  test('gain clamps, level reads silence as zero, talk frames carry the header', () => {
    expect(Array.from(applyGain(new Int16Array([20000, -20000]), 2))).toEqual([32767, -32768]);
    expect(levelOf(new Int16Array(320))).toBe(0);
    expect(levelOf(new Int16Array(320).fill(16000))).toBeGreaterThan(0.8);
    const pcm = new Int16Array([5, -5]).buffer;
    expect(Array.from(new Uint8Array(talkFrame(pcm, false)))).toEqual([0xa8, 1, 0, 0, 5, 0, 0xfb, 0xff]);
    expect(Array.from(new Uint8Array(talkFrame(pcm, true)))).toEqual([0xa8, 1, 0, 0, 0, 0, 0, 0]);
  });
});

describe('camera presets', () => {
  test('presets are read from the Tapo answer wherever they sit', () => {
    const answer = { result: { responses: [{ result: { preset: { preset: { id: ['1', '2'], name: ['Door', 'Gate'], read_only: ['0', '0'] } } } }] } };
    expect(parsePresets(answer)).toEqual([
      { id: '1', name: 'Door' },
      { id: '2', name: 'Gate' },
    ]);
    expect(parsePresets({ nothing: true })).toEqual([]);
    expect(nextPresetName([{ id: '1', name: 'Position 2' }], 'Position')).toBe('Position 3');
    expect(sensitivityLevel(80)).toBe('high');
    expect(sensitivityLevel(undefined)).toBe('normal');
  });
});

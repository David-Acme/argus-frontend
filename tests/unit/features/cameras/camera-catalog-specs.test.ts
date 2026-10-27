import { describe, expect, test } from 'bun:test';
import type { ICameraCatalogModel, ICameraCatalogSpecs } from '@/core/interfaces';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import { connectable, supportOf } from '@/features/cameras/model/camera-catalog';
import {
  argusAbilities,
  catalogSpecLines,
  sourceHost,
} from '@/features/cameras/model/camera-catalog-specs';
import { cameraLookOf, knownLook } from '@/features/cameras/model/camera-looks';

const t: TranslateFn = (key, ...rest) => translate(localeDictionaries.es, key, ...rest);

const features = {
  ptz: false,
  presets: false,
  autoTrack: false,
  microphone: true,
  speaker: true,
  siren: true,
  privacy: true,
  led: true,
  dayNight: true,
  motion: true,
  sdCard: true,
};

const specs: ICameraCatalogSpecs = {
  fovDeg: 113,
  nightVisionM: 30,
  colorNight: true,
  spotlight: true,
  siren: true,
  microphone: true,
  twoWayAudio: true,
  panDeg: 0,
  tiltDeg: 0,
  opticalZoom: 0,
  ipRating: 'IP66',
  power: 'adapter',
  storageGb: 512,
  rtsp: true,
  onvif: true,
  onvifProfile: 'S',
};

const c320ws: ICameraCatalogModel = {
  id: 'tapo-c320ws',
  brand: 'TP-Link Tapo',
  manufacturer: 'TP-Link',
  model: 'C320WS',
  driver: 'tapo',
  formFactor: 'bullet',
  outdoor: true,
  generic: false,
  resolution: '2560x1440',
  subResolution: '1280x720',
  defaults: {
    port: 554,
    onvifPort: 2020,
    username: '',
    streamPath: '/stream1',
    subStreamPath: '/stream2',
  },
  features,
  note: 'tapo-camera-account',
  support: 'full',
  tested: false,
  look: 'bullet-antennas-spot',
  specs,
  source: 'https://www.tp-link.com/us/home-networking/cloud-camera/tapo-c320ws/',
};

const dahuaTurret: ICameraCatalogModel = {
  ...c320ws,
  id: 'dahua-turret',
  brand: 'Dahua',
  manufacturer: 'Dahua',
  driver: 'onvif',
  formFactor: 'turret',
  features: { ...features, microphone: false, speaker: false, siren: false },
  support: 'control',
  specs: { ...specs, spotlight: false, siren: false, twoWayAudio: false, power: 'adapter-poe' },
};

describe('the catalog says what each camera is and what Argus does with it', () => {
  test('a model lists its researched specs in words', () => {
    const lines = catalogSpecLines(c320ws, t);
    const value = (label: string) => lines.find((line) => line.label === label)?.value;
    expect(value('Resolución')).toBe('4 MP · 2560×1440');
    expect(value('Visión nocturna')).toBe('Hasta 30 m · a color');
    expect(value('Ubicación')).toBe('Exterior · IP66');
    expect(value('Conexión local')).toBe('RTSP · ONVIF perfil S');
    expect(value('Grabación local')).toBe('microSD hasta 512 GB');
    expect(value('Movimiento')).toBeUndefined();
    expect(catalogSpecLines({ ...c320ws, generic: true }, t)).toEqual([]);
  });

  test('a Tapo camera is driven in full, an ONVIF camera without talk or siren', () => {
    expect(argusAbilities(c320ws).every((line) => line.available)).toBe(true);
    const onvif = argusAbilities(dahuaTurret);
    expect(onvif.find((line) => line.ability === 'events')?.available).toBe(true);
    expect(onvif.some((line) => line.ability === 'talk')).toBe(false);
    expect(onvif.some((line) => line.ability === 'siren')).toBe(false);
  });

  test('a battery camera without a local stream cannot be connected', () => {
    const battery: ICameraCatalogModel = {
      ...c320ws,
      support: 'none',
      specs: { ...specs, power: 'battery', rtsp: false, onvif: false, onvifProfile: '' },
    };
    expect(connectable(battery)).toBe(false);
    const lines = catalogSpecLines(battery, t);
    expect(lines.find((line) => line.label === 'Conexión local')?.value).toBe('Ninguna');
    expect(lines.find((line) => line.label === 'Alimentación')?.value).toBe('Batería');
  });

  test('an older catalog without a support level reads it from the driver', () => {
    const { support: _support, ...legacy } = dahuaTurret;
    expect(supportOf({ ...legacy, driver: 'rtsp' })).toBe('video');
    expect(supportOf({ ...legacy, driver: 'tapo' })).toBe('full');
  });

  test('each look draws its own silhouette, an unknown one falls back to the form factor', () => {
    expect(cameraLookOf('bullet-antennas-spot', 'bullet')).toMatchObject({
      shape: 'bullet',
      antennas: 2,
      spotlight: true,
    });
    expect(cameraLookOf('pill', 'cube').shape).toBe('cube');
    expect(cameraLookOf('nothing', 'doorbell').shape).toBe('doorbell');
    expect(knownLook('nothing')).toBe(false);
    expect(sourceHost('https://www.tp-link.com/us/x/')).toBe('tp-link.com');
    expect(sourceHost('')).toBe('');
  });
});

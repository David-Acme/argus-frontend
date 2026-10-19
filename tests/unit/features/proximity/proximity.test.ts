import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PROXIMITY_ROUTES,
  readProximityMe,
  readProximityReceivers,
  readProximitySensors,
} from '@/core/contracts/proximity.contract';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { ProximityMe, ProximitySensorInput, TranslateFn } from '@/core/types';
import {
  BEACON_PLATFORM_HINT,
  BEACON_REASON_LABEL,
  beaconPlan,
  parseOffset,
  parsePort,
  receiverErrors,
  SENSOR_MODEL_LABEL,
  SENSOR_SOURCE_LABEL,
  sensorAims,
  sensorErrors,
  type BeaconPlanInput,
} from '@/features/proximity/model/proximity';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const me: ProximityMe = {
  ble: { enabled: true, seed: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=', rotateSeconds: 900, receivers: 2 },
  located: true,
};

const plan: BeaconPlanInput = {
  platform: 'android',
  me,
  presence: 'home',
  appActive: false,
  supported: true,
  permitted: true,
};

const sensor: ProximitySensorInput = {
  name: 'Radar sala',
  room: 'Sala',
  model: 'ld2450',
  source: 'esphome',
  host: 'esp32-sala.local',
  port: 6053,
  entityId: '',
  cameraId: 4,
  panOffsetDeg: -30,
};

describe('the phone as a presence signal', () => {
  test('an Android phone advertises only while its owner is home, opted in and located', () => {
    expect(beaconPlan(plan)).toEqual({ advertise: true, reason: 'advertising' });
    expect(beaconPlan({ ...plan, presence: 'away' }).reason).toBe('away');
    expect(beaconPlan({ ...plan, presence: 'unknown' }).reason).toBe('away');
    expect(beaconPlan({ ...plan, presence: null }).reason).toBe('away');
    expect(beaconPlan({ ...plan, me: { ...me, ble: { ...me.ble, enabled: false } } }).reason).toBe('off');
    expect(beaconPlan({ ...plan, me: { ...me, located: false } }).reason).toBe('not-located');
    expect(beaconPlan({ ...plan, me: { ...me, ble: { ...me.ble, seed: null } } }).reason).toBe('no-seed');
    expect(beaconPlan({ ...plan, permitted: false }).reason).toBe('no-permission');
    expect(beaconPlan({ ...plan, supported: false }).reason).toBe('unsupported');
    expect(beaconPlan({ ...plan, me: null }).reason).toBe('off');
  });

  test('an iPhone advertises only in the foreground, and a desktop never', () => {
    expect(beaconPlan({ ...plan, platform: 'ios' }).reason).toBe('background');
    expect(beaconPlan({ ...plan, platform: 'ios', appActive: true }).advertise).toBe(true);
    expect(beaconPlan({ ...plan, platform: 'none', appActive: true }).reason).toBe('unsupported');
  });

  test('every reason and platform has its words in both languages', () => {
    for (const key of [...Object.values(BEACON_REASON_LABEL), ...Object.values(BEACON_PLATFORM_HINT)]) {
      expect(es(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
    }
  });

  test('the server answer is read with safe defaults, the seed never invented', () => {
    expect(readProximityMe({ ble: { enabled: false } })).toEqual({
      ble: { enabled: false, seed: null, rotateSeconds: 900, receivers: 0 },
      located: true,
    });
    expect(readProximityMe({})).toBeNull();
  });

  test('the shared token vectors are the ones the native advertisers are tested against', () => {
    const vectors = JSON.parse(
      readFileSync(join(import.meta.dir, '../../../vectors/beacon-token.json'), 'utf8')
    ) as { cases: { seed: string; counter: number; nowSeconds: number; rotateSeconds: number; uuid: string }[] };
    expect(vectors.cases.length).toBeGreaterThan(2);
    for (const entry of vectors.cases) {
      expect(entry.counter).toBe(Math.floor(entry.nowSeconds / entry.rotateSeconds));
      expect(entry.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });
});

describe('receivers and radars the owner registers', () => {
  test('a receiver needs a name, a room, an address and a port', () => {
    expect(receiverErrors({ name: 'Sala', room: 'Sala', kind: 'esphome', host: '192.168.1.40', port: 6053 })).toEqual([]);
    expect(receiverErrors({ name: ' ', room: '', kind: 'esphome', host: 'bad host', port: Number.NaN })).toEqual([
      'name',
      'room',
      'host',
      'port',
    ]);
  });

  test('a radar read through Home Assistant needs its entity, and an aim offset stays within a turn', () => {
    expect(sensorErrors(sensor)).toEqual([]);
    expect(sensorErrors({ ...sensor, source: 'home_assistant', entityId: 'sala' })).toEqual(['entityId']);
    expect(sensorErrors({ ...sensor, source: 'home_assistant', entityId: 'binary_sensor.sala_presence' })).toEqual([]);
    expect(sensorErrors({ ...sensor, panOffsetDeg: 200 })).toEqual(['panOffsetDeg']);
    expect(sensorErrors({ ...sensor, panOffsetDeg: Number.NaN })).toEqual(['panOffsetDeg']);
    expect(sensorAims('ld2410')).toBe(false);
    expect(sensorAims('ld2450')).toBe(true);
    expect(sensorAims('fp2')).toBe(true);
  });

  test('ports and offsets typed by hand are read strictly', () => {
    expect(parsePort(' 6053 ')).toBe(6053);
    expect(Number.isNaN(parsePort('60a'))).toBe(true);
    expect(parseOffset('')).toBeNull();
    expect(parseOffset('-12,5')).toBe(-12.5);
    expect(Number.isNaN(parseOffset('abc') ?? 0)).toBe(true);
  });

  test('the lists keep what they can read and say when the shape is wrong', () => {
    const receivers = readProximityReceivers({
      receivers: [
        { id: 3, name: 'Sala', room: 'Sala', kind: 'esphome', host: 'esp32.local', port: 6053, online: true, lastSeenAt: 10 },
        { id: 4, name: 'Bad', kind: 'zigbee', host: 'x', port: 1 },
      ],
    });
    expect(receivers).toEqual([
      { id: '3', name: 'Sala', room: 'Sala', kind: 'esphome', host: 'esp32.local', port: 6053, online: true, lastSeenAt: 10_000 },
    ]);
    const sensors = readProximitySensors({
      sensors: [{ id: 'r1', name: 'Radar', model: 'fp2', source: 'home_assistant', host: 'ha.local', port: 8123, cameraId: 4 }],
    });
    expect(sensors?.[0]?.cameraId).toBe('4');
    expect(sensors?.[0]?.panOffsetDeg).toBeNull();
    expect(readProximitySensors({})).toBeNull();
    expect(PROXIMITY_ROUTES.sensor('r 1')).toBe('/guard/proximity/sensors/r%201');
  });

  test('every model and source has its label', () => {
    for (const key of [...Object.values(SENSOR_MODEL_LABEL), ...Object.values(SENSOR_SOURCE_LABEL)]) {
      expect(es(key)).not.toBe(key);
      expect(en(key)).not.toBe(key);
    }
  });
});

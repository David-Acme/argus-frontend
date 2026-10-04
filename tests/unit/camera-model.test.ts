import { describe, expect, test } from 'bun:test';
import type { ICameraCacheRow, IZoneCacheRow } from '@/core/interfaces';
import { isLiteralAddress, isPrivateAddress, isStreamPath, parseIpv6 } from '@/features/cameras/model/camera-address';
import { CAMERA_LENSES, ZONE_LENSES, cameraIntentValues, withZones } from '@/features/cameras/model/camera-optimistic';
import { applyIntents, settledIntents, type OptimisticIntent } from '@/shared/libs/optimistic';

const zone: IZoneCacheRow = {
  id: '7',
  cameraId: '2',
  name: 'Porch',
  points: [
    { x: 0.1, y: 0.1 },
    { x: 0.5, y: 0.1 },
    { x: 0.5, y: 0.5 },
  ],
  zoneType: 'alert',
  color: '#FF3B30',
  isEnabled: true,
};

const camera: ICameraCacheRow = {
  id: '2',
  driver: 'rtsp',
  icon: 'video',
  name: 'Gate',
  ip: '192.168.1.60',
  port: 554,
  username: '',
  cloudUsername: '',
  manufacturer: 'Hikvision',
  model: 'DS-2CD',
  modelLabel: 'Hikvision DS-2CD',
  recordMode: 'events',
  retentionDays: null,
  isOnline: true,
  isEnabled: true,
  resolution: '',
  streamPath: '',
  subStreamPath: '',
  catalogId: '',
  zones: [zone],
};

function intent(partial: Omit<OptimisticIntent, 'id' | 'confirmed'> & { confirmed?: boolean }): OptimisticIntent {
  return { id: `intent-${partial.recordId}`, confirmed: partial.confirmed ?? true, ...partial };
}

describe('camera addresses', () => {
  test('only literal private addresses are cameras on the local network', () => {
    expect(isPrivateAddress('192.168.1.60')).toBe(true);
    expect(isPrivateAddress('10.0.0.5')).toBe(true);
    expect(isPrivateAddress('172.20.1.1')).toBe(true);
    expect(isPrivateAddress('172.32.1.1')).toBe(false);
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
    expect(isPrivateAddress('fd12:3456::7')).toBe(true);
    expect(isPrivateAddress('fe80::1')).toBe(true);
    expect(isPrivateAddress('::ffff:192.168.1.5')).toBe(true);
    expect(isPrivateAddress('2001:db8::1')).toBe(false);
    expect(isLiteralAddress('camera.local')).toBe(false);
    expect(isLiteralAddress('10.evil.example')).toBe(false);
    expect(isLiteralAddress('256.1.1.1')).toBe(false);
  });

  test('ipv6 compression expands to sixteen bytes', () => {
    expect(parseIpv6('::1')).toEqual([...Array.from({ length: 15 }, () => 0), 1]);
    expect(parseIpv6('1::2::3')).toBeNull();
    expect(parseIpv6('1:2:3:4:5:6:7:8:9')).toBeNull();
  });

  test('stream paths are plain absolute paths or empty', () => {
    expect(isStreamPath('')).toBe(true);
    expect(isStreamPath('/Streaming/Channels/101')).toBe(true);
    expect(isStreamPath('/cam/realmonitor?channel=1&subtype=0')).toBe(true);
    expect(isStreamPath('stream1')).toBe(false);
    expect(isStreamPath('/live 1')).toBe(false);
    expect(isStreamPath('/a#b')).toBe(false);
  });
});

describe('camera optimistic lenses', () => {
  test('a rename shows at once and settles when the synced row carries it', () => {
    const rename = intent({ table: 'camera', kind: 'update', recordId: '2', values: { name: 'Back gate' } });
    const [patched] = applyIntents([camera], [rename], CAMERA_LENSES);
    expect(patched?.name).toBe('Back gate');
    expect(settledIntents([camera], [rename], CAMERA_LENSES)).toEqual([]);
    expect(settledIntents([{ ...camera, name: 'Back gate' }], [rename], CAMERA_LENSES)).toEqual([rename.id]);
  });

  test('a created camera appears as a pending card', () => {
    const create = intent({
      table: 'camera',
      kind: 'create',
      recordId: 'pending-intent-1',
      values: { name: 'Hall', ip: '10.0.0.9', driver: 'onvif' },
      confirmed: false,
    });
    const rows = applyIntents([camera], [create], CAMERA_LENSES);
    expect(rows.map((row) => row.name)).toEqual(['Gate', 'Hall']);
    expect(rows[1]?.zones).toEqual([]);
  });

  test('a zone edit with equal points settles on the synced row', () => {
    const edit = intent({
      table: 'zone',
      kind: 'update',
      recordId: '7',
      values: { name: 'Front porch', points: zone.points.map((point) => ({ ...point })) },
    });
    const synced = { ...zone, name: 'Front porch', points: zone.points.map((point) => ({ ...point })) };
    expect(applyIntents([zone], [edit], ZONE_LENSES)[0]?.name).toBe('Front porch');
    expect(settledIntents([synced], [edit], ZONE_LENSES)).toEqual([edit.id]);
  });

  test('zones regroup under their camera and a deleted zone leaves it', () => {
    const removal = intent({ table: 'zone', kind: 'delete', recordId: '7', values: {} });
    const zones = applyIntents([zone], [removal], ZONE_LENSES);
    const [regrouped] = withZones([camera], zones);
    expect(regrouped?.zones).toEqual([]);
    expect(withZones([camera], [zone])[0]).toBe(camera);
  });

  test('credentials never enter an intent', () => {
    const values = cameraIntentValues({ name: 'Gate', ip: '10.0.0.2', password: 'secret', cloudPassword: 'cloud' });
    expect(values).toEqual({ name: 'Gate', ip: '10.0.0.2' });
  });
});

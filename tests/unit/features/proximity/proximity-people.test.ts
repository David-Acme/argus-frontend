import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROXIMITY_ROUTES, readProximityPeople } from '@/core/contracts/proximity.contract';
import {
  confidenceLevel,
  confidencePercent,
  minutesAgo,
  parseRoomKey,
  peopleRooms,
  roomPlace,
  type RoomWorld,
} from '@/features/proximity/model/proximity-people';

const read = (path: string) => readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');

const WORLD: RoomWorld = {
  environments: [
    { id: 1, name: 'Casa' },
    { id: 2, name: 'Tienda' },
  ],
  contexts: [
    { cameraId: 10, role: 'living', outdoor: false, environmentId: 1 },
    { cameraId: 11, role: 'living', outdoor: false, environmentId: 1 },
    { cameraId: 12, role: 'living', outdoor: false, environmentId: 2 },
    { cameraId: 13, role: 'entrance', outdoor: true, environmentId: 1 },
  ],
  cameras: [
    { id: '10', name: 'Sala sur' },
    { id: '11', name: 'Sala norte' },
    { id: '12', name: 'Mostrador' },
    { id: '13', name: 'Puerta' },
  ],
};

describe('the room keys', () => {
  test('a role room, a camera room and a typed name', () => {
    expect(parseRoomKey('1:living')).toEqual({ kind: 'role', environmentId: 1, role: 'living' });
    expect(parseRoomKey('1:public_area')).toEqual({ kind: 'role', environmentId: 1, role: 'public_area' });
    expect(parseRoomKey('1:camera:13')).toEqual({ kind: 'camera', environmentId: 1, cameraId: 13 });
    expect(parseRoomKey('Dormitorio')).toEqual({ kind: 'named', name: 'Dormitorio' });
    expect(parseRoomKey('1:attic')).toEqual({ kind: 'named', name: '1:attic' });
  });

  test('a role room names its environment and the indoor cameras of that role there', () => {
    expect(roomPlace('1:living', WORLD)).toEqual({
      role: 'living',
      cameraName: null,
      environmentName: 'Casa',
      cameraNames: ['Sala norte', 'Sala sur'],
      named: null,
    });
  });

  test('a camera room names the camera, an unknown camera stays unnamed', () => {
    expect(roomPlace('1:camera:13', WORLD).cameraName).toBe('Puerta');
    expect(roomPlace('9:camera:99', WORLD)).toEqual({
      role: null,
      cameraName: null,
      environmentName: null,
      cameraNames: [],
      named: null,
    });
  });

  test('a receiver room typed by the owner is shown as written', () => {
    expect(roomPlace(' Dormitorio ', WORLD).named).toBe('Dormitorio');
  });
});

describe('confidence and freshness in plain words', () => {
  test('levels and percents', () => {
    expect(confidenceLevel(0.95)).toBe('sure');
    expect(confidenceLevel(0.8)).toBe('sure');
    expect(confidenceLevel(0.6)).toBe('likely');
    expect(confidenceLevel(0.2)).toBe('unsure');
    expect(confidencePercent(0.666)).toBe(67);
    expect(confidencePercent(1.4)).toBe(100);
  });

  test('minutes since the last evidence', () => {
    expect(minutesAgo(1_000, 50_000)).toBe(0);
    expect(minutesAgo(0, 185_000)).toBe(3);
    expect(minutesAgo(10_000, 0)).toBe(0);
  });

  test('people get their directory names, sorted', () => {
    const rows = peopleRooms({
      people: [
        { userId: '3', room: '1:living', confidence: 0.9, since: 1, updatedAt: 2, evidence: 'face' },
        { userId: '2', room: 'Dormitorio', confidence: 0.4, since: 1, updatedAt: 2, evidence: 'ble' },
        { userId: '8', room: '1:camera:13', confidence: 0.6, since: 1, updatedAt: 2, evidence: 'voice' },
      ],
      names: [
        { id: '3', name: 'Ana', lastName: 'Ríos' },
        { id: '2', name: 'Luis', lastName: '' },
      ],
      world: WORLD,
      unnamed: () => 'Alguien de casa',
    });
    expect(rows.map((row) => [row.name, row.level])).toEqual([
      ['Alguien de casa', 'likely'],
      ['Ana Ríos', 'sure'],
      ['Luis', 'unsure'],
    ]);
  });
});

describe('the people answer', () => {
  test('reads the backend shape in milliseconds and drops an unknown evidence', () => {
    expect(PROXIMITY_ROUTES.people).toBe('/guard/proximity/people');
    expect(
      readProximityPeople({
        people: [
          { userId: 3, room: '1:living', confidence: 0.82, since: 100, updatedAt: 120, evidence: 'radarBox' },
          { userId: 4, room: '1:living', confidence: 0.5, since: 100, updatedAt: 120, evidence: 'telepathy' },
        ],
      })
    ).toEqual([{ userId: '3', room: '1:living', confidence: 0.82, since: 100_000, updatedAt: 120_000, evidence: 'radarBox' }]);
    expect(readProximityPeople({})).toBeNull();
  });
});

describe('the screen stays the owner\'s', () => {
  const HOOK = read('features/proximity/hooks/use-proximity-people.ts');
  const DEVICES = read('features/proximity/screens/proximity-devices-screen.tsx');

  test('it loads only with proximity.manage and surveillance on', () => {
    expect(HOOK).toContain('has(CAPABILITY.proximityManage) && moduleActive(MODULE_IDS.surveillance)');
    expect(HOOK).toContain('enabled: allowed,');
  });

  test('the entry shows only to the owner', () => {
    expect(DEVICES).toContain('{peopleAllowed ? (');
    expect(DEVICES).toContain("router.push('/settings/proximity/people')");
  });
});

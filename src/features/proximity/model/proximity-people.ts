import type {
  GuardCameraContext,
  GuardCameraRole,
  IconName,
  ProximityEvidence,
  ProximityPerson,
  TranslationKey,
} from '@/core/types';

export type RoomKey =
  | { kind: 'role'; environmentId: number; role: GuardCameraRole }
  | { kind: 'camera'; environmentId: number; cameraId: number }
  | { kind: 'named'; name: string };

export type RoomWorld = {
  environments: readonly { id: number; name: string }[];
  contexts: readonly Pick<GuardCameraContext, 'cameraId' | 'role' | 'outdoor' | 'environmentId'>[];
  cameras: readonly { id: string; name: string }[];
};

export type RoomPlace = {
  role: GuardCameraRole | null;
  cameraName: string | null;
  environmentName: string | null;
  cameraNames: string[];
  named: string | null;
};

export type ConfidenceLevel = 'sure' | 'likely' | 'unsure';

export type PersonRoom = {
  userId: string;
  name: string;
  place: RoomPlace;
  level: ConfidenceLevel;
  percent: number;
  evidence: ProximityEvidence;
  since: number;
  updatedAt: number;
};

const CAMERA_ROLES: readonly GuardCameraRole[] = [
  'other',
  'entrance',
  'perimeter',
  'garage',
  'living',
  'kitchen',
  'office',
  'register',
  'storage',
  'public_area',
];

export const ROOM_ROLE_LABEL = {
  other: 'screens.security.cameras.roles.other',
  entrance: 'screens.security.cameras.roles.entrance',
  perimeter: 'screens.security.cameras.roles.perimeter',
  garage: 'screens.security.cameras.roles.garage',
  living: 'screens.security.cameras.roles.living',
  kitchen: 'screens.security.cameras.roles.kitchen',
  office: 'screens.security.cameras.roles.office',
  register: 'screens.security.cameras.roles.register',
  storage: 'screens.security.cameras.roles.storage',
  public_area: 'screens.security.cameras.roles.public-area',
} as const satisfies Record<GuardCameraRole, TranslationKey>;

export const CONFIDENCE_LABEL = {
  sure: 'screens.proximity.people.confidence.sure',
  likely: 'screens.proximity.people.confidence.likely',
  unsure: 'screens.proximity.people.confidence.unsure',
} as const satisfies Record<ConfidenceLevel, TranslationKey>;

export const EVIDENCE_LABEL = {
  face: 'screens.proximity.people.evidence.face',
  radarBox: 'screens.proximity.people.evidence.radar-box',
  voice: 'screens.proximity.people.evidence.voice',
  ble: 'screens.proximity.people.evidence.ble',
} as const satisfies Record<ProximityEvidence, TranslationKey>;

export const EVIDENCE_ICON = {
  face: 'scan-face',
  radarBox: 'activity',
  voice: 'audio-lines',
  ble: 'bluetooth',
} as const satisfies Record<ProximityEvidence, IconName>;

const SURE_FROM = 0.8;
const LIKELY_FROM = 0.5;
const MINUTE_MS = 60_000;

const isCameraRole = (value: string): value is GuardCameraRole => (CAMERA_ROLES as readonly string[]).includes(value);

export function parseRoomKey(room: string): RoomKey {
  const camera = /^(\d+):camera:(\d+)$/.exec(room);
  if (camera) return { kind: 'camera', environmentId: Number(camera[1]), cameraId: Number(camera[2]) };
  const role = /^(\d+):([a-z_]+)$/.exec(room);
  if (role && role[2] && isCameraRole(role[2])) {
    return { kind: 'role', environmentId: Number(role[1]), role: role[2] };
  }
  return { kind: 'named', name: room.trim() };
}

const environmentNameOf = (world: RoomWorld, id: number): string | null =>
  world.environments.find((environment) => environment.id === id)?.name ?? null;

const cameraNameOf = (world: RoomWorld, id: number): string | null =>
  world.cameras.find((camera) => camera.id === String(id))?.name ?? null;

export function roomPlace(room: string, world: RoomWorld): RoomPlace {
  const key = parseRoomKey(room);
  if (key.kind === 'named') {
    return { role: null, cameraName: null, environmentName: null, cameraNames: [], named: key.name || null };
  }
  const environmentName = environmentNameOf(world, key.environmentId);
  if (key.kind === 'camera') {
    return { role: null, cameraName: cameraNameOf(world, key.cameraId), environmentName, cameraNames: [], named: null };
  }
  const cameraNames = world.contexts
    .filter(
      (context) => context.environmentId === key.environmentId && context.role === key.role && !context.outdoor
    )
    .map((context) => cameraNameOf(world, context.cameraId))
    .filter((name): name is string => name !== null)
    .sort((left, right) => left.localeCompare(right));
  return { role: key.role, cameraName: null, environmentName, cameraNames, named: null };
}

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= SURE_FROM) return 'sure';
  if (confidence >= LIKELY_FROM) return 'likely';
  return 'unsure';
}

export const confidencePercent = (confidence: number): number =>
  Math.round(Math.min(1, Math.max(0, confidence)) * 100);

export function minutesAgo(at: number, now: number): number {
  return Math.max(0, Math.floor((now - at) / MINUTE_MS));
}

export type PeopleRoomsInput = {
  people: readonly ProximityPerson[];
  names: readonly { id: string; name: string; lastName: string }[];
  world: RoomWorld;
  unnamed: (userId: string) => string;
};

export function peopleRooms({ people, names, world, unnamed }: PeopleRoomsInput): PersonRoom[] {
  return people
    .map((person) => {
      const known = names.find((entry) => entry.id === person.userId);
      const name = known ? [known.name, known.lastName].filter((part) => part.trim()).join(' ').trim() : '';
      return {
        userId: person.userId,
        name: name || unnamed(person.userId),
        place: roomPlace(person.room, world),
        level: confidenceLevel(person.confidence),
        percent: confidencePercent(person.confidence),
        evidence: person.evidence,
        since: person.since,
        updatedAt: person.updatedAt,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

import type { RouteSpec } from '../fake-argus';
import { environment, episode, incident } from '../screens';
import { CREATED, DAY, HOUR, NOW, user } from './data';
import type { Row } from './scenario';

const off = { presence: false, faceCameras: false, voiceLearning: false, cameraAudio: false };

const on = { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true };

export const PRIVACY_DECIDED = {
  decided: true,
  noticeVersion: 2,
  current: true,
  decidedAt: NOW - DAY * 30,
  updatedAt: NOW - DAY * 30,
  choices: { ...on, cameraAudio: false },
  effective: { ...on, cameraAudio: false },
  currentNoticeVersion: 2,
  household: on,
};

export const PRIVACY_UNDECIDED = { ...PRIVACY_DECIDED, decided: false, current: false, noticeVersion: 0, choices: off, effective: off };

export const sessionRow = (id: string, deviceName: string | null, platform: string, current: boolean, seen = NOW - 300) => ({
  id,
  platform,
  deviceName,
  createdAt: NOW - DAY * 20,
  lastSeenAt: seen,
  expiresAt: NOW + DAY * 40,
  current,
});

export const SESSIONS = [
  sessionRow('b'.repeat(32), 'Escritorio de Ana', 'desktop', true, NOW),
  sessionRow('a'.repeat(32), 'Pixel 8', 'android', false),
  sessionRow('c'.repeat(32), 'iPad de la sala', 'ios', false, NOW - DAY * 3),
  sessionRow('d'.repeat(32), null, 'web', false, NOW - DAY * 12),
];

export const CALL_PREFERENCES = {
  userId: 1,
  enabled: true,
  guardCritical: 'call',
  guardIntruder: 'call',
  guardEscalation: 'notify',
  guardArrival: 'notify',
  agenda: 'notify',
  assistant: 'call',
  quietStartHour: 22,
  quietEndHour: 7,
  dndUntil: 0,
  criticalBypass: true,
  mutedEnvironmentIds: [],
  updatedAt: NOW - DAY,
  agendaLeadMinutes: 10,
  quietDays: 0,
  ringSeconds: 30,
  pushDelaySeconds: 5,
  liveAnnounce: true,
  lang: '',
};

export const SAFETY = { duressEnabled: true, hasPin: true, hasPhrase: true, alertsReach: 'others', appSirenEnabled: true, maskedCameras: [] };

export const ENVIRONMENTS = [
  { ...environment('away'), cameraIds: [3, 4] },
  {
    ...environment('home'),
    id: 2,
    name: 'Restaurante Centro',
    kind: 'restaurant',
    isDefault: false,
    cameraIds: [5],
    scheduleEnabled: true,
    open: 'mon,tue,wed,thu,fri,sat 12:00-23:00',
  },
];

export const EPISODES = [
  episode,
  { ...episode, id: 52, state: 'ended', status: 'left', danger: 'low', notified: false, subject: 'household', firstSeen: NOW - HOUR * 3, lastSeen: NOW - HOUR * 3 + 40 },
  { ...episode, id: 53, kind: 'camera', status: 'covered', state: 'ended', danger: 'high', firstSeen: NOW - DAY, lastSeen: NOW - DAY + 120 },
  { ...episode, id: 54, subject: 'several', people: 3, danger: 'critical', spoke: true, sounded: true, reasons: ['night'], firstSeen: NOW - DAY * 2, lastSeen: NOW - DAY * 2 + 300 },
];

export const GUESTS = [
  { id: 7, cameraId: 3, environmentId: 1, personId: 0, hostUserId: 1, description: 'Técnico de internet', oneTime: true, validFrom: NOW - HOUR, validUntil: NOW + HOUR * 3 },
];

export const MAINTENANCE = {
  windows: [
    {
      id: 4,
      environmentId: 1,
      cameraIds: [3],
      declaredBy: 1,
      declaredByName: 'Ana',
      startedAt: NOW - 300,
      endsAt: NOW + 900,
      endedAt: null,
      endReason: null,
      active: true,
      duress: false,
      source: 'app',
      viewChecks: [{ cameraId: 3, cameraName: 'Patio trasero', state: 'pending' }],
    },
  ],
};

export const RESPONSE_PLAN = {
  environmentId: 1,
  emergencyNumber: '105',
  stepSeconds: 60,
  staffedNow: false,
  recipients: [
    { userId: 1, name: 'Ana', role: 'owner', mode: 'call', step: 0, onDuty: false, customized: false, mandatory: false },
    { userId: 3, name: 'Carlos', role: 'guard', mode: 'call', step: 1, onDuty: true, customized: true, mandatory: true },
    { userId: 2, name: 'Luis', role: 'resident', mode: 'off', step: 0, onDuty: false, customized: true, mandatory: false },
  ],
  contacts: [{ id: 1, name: 'Vecina del 2B', phone: '+51 999 111 222', note: 'Tiene llave' }],
};

export const camera = (id: number, name: string, patch: Record<string, unknown> = {}): Row => ({
  table: 'camera',
  row: {
    id,
    name,
    driver: 'tapo',
    icon: 'video',
    manufacturer: 'TP-Link',
    model: 'C210',
    ip: `192.168.1.${50 + id}`,
    port: 554,
    username: 'admin',
    cloudUsername: 'ana@example.com',
    recordMode: 'events',
    privacyState: 'off',
    privacyObeyed: false,
    watchman: true,
    noAudio: false,
    retentionDays: 30,
    capabilities: ['ptz', 'presets', 'talk', 'privacy', 'led', 'dayNight', 'motion', 'autoTrack', 'alarm', 'sdCard'],
    config: { catalogId: 'tapo-c210', streamPath: '', subStreamPath: '', homePreset: '1', activeLook: false, followIntruders: false, noAimSectors: [], retentionIncident: false },
    isEnabled: true,
    isOnline: true,
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
    ...patch,
  },
});

export const zone = (id: number, cameraId: number, name: string, zoneType: string, color: string): Row => ({
  table: 'zone',
  row: {
    id,
    cameraId,
    name,
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.55, y: 0.15 },
      { x: 0.6, y: 0.75 },
      { x: 0.15, y: 0.8 },
    ],
    zoneType,
    color,
    isEnabled: true,
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
  },
});

export const CAMERAS: Row[] = [
  camera(3, 'Patio trasero'),
  camera(4, 'Puerta principal', { driver: 'onvif', manufacturer: 'Reolink', model: 'E1 Outdoor', cloudUsername: '', recordMode: 'continuous' }),
  camera(5, 'Cocina', { isOnline: false, recordMode: 'motion' }),
  camera(6, 'Garaje', { isEnabled: false, recordMode: 'off' }),
  camera(7, 'Dormitorio', { privacyState: 'on' }),
  zone(11, 3, 'Puerta', 'alert', '#FF3B30'),
  zone(12, 3, 'Jardín', 'monitor', '#34C759'),
];

const stream = { codec: 'h264', profile: 'main', audio: 'aac', width: 1920, height: 1080, fps: 15, kbps: 2048 };

const overviewCamera = (id: number, patch: Record<string, unknown> = {}) => ({
  id,
  lastSeenAt: (NOW - 60) * 1000,
  sampledAt: (NOW - 60) * 1000,
  health: 'ok',
  width: 1920,
  height: 1080,
  viewers: 0,
  stream,
  mainActive: true,
  privacyState: 'off',
  lastEvent: null,
  ...patch,
});

const detection = (id: string, cameraId: number, minutesAgo: number, label: string, severity: string) => ({
  id,
  cameraId,
  at: (NOW - minutesAgo * 60) * 1000,
  rule: label,
  severity,
  label,
  zoneName: 'Puerta',
});

export const OVERVIEW = {
  cameras: [
    overviewCamera(3, { viewers: 2, lastEvent: detection('e1', 3, 5, 'person', 'warning') }),
    overviewCamera(4, { health: 'dark' }),
    overviewCamera(5, { health: 'unreachable', lastSeenAt: (NOW - HOUR * 5) * 1000, stream: null }),
    overviewCamera(6, { stream: null }),
    overviewCamera(7, { privacyState: 'on', stream: null }),
  ],
  events: [
    detection('e1', 3, 5, 'person', 'warning'),
    detection('e2', 4, 40, 'car', 'info'),
    detection('e3', 3, 90, 'dog', 'info'),
    detection('e4', 4, 300, 'person', 'critical'),
    detection('e5', 3, 60 * 26, 'cat', 'info'),
  ],
};

export const EMPTY_OVERVIEW = { cameras: [], events: [] };

export const notification = (id: number, title: string, body: string, data: Record<string, unknown>, patch: Record<string, unknown> = {}): Row => ({
  table: 'notification',
  row: { id, userId: 1, type: 'system', title, body, data, isRead: false, readAt: null, createdAt: NOW - id * 300, ...patch },
});

export const NOTIFICATIONS: Row[] = [
  notification(1, 'Persona desconocida en Patio trasero', 'Argus vio a alguien que no conoce.', { kind: 'guard_episode', threadKey: 'guard:51', urgency: 'critical', phase: 'opened' }),
  notification(2, 'Sigue en el patio', 'La persona continúa cerca de la puerta.', { kind: 'guard_episode', threadKey: 'guard:51', urgency: 'critical', phase: 'escalated' }),
  notification(3, 'Luis te dejó un mensaje', 'La cena está lista', { kind: 'household_message', counterpartId: 2, urgency: 'active' }),
  notification(4, 'Resumen del día', 'Hoy hubo 4 detecciones y ningún incidente.', { kind: 'guard_digest', urgency: 'passive', phase: 'daily' }, { isRead: true, readAt: NOW - 3000 }),
  notification(5, 'Carlos pidió activar Productividad', 'Quiere usar la agenda y los proyectos.', { kind: 'module_request', moduleId: 'productivity', urgency: 'active' }),
  notification(6, 'Recordatorio: Pagar la luz', 'Vence hoy a las 17:00.', { kind: 'agenda_event', urgency: 'time_sensitive' }, { isRead: true, readAt: NOW - 3000 }),
];

export const INCIDENT = incident;

export const HOUSEHOLD_PRIVACY = {
  currentNoticeVersion: 2,
  household: { ...on, visitorRecognition: true, watchman: true },
  householdUpdatedAt: NOW - DAY * 10,
  visitorAcknowledgedAt: NOW - DAY * 10,
  watchmanAcknowledgedAt: NOW - DAY * 10,
  users: [1, 2, 3, 4].map((userId) => ({
    userId,
    decided: userId !== 4,
    noticeVersion: userId === 3 ? 1 : 2,
    current: userId !== 3,
    decidedAt: NOW - DAY * 20,
    updatedAt: NOW - DAY * 20,
    choices: on,
    effective: on,
    minor: false,
    guardianConsent: false,
  })),
};

export const USER_SESSIONS = {
  users: [
    { userId: 1, sessions: SESSIONS.slice(0, 2) },
    { userId: 2, sessions: [sessionRow('e'.repeat(32), 'Moto G', 'android', false, NOW - 60)] },
    { userId: 3, sessions: [sessionRow('f'.repeat(32), 'Tablet portería', 'android', false, NOW - DAY * 2)] },
  ],
};

export const invitation = (id: number, role: string, patch: Record<string, unknown> = {}): Row => ({
  table: 'user_invitation',
  row: {
    id,
    role,
    maxRedemptions: 1,
    redemptionCount: 0,
    expiresAt: NOW + 900,
    createdBy: 1,
    revokedAt: null,
    revokedReason: null,
    revokedModule: null,
    createdAt: NOW - id,
    updatedAt: NOW - id,
    ...patch,
  },
});

export const PEOPLE: Row[] = [
  user(2, 'Luis', 'Ruiz', 'resident'),
  user(3, 'Carlos', 'Paredes', 'guard'),
  user(4, 'Marta', 'Soto', 'guest'),
  user(8, 'Jorge', 'Quispe', 'resident', false),
  invitation(101, 'resident'),
  invitation(102, 'guard', { redemptionCount: 1 }),
  invitation(103, 'guest', { revokedAt: NOW - DAY }),
  invitation(104, 'guard', { revokedAt: NOW - DAY * 2, revokedReason: 'module_disabled', revokedModule: 'surveillance' }),
  invitation(105, 'guest', { expiresAt: NOW - DAY * 3 }),
];

export const visitorSummary = (id: number, name: string, category: string, patch: Record<string, unknown> = {}) => ({
  id,
  name,
  category,
  note: '',
  visitorNumber: id,
  visitCount: 3 + id,
  firstSeenAt: NOW - DAY * 9,
  lastSeenAt: NOW - HOUR * id,
  sampleCount: 4,
  coverSampleId: null,
  cameraIds: [3],
  ...patch,
});

export const VISITORS = {
  recognitionEnabled: true,
  visitors: [
    visitorSummary(1, 'Don Pedro', 'neighbor'),
    visitorSummary(2, '', 'delivery'),
    visitorSummary(3, 'Jardinero', 'service', { note: 'Viene los lunes' }),
    visitorSummary(4, '', ''),
    visitorSummary(5, 'Sospechoso de la esquina', 'watchlist'),
  ],
  nextCursor: null,
};

export const VISITOR_SETTINGS = { recognitionEnabled: true, unnamedRetentionDays: 30, minRetentionDays: 1, maxRetentionDays: 60, updatedAt: NOW - DAY };

export const VISITOR_DETAIL = {
  ...visitorSummary(3, 'Jardinero', 'service', { note: 'Viene los lunes' }),
  samples: [1, 2, 3, 4].map((id) => ({ id, quality: 0.8, cameraId: 3, hasCrop: false, createdAt: NOW - DAY * id })),
  visits: [1, 2, 3].map((id) => ({ id, cameraId: 3, startedAt: NOW - DAY * 7 * id, lastSeenAt: NOW - DAY * 7 * id + 600, sightings: id })),
  pattern: { weekdays: [1], usualHour: 9, visitsConsidered: 3 },
};

export const RECEIVERS = {
  receivers: [
    { id: 1, name: 'Sala', room: 'Sala', kind: 'esphome', host: 'esp32-sala.local', port: 6053, online: true, lastSeenAt: NOW - 30 },
    { id: 2, name: 'Cocina', room: 'Cocina', kind: 'esphome', host: '192.168.1.41', port: 6053, online: false, lastSeenAt: NOW - DAY },
  ],
};

export const SENSORS = {
  sensors: [
    { id: 1, name: 'Radar pasillo', room: 'Pasillo', model: 'ld2450', source: 'esphome', host: 'esp32-radar.local', port: 6053, entityId: '', cameraId: 3, panOffsetDeg: 15, online: true, lastSeenAt: NOW - 20 },
  ],
};

export const PROXIMITY_PEOPLE = {
  people: [
    { userId: 1, room: '1:living', confidence: 0.92, since: NOW - HOUR, updatedAt: NOW - 30, evidence: 'face' },
    { userId: 2, room: '1:camera:3', confidence: 0.6, since: NOW - 600, updatedAt: NOW - 400, evidence: 'ble' },
    { userId: 4, room: '', confidence: 0.3, since: NOW - 300, updatedAt: NOW - 200, evidence: 'voice' },
  ],
};

export const GUARD_CAMERAS = [
  { cameraId: 3, role: 'entrance', outdoor: true, publicArea: false, activeHours: '', environmentId: 1, updatedAt: NOW - DAY },
  { cameraId: 4, role: 'perimeter', outdoor: true, publicArea: true, activeHours: 'mon,tue,wed,thu,fri 09:00-18:00', environmentId: 1, updatedAt: NOW - DAY },
];

export const BASELINE: RouteSpec[] = [
  { method: 'GET', path: '/privacy/me', info: PRIVACY_DECIDED },
  { method: 'GET', path: '/notification/responses', info: [] },
  { method: 'GET', path: '/guard/environments', info: ENVIRONMENTS },
  { method: 'GET', path: '/camera/overview', info: OVERVIEW },
  { method: 'GET', path: '/camera/recording', info: { paused: false, freeGb: 120, minFreeGb: 10, freeBytes: 128849018880 } },
  { method: 'GET', path: '/camera/catalog', info: { models: [] } },
  { method: 'GET', path: '/guard/proximity/me', info: { ble: { enabled: false, seed: null, rotateSeconds: 900, receivers: 2 }, located: true } },
  { method: 'GET', path: '/rtc/watch', info: { conversations: [] } },
  { method: 'GET', path: '/auth/sessions', info: { sessions: SESSIONS } },
  { method: 'GET', path: '/guard/safety', info: SAFETY },
  { method: 'GET', path: '/notification/call-preferences', info: CALL_PREFERENCES },
  { method: 'PATCH', path: '/notification/read', info: null },
  { method: 'GET', path: '/guard/episodes', info: { rows: EPISODES, nextBefore: null } },
  { method: 'GET', path: '/guard/expected-guests', info: GUESTS },
  { method: 'GET', path: '/guard/cameras', info: GUARD_CAMERAS },
  { method: 'GET', path: '/guard/maintenance', info: MAINTENANCE },
  { method: 'GET', path: '/guard/presence', info: { people: [{ userId: 1, state: 'home', since: NOW - HOUR * 2, environments: [] }, { userId: 2, state: 'away', since: NOW - DAY, environments: [] }] } },
  { method: 'GET', path: '/privacy/users', info: HOUSEHOLD_PRIVACY },
  { method: 'GET', path: '/auth/users/sessions', info: USER_SESSIONS },
  { method: 'GET', path: '/voiceprint/users', info: { available: true, recognized: [{ userId: 2, since: NOW - DAY * 40, updatedAt: NOW - DAY }] } },
  { method: 'GET', path: '/visitor', info: VISITORS },
  { method: 'GET', path: '/visitor-settings', info: VISITOR_SETTINGS },
  { method: 'GET', path: '/sync/activity', info: { items: [], nextCursor: null } },
];

export const quietRoutes = (paths: readonly string[]): RouteSpec[] =>
  BASELINE.filter((spec) => !paths.includes(spec.path));

const GB = 1024 * 1024 * 1024;

export const moduleDetail = (
  id: string,
  name: { es: string; en: string },
  summary: { es: string; en: string },
  patch: Record<string, unknown> = {}
) => ({
  id,
  name,
  summary,
  kind: id === 'core' ? 'core' : 'available',
  intro: null,
  roles: id === 'surveillance' ? ['guard'] : [],
  lifecycle: 'active',
  enabled: true,
  hasData: true,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 2 * GB,
  installedBytes: 2 * GB,
  hardware: { verdict: 'ok', reasons: [], minRamMb: 4096, recommendedRamMb: 8192, freeDiskMb: 51200 },
  job: null,
  gettingStarted: [],
  components: [],
  ...patch,
});

export const job = (kind: string, state: string, progress: number, patch: Record<string, unknown> = {}) => ({
  id: `job-${kind}-${state}`,
  kind,
  state,
  progress,
  bytesDone: Math.round(progress * GB),
  bytesTotal: GB,
  bytesPerSecond: 5 * 1024 * 1024,
  etaSeconds: 116,
  reason: null,
  owner: 'camera',
  roleMoves: [],
  roleMovesNote: null,
  ...patch,
});

export const CORE_MODULE = moduleDetail(
  'core',
  { es: 'Asistente y hogar', en: 'Assistant and home' },
  { es: 'Voz, recordatorios y personas', en: 'Voice, reminders and people' },
  { sizeBytes: 0, installedBytes: 0 }
);

export const SURVEILLANCE_MODULE = moduleDetail(
  'surveillance',
  { es: 'Vigilancia', en: 'Surveillance' },
  { es: 'Cámaras, zonas y respuesta ante intrusos', en: 'Cameras, zones and intruder response' }
);

export const PRODUCTIVITY_MODULE = moduleDetail(
  'productivity',
  { es: 'Productividad', en: 'Productivity' },
  { es: 'Agenda, proyectos y tareas', en: 'Agenda, projects and tasks' },
  { sizeBytes: 0, installedBytes: 0 }
);

export const AGRONOMY_MODULE = moduleDetail(
  'agronomy',
  { es: 'Agronomía', en: 'Agronomy' },
  { es: 'Cultivos, riego y plagas', en: 'Crops, irrigation and pests' },
  { kind: 'coming_soon', enabled: false, lifecycle: 'not_installed', installedBytes: 0, hasData: false }
);

export const catalogContext = (modules: readonly Record<string, unknown>[]): Record<string, unknown> => ({
  version: 2,
  ownerCatalog: modules,
  modules: modules.map((module) => ({
    id: module.id,
    name: module.name,
    summary: module.summary,
    kind: module.kind,
    intro: null,
    roles: module.roles,
    enabled: module.enabled,
    lifecycle: module.lifecycle,
    dataPurgedAt: null,
  })),
});

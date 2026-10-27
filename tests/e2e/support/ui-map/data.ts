import type { Row } from './scenario';

export const NOW = 1791835200;

export const MIDNIGHT = 1791781200;

export const HOUR = 3600;

export const DAY = 86400;

export const CREATED = 1790000000;

export const LONG_TEXT =
  'Revisar la instalación eléctrica completa del segundo piso antes de la mudanza, incluyendo tomacorrientes, interruptores y el tablero principal del garaje';

export const user = (
  id: number,
  name: string,
  lastName: string,
  role: string,
  isActive = true
): Row => ({
  table: 'user',
  row: {
    id,
    name,
    lastName,
    role,
    lang: 'es',
    isActive,
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
  },
});

export const HOUSEHOLD: Row[] = [
  user(2, 'Luis', 'Ruiz', 'resident'),
  user(3, 'Carlos', 'Paredes', 'guard'),
  user(4, 'Marta', 'Soto', 'guest'),
];

export const project = (id: number, name: string, patch: Record<string, unknown> = {}): Row => ({
  table: 'project',
  row: {
    id,
    ownerId: 1,
    name,
    description: '',
    status: 'active',
    color: 'blue',
    startsAt: null,
    targetAt: null,
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
    deletedAt: null,
    ...patch,
  },
});

export const task = (
  id: number,
  projectId: number,
  title: string,
  patch: Record<string, unknown> = {}
): Row => ({
  table: 'project_task',
  row: {
    id,
    projectId,
    createdBy: 1,
    assigneeId: null,
    title,
    status: 'todo',
    priority: 'none',
    dueAt: null,
    sortOrder: id,
    createdVia: 'app',
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
    ...patch,
  },
});

export const member = (
  id: number,
  projectId: number,
  userId: number,
  access: 'view' | 'edit'
): Row => ({
  table: 'project_member',
  row: {
    id,
    projectId,
    userId,
    access,
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
    deletedAt: null,
  },
});

export const event = (
  id: number,
  title: string,
  startsAt: number,
  patch: Record<string, unknown> = {}
): Row => ({
  table: 'calendar_event',
  row: {
    id,
    ownerId: 1,
    createdBy: 1,
    projectId: null,
    title,
    description: '',
    location: '',
    color: 'blue',
    startsAt,
    endsAt: startsAt + HOUR,
    isAllDay: false,
    recurrenceRule: null,
    recurrenceExceptions: [],
    createdVia: 'app',
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
    deletedAt: null,
    ...patch,
  },
});

export const share = (
  id: number,
  calendarEventId: number,
  userId: number,
  access: 'view' | 'edit'
): Row => ({
  table: 'calendar_event_share',
  row: {
    id,
    calendarEventId,
    userId,
    access,
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
    deletedAt: null,
  },
});

export const reminder = (
  id: number,
  title: string,
  scheduledAt: number,
  patch: Record<string, unknown> = {}
): Row => ({
  table: 'reminder',
  row: {
    id,
    createdBy: 1,
    targetUserId: 1,
    title,
    description: '',
    scheduledAt,
    recurrenceRule: null,
    isCompleted: false,
    completedAt: null,
    createdAt: CREATED + id,
    updatedAt: CREATED + id,
    ...patch,
  },
});

export const message = (id: number, patch: Record<string, unknown>): Row => ({
  table: 'conversation_message',
  row: {
    id,
    userId: 1,
    counterpartId: 0,
    counterpartName: '',
    direction: 'in',
    kind: 'turn',
    body: '',
    leg: null,
    state: 'delivered',
    messageKey: `msg-${id}`,
    replyToKey: null,
    isRead: true,
    readAt: null,
    createdAt: NOW - 3000 + id,
    updatedAt: null,
    deletedAt: null,
    ...patch,
  },
});

export const PRODUCTIVITY: Row[] = [
  ...HOUSEHOLD,
  project(700, 'Mudanza', {
    description: 'Cajas, transporte y la nueva casa',
    createdAt: CREATED + 1000,
  }),
  project(701, 'Huerto', { status: 'planned' }),
  project(702, 'Pintar la sala', { status: 'paused' }),
  task(800, 700, 'Comprar cajas', { status: 'done', priority: 'low' }),
  task(801, 700, 'Llamar a la mudanza', {
    status: 'doing',
    priority: 'high',
    dueAt: NOW + DAY * 2,
  }),
  task(802, 700, 'Etiquetar la cocina', {
    status: 'todo',
    priority: 'medium',
    dueAt: NOW - DAY * 2,
  }),
  task(803, 700, 'Desconectar internet', { status: 'backlog', priority: 'urgent' }),
  task(804, 700, 'Vender el sofá', { status: 'canceled' }),
  event(900, 'Reunión con el arquitecto', MIDNIGHT + HOUR * 14 + 1800, {
    endsAt: MIDNIGHT + HOUR * 16,
    location: 'Casa',
  }),
  event(901, 'Desayuno familiar', MIDNIGHT + HOUR * 9),
  event(902, 'Clase de guitarra', MIDNIGHT + HOUR * 18, { location: 'Academia' }),
  event(903, 'Feriado', MIDNIGHT, { isAllDay: true, endsAt: null }),
  event(904, 'Yoga', MIDNIGHT - DAY * 7 + HOUR * 7, { recurrenceRule: 'FREQ=WEEKLY' }),
  event(905, 'Cumpleaños de Luis', MIDNIGHT + DAY * 3 + HOUR * 20),
  reminder(950, 'Pagar la luz', MIDNIGHT + HOUR * 17),
  reminder(951, 'Regar las plantas', MIDNIGHT + HOUR * 8, {
    isCompleted: true,
    completedAt: MIDNIGHT + HOUR * 8,
  }),
];

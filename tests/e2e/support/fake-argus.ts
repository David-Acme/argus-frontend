import type { ServerWebSocket } from 'bun';
import { CAPABILITY } from '../../../src/shared/constants/capability.constant';

export type DeviceSocket = ServerWebSocket<{ device: string }>;

type Row = Record<string, unknown> & { id: number; createdAt: number };

export type DeviceFrame = { device?: string; frame: unknown; close?: boolean };

export type RouteSpec = {
  method: string;
  path: string;
  device?: string;
  status?: number;
  info?: unknown;
  errors?: unknown;
  emits?: DeviceFrame[];
  sets?: RouteSpec[];
  modules?: Record<string, boolean>;
};

type SyncBody = { created?: { startTime?: number; startId?: number }; requiredCreate?: boolean; findLastDeleted?: boolean };

const OPERATION = {
  InitialInfo: 0,
  Synchronize: 1,
  SynchronizeAuditLog: 2,
  SynchronizeUserAuditLog: 3,
  Add: 4,
  Heartbeat: 11,
} as const;

export const OWNER = { id: 1, name: 'Ana', role: 'owner', isActive: true, personId: null } as const;

const text = (es: string, en: string) => ({ es, en });

const moduleBrief = (id: string, name: { es: string; en: string }, enabled: boolean) => ({
  id,
  name,
  summary: text('', ''),
  kind: id === 'core' ? 'core' : 'available',
  intro: null,
  roles: [],
  enabled,
  lifecycle: enabled ? 'active' : 'disabled',
  dataPurgedAt: null,
});

export const ownerContext = (enabled: Readonly<Record<string, boolean>> = {}) => ({
  userId: OWNER.id,
  role: OWNER.role,
  roleActive: true,
  capabilities: Object.values(CAPABILITY),
  roles: [{ id: 'owner', module: 'core', active: true }],
  modules: [
    moduleBrief('core', text('Asistente y hogar', 'Assistant and home'), true),
    moduleBrief('productivity', text('Productividad', 'Productivity'), enabled.productivity ?? true),
    moduleBrief('surveillance', text('Vigilancia', 'Surveillance'), enabled.surveillance ?? true),
  ],
  version: 1,
});

const consentGiven = {
  decided: true,
  noticeVersion: 2,
  current: true,
  decidedAt: 1790000000,
  updatedAt: 1790000000,
  choices: { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: false },
  effective: { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: false },
  currentNoticeVersion: 2,
  household: { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true },
};

const envelope = (status: number, info: unknown, errors: unknown = null): Response =>
  Response.json({ status, info, errors }, { status });

const seconds = (): number => Math.floor(Date.now() / 1000);

export class FakeArgus {
  private readonly tables = new Map<string, Row[]>();
  private readonly sockets = new Set<DeviceSocket>();
  private readonly refusedUntil = new Map<string, number>();
  private readonly downUntil = new Map<string, number>();
  private readonly routes = new Map<string, RouteSpec>();
  private readonly enabled: Record<string, boolean> = {};
  private contextPatch: Record<string, unknown> = {};
  private nextId = 100;
  private clock = 0;
  readonly requests: string[] = [];
  readonly bodies: Record<string, string> = {};

  constructor() {
    this.reset();
  }

  reset(): void {
    this.routes.clear();
    this.refusedUntil.clear();
    this.downUntil.clear();
    for (const key of Object.keys(this.enabled)) delete this.enabled[key];
    this.contextPatch = {};
    this.requests.length = 0;
    for (const key of Object.keys(this.bodies)) delete this.bodies[key];
    this.tables.clear();
    this.tables.set('user', [
      { id: OWNER.id, name: OWNER.name, lastName: 'Ruiz', role: OWNER.role, lang: 'es', isActive: true, createdAt: 1790000000, updatedAt: 1790000000 },
    ]);
  }

  store(table: string, row: Row): void {
    this.tables.set(table, [...this.rows(table).filter((existing) => existing.id !== row.id), row]);
  }

  storeMany(table: string, rows: readonly Row[]): void {
    const ids = new Set(rows.map((row) => row.id));
    this.tables.set(table, [...this.rows(table).filter((existing) => !ids.has(existing.id)), ...rows]);
  }

  accepts(device: string): boolean {
    return (this.refusedUntil.get(device) ?? 0) <= Date.now() && !this.isDown(device);
  }

  private isDown(device: string): boolean {
    return (this.downUntil.get(device) ?? 0) > Date.now();
  }

  open(socket: DeviceSocket): void {
    this.sockets.add(socket);
    socket.send(
      JSON.stringify({
        operation: OPERATION.InitialInfo,
        option: 'user',
        info: { id: this.context().userId, role: this.context().role, isActive: true, context: this.context() },
      })
    );
  }

  close(socket: DeviceSocket): void {
    this.sockets.delete(socket);
  }

  receive(socket: DeviceSocket, raw: string): void {
    let message: { type?: string; payload?: unknown };
    try {
      message = JSON.parse(raw) as typeof message;
    } catch {
      return;
    }
    switch (message.type) {
      case 'sync':
        socket.send(JSON.stringify({ operation: OPERATION.Synchronize, option: 'sync', info: this.synchronize(message.payload) }));
        return;
      case 'sync_audit_log':
        socket.send(JSON.stringify({ operation: OPERATION.SynchronizeAuditLog, option: 'audit_log', info: this.audit(message.payload) }));
        return;
      case 'sync_user_audit_log':
        socket.send(
          JSON.stringify({ operation: OPERATION.SynchronizeUserAuditLog, option: 'user_audit_log', info: this.audit(message.payload) })
        );
        return;
      case 'heartbeat':
        socket.send(
          JSON.stringify({
            operation: OPERATION.Heartbeat,
            option: 'heartbeat',
            info: { at: seconds(), intervalSeconds: 60, graceSeconds: 120, socketGraceSeconds: 30, armed: false, presence: 'home' },
          })
        );
        return;
      default:
        return;
    }
  }

  context(): Record<string, unknown> {
    return { ...ownerContext(this.enabled), ...this.contextPatch };
  }

  patchContext(patch: Record<string, unknown>): void {
    this.contextPatch = { ...this.contextPatch, ...patch };
  }

  define(specs: readonly RouteSpec[]): void {
    for (const spec of specs) this.routes.set(this.key(spec.method, spec.path, spec.device), spec);
  }

  emit(frames: readonly DeviceFrame[]): void {
    for (const { device, frame, close } of frames) {
      const added = frame as { operation?: number; option?: string; info?: Row };
      if (added.operation === OPERATION.Add && added.option && added.info) this.store(added.option, added.info);
      const message = JSON.stringify(frame);
      for (const socket of [...this.sockets]) {
        if (device && socket.data.device !== device) continue;
        socket.send(message);
        if (close) {
          socket.close(1000, 'closed by the e2e harness');
          this.sockets.delete(socket);
        }
      }
    }
  }

  private key(method: string, path: string, device?: string): string {
    return `${method.toUpperCase()} ${path}${device ? ` @${device}` : ''}`;
  }

  private answer(spec: RouteSpec): Response {
    if (spec.sets) this.define(spec.sets);
    if (spec.modules) Object.assign(this.enabled, spec.modules);
    const status = spec.status ?? 200;
    const response = status === 204 ? new Response(null, { status }) : envelope(status, spec.info ?? null, spec.errors ?? null);
    if (spec.emits) {
      const frames = spec.emits;
      setTimeout(() => this.emit(frames), 0);
    }
    return response;
  }

  drop(device: string): number {
    let dropped = 0;
    for (const socket of [...this.sockets]) {
      if (socket.data.device !== device) continue;
      socket.close(1001, 'dropped by the e2e harness');
      this.sockets.delete(socket);
      dropped += 1;
    }
    return dropped;
  }

  refuse(device: string, ms: number): void {
    this.refusedUntil.set(device, Date.now() + ms);
  }

  down(device: string, ms: number): number {
    this.downUntil.set(device, Date.now() + ms);
    return this.drop(device);
  }

  connected(device: string): number {
    return [...this.sockets].filter((socket) => socket.data.device === device).length;
  }

  rows(table: string): Row[] {
    return this.tables.get(table) ?? [];
  }

  async api(method: string, path: string, body: string, device: string): Promise<Response> {
    const line = `${method} ${path}${device ? ` @${device}` : ''}`;
    this.requests.push(line);
    if (body) this.bodies[line] = body;
    if (this.isDown(device)) return envelope(503, null, { code: 'SERVICE_UNAVAILABLE', message: 'the e2e backend is down' });
    const bare = path.split('?')[0] ?? path;
    const spec =
      this.routes.get(this.key(method, path, device)) ??
      this.routes.get(this.key(method, bare, device)) ??
      this.routes.get(this.key(method, path)) ??
      this.routes.get(this.key(method, bare));
    if (spec) return this.answer(spec);
    if (method === 'POST' && path === '/project') return this.createProject(body);
    if (method === 'GET' && bare === '/privacy/me') return envelope(200, consentGiven);
    if (method === 'GET' && bare === '/modules') return envelope(200, { modules: ownerContext(this.enabled).modules });
    return envelope(404, null, { code: 'ROUTE_NOT_FOUND', message: `the e2e backend has no ${method} ${path}` });
  }

  private createProject(body: string): Response {
    const input = (JSON.parse(body || '{}') ?? {}) as Record<string, unknown>;
    const at = this.tick();
    const row: Row = {
      id: this.nextId++,
      ownerId: OWNER.id,
      name: String(input.name ?? ''),
      description: String(input.description ?? ''),
      status: String(input.status ?? 'active'),
      color: String(input.color ?? 'blue'),
      startsAt: input.startsAt ?? null,
      targetAt: input.targetAt ?? null,
      createdAt: at,
      updatedAt: at,
      deletedAt: null,
    };
    this.tables.set('project', [...this.rows('project'), row]);
    this.broadcast({ operation: OPERATION.Add, option: 'project', info: row });
    return envelope(201, row);
  }

  private tick(): number {
    this.clock = Math.max(this.clock + 1, seconds());
    return this.clock;
  }

  private broadcast(frame: unknown): void {
    const message = JSON.stringify(frame);
    for (const socket of this.sockets) socket.send(message);
  }

  private synchronize(payload: unknown): Record<string, unknown> {
    const request = (payload ?? {}) as Record<string, SyncBody>;
    const response: Record<string, unknown> = {};
    for (const [table, body] of Object.entries(request)) {
      if (body.findLastDeleted) {
        response[table] = { created: [], deleted: [], lastSyncDate: {} };
        continue;
      }
      const start = Number(body.created?.startTime ?? 0);
      const startId = Number(body.created?.startId ?? 0);
      const created = this.rows(table).filter(
        (row) => row.createdAt > start || (row.createdAt === start && row.id > startId)
      );
      response[table] = { created, deleted: [] };
    }
    return response;
  }

  private audit(payload: unknown): Record<string, unknown> {
    const request = (payload ?? {}) as { findLast?: boolean; endId?: number };
    if (request.findLast) return { info: [], watermarkId: 0 };
    return { info: [], nextCursorId: Number(request.endId ?? 0) };
  }
}

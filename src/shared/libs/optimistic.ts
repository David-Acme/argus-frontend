import type { RemoteRowTable, TableName } from '@/core/types';
import { OPTIMISTIC_SETTLE_GRACE_MS, OPTIMISTIC_TTL_MS } from '@/shared/constants';

export type OptimisticKind = 'create' | 'update' | 'delete';

export type OptimisticTable = TableName | RemoteRowTable;

export type OptimisticValues = Readonly<Record<string, unknown>>;

export type OptimisticIntent = {
  readonly id: string;
  readonly table: OptimisticTable;
  readonly kind: OptimisticKind;
  readonly recordId: string;
  readonly values: OptimisticValues;
  readonly confirmed: boolean;
};

export type OptimisticIntentInput<V extends object = OptimisticValues> = {
  table: OptimisticTable;
  kind: OptimisticKind;
  recordId?: string;
  values?: V;
};

export type OptimisticLens<Row> = {
  table: OptimisticTable;
  prepend?: boolean;
  recordIdOf: (row: Row) => string | null;
  patch: (row: Row, values: OptimisticValues) => Row;
  create?: (recordId: string, values: OptimisticValues) => Row | null;
};

export type TypedOptimisticLens<Row, V extends object> = {
  table: OptimisticTable;
  prepend?: boolean;
  recordIdOf: (row: Row) => string | null;
  patch: (row: Row, values: Partial<V>) => Row;
  create?: (recordId: string, values: Partial<V>) => Row | null;
};

type Located<Row> = { key: string; lens: OptimisticLens<Row> };

export type OptimisticSchedule = (run: () => void, delayMs: number) => () => void;

export type OptimisticRegistryOptions = {
  schedule: OptimisticSchedule;
  ttlMs: number;
  graceMs: number;
};

export function defineLens<Row, V extends object>(
  lens: TypedOptimisticLens<Row, V>
): OptimisticLens<Row> {
  return lens as unknown as OptimisticLens<Row>;
}

const PENDING_PREFIX = 'pending-';

export function isPendingRecordId(recordId: string): boolean {
  return recordId.startsWith(PENDING_PREFIX);
}

export function intentKey(table: OptimisticTable, recordId: string): string {
  return `${table}:${recordId}`;
}

function shallowEqual<T>(left: T, right: T): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null)
    return false;
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

function locate<Row>(row: Row, lenses: readonly OptimisticLens<Row>[]): Located<Row> | null {
  for (const lens of lenses) {
    const recordId = lens.recordIdOf(row);
    if (recordId != null) return { key: intentKey(lens.table, recordId), lens };
  }
  return null;
}

function groupByKey(intents: readonly OptimisticIntent[]): Map<string, OptimisticIntent[]> {
  const groups = new Map<string, OptimisticIntent[]>();
  for (const intent of intents) {
    const key = intentKey(intent.table, intent.recordId);
    const group = groups.get(key);
    if (group) group.push(intent);
    else groups.set(key, [intent]);
  }
  return groups;
}

function relevantIntents<Row>(
  intents: readonly OptimisticIntent[],
  lenses: readonly OptimisticLens<Row>[]
): OptimisticIntent[] {
  if (intents.length === 0 || lenses.length === 0) return [];
  const tables = new Set(lenses.map((lens) => lens.table));
  return intents.filter((intent) => tables.has(intent.table));
}

function patchThrough<Row>(
  row: Row,
  group: readonly OptimisticIntent[],
  lens: OptimisticLens<Row>
): Row | null {
  let next = row;
  for (const intent of group) {
    if (intent.kind === 'delete') return null;
    if (intent.kind === 'update') next = lens.patch(next, intent.values);
  }
  return shallowEqual(next, row) ? row : next;
}

function mirrorsCreate<Row>(
  row: Row,
  lens: OptimisticLens<Row>,
  values: OptimisticValues
): boolean {
  const recordId = lens.recordIdOf(row);
  if (recordId == null || !lens.create) return false;
  const expected = lens.create(recordId, values);
  return expected != null && shallowEqual(expected, row);
}

export function applyIntents<Row>(
  rows: readonly Row[],
  intents: readonly OptimisticIntent[],
  lenses: readonly OptimisticLens<Row>[],
  compare?: (left: Row, right: Row) => number
): readonly Row[] {
  const relevant = relevantIntents(intents, lenses);
  if (relevant.length === 0) return rows;
  const groups = groupByKey(relevant);
  const present = new Set<string>();
  const merged: Row[] = [];
  const leading: Row[] = [];
  let changed = false;

  for (const row of rows) {
    const located = locate(row, lenses);
    const group = located ? groups.get(located.key) : undefined;
    if (located) present.add(located.key);
    if (!located || !group) {
      merged.push(row);
      continue;
    }
    const next = patchThrough(row, group, located.lens);
    if (next !== row) changed = true;
    if (next !== null) merged.push(next);
  }

  for (const intent of relevant) {
    if (intent.kind !== 'create') continue;
    const key = intentKey(intent.table, intent.recordId);
    if (present.has(key)) continue;
    const lens = lenses.find((candidate) => candidate.table === intent.table && candidate.create);
    const created = lens?.create?.(intent.recordId, intent.values);
    if (!lens || created == null) continue;
    if (!intent.confirmed && rows.some((row) => mirrorsCreate(row, lens, intent.values))) continue;
    const next = patchThrough(created, groups.get(key) ?? [], lens);
    present.add(key);
    if (next === null) continue;
    if (lens.prepend) leading.unshift(next);
    else merged.push(next);
    changed = true;
  }

  if (!changed) return rows;
  const combined = leading.length > 0 ? [...leading, ...merged] : merged;
  return compare ? combined.sort(compare) : combined;
}

export function settledIntents<Row>(
  rows: readonly Row[],
  intents: readonly OptimisticIntent[],
  lenses: readonly OptimisticLens<Row>[]
): string[] {
  const relevant = relevantIntents(intents, lenses);
  if (relevant.length === 0) return [];
  const base = new Map<string, { row: Row; lens: OptimisticLens<Row> }>();
  for (const row of rows) {
    const located = locate(row, lenses);
    if (located) base.set(located.key, { row, lens: located.lens });
  }
  const settled: string[] = [];
  for (const [key, group] of groupByKey(relevant)) {
    const synced = base.get(key);
    for (const intent of group) {
      if (!intent.confirmed || !synced || intent.kind === 'delete') break;
      if (
        intent.kind === 'update' &&
        !shallowEqual(synced.lens.patch(synced.row, intent.values), synced.row)
      )
        break;
      settled.push(intent.id);
    }
  }
  return settled;
}

export function pendingKeys(intents: readonly OptimisticIntent[]): ReadonlySet<string> {
  return new Set(
    intents
      .filter((intent) => !intent.confirmed)
      .map((intent) => intentKey(intent.table, intent.recordId))
  );
}

export function isPendingRow<Row>(
  row: Row,
  pending: ReadonlySet<string>,
  lenses: readonly OptimisticLens<Row>[]
): boolean {
  if (pending.size === 0) return false;
  const located = locate(row, lenses);
  return located != null && pending.has(located.key);
}

export class OptimisticRegistry {
  private intents: readonly OptimisticIntent[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly timers = new Map<string, () => void>();
  private readonly settling = new Set<string>();
  private sequence = 0;
  private session: string | null = null;

  constructor(private readonly options: OptimisticRegistryOptions) {}

  readonly snapshot = (): readonly OptimisticIntent[] => this.intents;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  begin<V extends object>(input: OptimisticIntentInput<V>): OptimisticIntent {
    this.sequence += 1;
    const id = `intent-${this.sequence}`;
    const intent: OptimisticIntent = {
      id,
      table: input.table,
      kind: input.kind,
      recordId: input.recordId ?? `${PENDING_PREFIX}${id}`,
      values: (input.values ?? {}) as OptimisticValues,
      confirmed: false,
    };
    this.publish([...this.intents, intent]);
    return intent;
  }

  confirm(id: string, recordId?: string): void {
    const current = this.intents.find((intent) => intent.id === id);
    if (!current || current.confirmed) return;
    const confirmed: OptimisticIntent = {
      ...current,
      confirmed: true,
      recordId: current.kind === 'create' && recordId ? recordId : current.recordId,
    };
    this.publish(this.intents.map((intent) => (intent.id === id ? confirmed : intent)));
    this.expireAfter(id, this.options.ttlMs);
  }

  rollback(id: string): void {
    this.drop([id]);
  }

  settle(ids: readonly string[]): void {
    for (const id of ids) {
      if (this.settling.has(id)) continue;
      this.settling.add(id);
      this.expireAfter(id, this.options.graceMs);
    }
  }

  bindSession(session: string | null): void {
    if (session === this.session) return;
    this.session = session;
    this.clear();
  }

  clear(): void {
    for (const cancel of this.timers.values()) cancel();
    this.timers.clear();
    this.settling.clear();
    if (this.intents.length > 0) this.publish([]);
  }

  private expireAfter(id: string, delayMs: number): void {
    this.timers.get(id)?.();
    this.timers.set(
      id,
      this.options.schedule(() => this.drop([id]), delayMs)
    );
  }

  private drop(ids: readonly string[]): void {
    const removed = new Set(ids);
    for (const id of ids) {
      this.timers.get(id)?.();
      this.timers.delete(id);
      this.settling.delete(id);
    }
    const next = this.intents.filter((intent) => !removed.has(intent.id));
    if (next.length !== this.intents.length) this.publish(next);
  }

  private publish(next: readonly OptimisticIntent[]): void {
    this.intents = next;
    for (const listener of this.listeners) listener();
  }
}

const scheduleTimeout: OptimisticSchedule = (run, delayMs) => {
  const handle = setTimeout(run, delayMs);
  return () => clearTimeout(handle);
};

export const optimisticRegistry = new OptimisticRegistry({
  schedule: scheduleTimeout,
  ttlMs: OPTIMISTIC_TTL_MS,
  graceMs: OPTIMISTIC_SETTLE_GRACE_MS,
});

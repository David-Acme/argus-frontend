import { z } from 'zod';
import type { GuardMode, VoiceAction, VoiceActionOutcome } from '@/core/types';
import { GUARD_MODES } from '@/shared/constants';
import { holdTalkInline } from '@/features/voice/model/hold-talk';

export type ArgusResultStatus = 'pending' | 'done' | 'failed';

type ResultBase = { id: string; at: number; status: ArgusResultStatus };

export type CameraResult = ResultBase & { kind: 'camera'; cameraId: string | null; name: string };

export type ScreenResult = ResultBase & { kind: 'screen'; screen: string; module: string | null };

export type ReminderResult = ResultBase & {
  kind: 'reminder';
  asking: boolean;
  title: string;
  remindAt: number;
};

export type EventMovedResult = ResultBase & {
  kind: 'event-moved';
  eventId: string;
  title: string;
  startsAt: number;
  endsAt: number | null;
  previousStartsAt: number;
  previousEndsAt: number | null;
};

export type GuardModeResult = ResultBase & {
  kind: 'guard-mode';
  mode: GuardMode;
  previousMode: GuardMode | null;
  environmentId: number | null;
  environmentName: string | null;
};

export type AgendaDayItem = {
  id: string;
  title: string;
  startsAt: number;
  allDay: boolean;
  kind: 'event' | 'task' | 'reminder';
};

export type AgendaDayResult = ResultBase & {
  kind: 'agenda-day';
  day: number;
  items: readonly AgendaDayItem[];
};

export type ArgusResult =
  | CameraResult
  | ScreenResult
  | ReminderResult
  | EventMovedResult
  | GuardModeResult
  | AgendaDayResult;

export type ArgusResultKind = ArgusResult['kind'];

const SECOND_MS = 1000;

const seconds = z.number().int().positive();

const text = z.string().trim().min(1).max(200);

const recordId = z.union([z.string().min(1), z.number().int().positive()]).transform(String);

const guardMode = z.enum(GUARD_MODES as [GuardMode, ...GuardMode[]]);

const reminderData = z.object({
  title: text,
  remindAt: seconds,
  confirm: z.boolean().optional(),
});

const eventMovedData = z.object({
  eventId: recordId,
  title: text,
  startsAt: seconds,
  endsAt: seconds.nullish(),
  previousStartsAt: seconds,
  previousEndsAt: seconds.nullish(),
});

const guardModeData = z.object({
  mode: guardMode,
  previousMode: guardMode.nullish(),
  environmentId: z.number().int().positive().nullish(),
  environmentName: text.nullish(),
});

const agendaDayData = z.object({
  day: seconds,
  items: z
    .array(
      z.object({
        id: recordId,
        title: text,
        startsAt: seconds,
        allDay: z.boolean().optional(),
        kind: z.enum(['event', 'task', 'reminder']).catch('event'),
      })
    )
    .max(50),
});

const moduleData = z.object({ module: z.string().regex(/^[a-z0-9-]+$/) });

const resultFrame = z.object({
  id: recordId,
  tool: z.string(),
  ok: z.boolean(),
  data: z.record(z.string(), z.unknown()),
});

type ResultFrame = z.infer<typeof resultFrame>;

type Base = Pick<ResultBase, 'id' | 'at'>;

const ms = (value: number): number => value * SECOND_MS;

const msOrNull = (value: number | null | undefined): number | null =>
  value === null || value === undefined ? null : ms(value);

function reminderOf(frame: ResultFrame, base: Base): ReminderResult | null {
  const data = reminderData.safeParse(frame.data);
  if (!data.success) return null;
  const asking = data.data.confirm === true;
  return {
    ...base,
    kind: 'reminder',
    status: asking ? 'pending' : 'done',
    asking,
    title: data.data.title,
    remindAt: ms(data.data.remindAt),
  };
}

function eventMovedOf(frame: ResultFrame, base: Base): EventMovedResult | null {
  const data = eventMovedData.safeParse(frame.data);
  if (!data.success) return null;
  const { eventId, title, startsAt, endsAt, previousStartsAt, previousEndsAt } = data.data;
  return {
    ...base,
    kind: 'event-moved',
    status: 'done',
    eventId,
    title,
    startsAt: ms(startsAt),
    endsAt: msOrNull(endsAt),
    previousStartsAt: ms(previousStartsAt),
    previousEndsAt: msOrNull(previousEndsAt),
  };
}

function guardModeOf(frame: ResultFrame, base: Base): GuardModeResult | null {
  const data = guardModeData.safeParse(frame.data);
  if (!data.success) return null;
  return {
    ...base,
    kind: 'guard-mode',
    status: 'done',
    mode: data.data.mode,
    previousMode: data.data.previousMode ?? null,
    environmentId: data.data.environmentId ?? null,
    environmentName: data.data.environmentName ?? null,
  };
}

function agendaDayOf(frame: ResultFrame, base: Base): AgendaDayResult | null {
  const data = agendaDayData.safeParse(frame.data);
  if (!data.success) return null;
  return {
    ...base,
    kind: 'agenda-day',
    status: 'done',
    day: ms(data.data.day),
    items: data.data.items.map((item) => ({
      id: item.id,
      title: item.title,
      startsAt: ms(item.startsAt),
      allDay: item.allDay === true,
      kind: item.kind,
    })),
  };
}

function moduleOf(frame: ResultFrame, base: Base): ScreenResult | null {
  const data = moduleData.safeParse(frame.data);
  if (!data.success) return null;
  return { ...base, kind: 'screen', status: 'done', screen: 'modules', module: data.data.module };
}

const FRAME_READERS: Readonly<
  Record<string, (frame: ResultFrame, base: Base) => ArgusResult | null>
> = {
  'memory.remind': reminderOf,
  'calendar.move_event': eventMovedOf,
  'app.set_guard_mode': guardModeOf,
  'calendar.list_events': agendaDayOf,
  'modules.enable': moduleOf,
};

export function resultOfFrame(payload: unknown, at: number): ArgusResult | null {
  const frame = resultFrame.safeParse(payload);
  if (!frame.success || !frame.data.ok) return null;
  const read = FRAME_READERS[frame.data.tool];
  return read ? read(frame.data, { id: `result:${frame.data.id}`, at }) : null;
}

const argumentText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function resultOfAction(action: VoiceAction, at: number): ArgusResult | null {
  const base = { id: `action:${action.id}`, at, status: 'pending' as const };
  if (action.name === 'app.show_camera')
    return { ...base, kind: 'camera', cameraId: null, name: argumentText(action.arguments.camera) };
  if (action.name === 'app.open') {
    const module = argumentText(action.arguments.module);
    return {
      ...base,
      kind: 'screen',
      screen: argumentText(action.arguments.screen),
      module: module || null,
    };
  }
  return null;
}

export type ActionSettlement = {
  outcome: VoiceActionOutcome;
  cameraId?: string | null;
  cameraName?: string;
};

export type CameraPlacement = 'call' | 'thread' | 'screen';

export type CameraPlacementInput = { inCall: boolean; path: string };

const CALL_PATH = '/call';

export function cameraPlacementOf({ inCall, path }: CameraPlacementInput): CameraPlacement {
  if (inCall && path === CALL_PATH) return 'call';
  return holdTalkInline(path) ? 'thread' : 'screen';
}

export function settleResult(result: ArgusResult, settlement: ActionSettlement): ArgusResult {
  const status = settlement.outcome.ok ? 'done' : 'failed';
  if (result.kind !== 'camera') return { ...result, status };
  return {
    ...result,
    status,
    cameraId: settlement.cameraId ?? result.cameraId,
    name: settlement.cameraName ?? result.name,
  };
}

export function answeredOffer(result: ArgusResult, accepted: boolean): ArgusResult {
  if (result.kind !== 'reminder' || !result.asking) return result;
  return { ...result, asking: false, status: accepted ? 'done' : 'failed' };
}

export function upsertResult(
  results: readonly ArgusResult[],
  result: ArgusResult,
  kept: number
): readonly ArgusResult[] {
  const index = results.findIndex((current) => current.id === result.id);
  if (index >= 0) return results.map((current, at) => (at === index ? result : current));
  const next = [...results, result];
  return next.length > kept ? next.slice(next.length - kept) : next;
}

export function shownResults(results: readonly ArgusResult[]): ArgusResult[] {
  return results.filter((result) => result.status !== 'failed' || result.kind === 'camera');
}

export function liveCameraResultId(results: readonly ArgusResult[]): string | null {
  const latest = results.findLast(
    (result) => result.kind === 'camera' && result.status === 'done' && result.cameraId !== null
  );
  return latest?.id ?? null;
}

export function callResultOf(results: readonly ArgusResult[], since: number): ArgusResult | null {
  return shownResults(results).findLast((result) => result.at >= since) ?? null;
}

export function doneResults(results: readonly ArgusResult[]): ArgusResult[] {
  return results.filter((result) => result.status === 'done').reverse();
}

import type {
  ICalendarEventCreate,
  ICalendarEventUpdate,
  IProjectTaskCreate,
} from '@/core/interfaces';
import type { AgendaItem, AgendaKind, RecurrenceFrequency } from '@/core/types';
import { formatRecurrenceRule, parseRecurrenceRule } from '@/shared/libs/recurrence';
import { clockAt, clockText, parseClock } from '@/features/agenda/model/clock-text';
import type { ClockText } from '@/features/agenda/model/clock-text';
import { EVENT_TITLE_MAX } from '@/features/agenda/constants/agenda.constant';

export type EditScope = 'one' | 'series';

export type ItemKind = Exclude<AgendaKind, 'reminder'>;

export type RepeatChoice = 'none' | RecurrenceFrequency;

export type ItemDraft = {
  kind: ItemKind;
  title: string;
  day: number;
  time: string;
  end: string;
  allDay: boolean;
  repeat: RepeatChoice;
  place: string;
  project: string;
  notes: string;
};

export type DraftProblem = 'title' | 'title-long' | 'time' | 'end' | 'project';

export type DraftDate = ClockText & { startOfDay: (value: Date) => Date };

export type Moment = { start: number; end: number | null };

export type NewDraftInput = { kind: ItemKind; day: number; at: number; project: string };

const SECOND_MS = 1000;

const seconds = (ms: number): number => Math.round(ms / SECOND_MS);

export function newDraft({ kind, day, at, project }: NewDraftInput, date: DraftDate): ItemDraft {
  return {
    kind,
    title: '',
    day: date.startOfDay(new Date(day)).getTime(),
    time: clockText(at, date),
    end: '',
    allDay: false,
    repeat: 'none',
    place: '',
    project,
    notes: '',
  };
}

const notesOf = (item: AgendaItem): string =>
  item.origin.kind === 'entry' ? (item.origin.entry.description ?? '') : '';

const projectOf = (item: AgendaItem): string =>
  item.origin.kind === 'entry' ? (item.origin.entry.projectId ?? '') : '';

const repeatOf = (rule: string | null): RepeatChoice =>
  parseRecurrenceRule(rule)?.frequency ?? 'none';

export function draftFrom(item: AgendaItem, date: DraftDate): ItemDraft {
  return {
    kind: item.kind === 'task' ? 'task' : 'event',
    title: item.title,
    day: date.startOfDay(new Date(item.startsAt)).getTime(),
    time: clockText(item.startsAt, date),
    end: item.endsAt !== null && item.endsAt > item.startsAt ? clockText(item.endsAt, date) : '',
    allDay: item.allDay,
    repeat: repeatOf(item.repeat),
    place: item.place ?? '',
    project: projectOf(item),
    notes: notesOf(item),
  };
}

const timed = (draft: ItemDraft): boolean => draft.kind === 'event' && !draft.allDay;

function endProblem(draft: ItemDraft): boolean {
  if (draft.kind !== 'event' || draft.allDay || draft.end.trim() === '') return false;
  const start = parseClock(draft.time);
  const end = parseClock(draft.end);
  return end === null || (start !== null && end <= start);
}

export function draftProblems(draft: ItemDraft): DraftProblem[] {
  const title = draft.title.trim();
  const problems: DraftProblem[] = [];
  if (title === '') problems.push('title');
  else if (title.length > EVENT_TITLE_MAX) problems.push('title-long');
  if (timed(draft) && parseClock(draft.time) === null) problems.push('time');
  if (endProblem(draft)) problems.push('end');
  if (draft.kind === 'task' && draft.project === '') problems.push('project');
  return problems;
}

export function momentOf(draft: ItemDraft, date: DraftDate): Moment {
  if (!timed(draft)) return { start: draft.day, end: null };
  const start = clockAt(draft.day, parseClock(draft.time) ?? 0, date);
  const end = draft.kind === 'event' ? parseClock(draft.end) : null;
  return { start, end: end === null ? null : clockAt(draft.day, end, date) };
}

const ruleOf = (repeat: RepeatChoice): string | undefined =>
  repeat === 'none' ? undefined : formatRecurrenceRule({ frequency: repeat, interval: 1 });

export function eventCreate(draft: ItemDraft, { start, end }: Moment): ICalendarEventCreate {
  return {
    title: draft.title.trim(),
    location: draft.place.trim() || undefined,
    description: draft.notes.trim() || undefined,
    isAllDay: draft.allDay,
    startsAt: seconds(start),
    endsAt: end === null ? undefined : seconds(end),
    recurrenceRule: ruleOf(draft.repeat),
  };
}

export function eventUpdate(
  draft: ItemDraft,
  moment: Moment,
  saved: AgendaItem
): ICalendarEventUpdate {
  const { recurrenceRule, ...body } = eventCreate(draft, moment);
  return {
    ...body,
    location: body.location ?? (saved.place ? null : undefined),
    description: body.description ?? (notesOf(saved) ? null : undefined),
    endsAt: body.endsAt ?? (saved.endsAt === null ? undefined : null),
    ...(saved.repeat || !recurrenceRule ? {} : { recurrenceRule }),
  };
}

export const taskCreate = (draft: ItemDraft, { start }: Moment): IProjectTaskCreate => ({
  projectId: Number(draft.project),
  title: draft.title.trim(),
  dueAt: seconds(start),
});

export const scopesOf = (item: AgendaItem | null): readonly EditScope[] =>
  item?.repeat && item.kind === 'event' ? ['one', 'series'] : [];

export function draftDirty(draft: ItemDraft, start: ItemDraft): string | boolean {
  const changed = (Object.keys(draft) as (keyof ItemDraft)[]).some(
    (key) => key !== 'kind' && draft[key] !== start[key]
  );
  if (!changed) return false;
  return draft.title.trim() || true;
}

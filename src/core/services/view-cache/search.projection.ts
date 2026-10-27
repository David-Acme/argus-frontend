import type {
  CalendarEventModel,
  CameraModel,
  ProjectModel,
  ProjectTaskModel,
  UserModel,
} from '@/core/database';
import type { ISearchHitCacheRow } from '@/core/interfaces';
import type { KeysetPage, PagedRows } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import { matchesWords } from '@/shared/libs/text-search';
import type { ViewWrite } from './projection';

type HitFields = Pick<ISearchHitCacheRow, 'kind' | 'id' | 'title' | 'at'> &
  Partial<ISearchHitCacheRow>;

const hit = (fields: HitFields): ISearchHitCacheRow => ({
  allDay: false,
  parentId: null,
  recurrenceRule: null,
  ...fields,
});

export type EventHitSource = Pick<
  CalendarEventModel,
  'id' | 'title' | 'startsAt' | 'isAllDay' | 'recurrenceRule'
>;

export const eventHit = (event: EventHitSource): ISearchHitCacheRow =>
  hit({
    kind: 'event',
    id: event.id,
    title: event.title,
    at: event.startsAt.getTime(),
    allDay: event.isAllDay,
    recurrenceRule: event.recurrenceRule || null,
  });

export const taskHit = (
  task: Pick<ProjectTaskModel, 'id' | 'title' | 'dueAt' | 'projectId'>
): ISearchHitCacheRow =>
  hit({
    kind: 'task',
    id: task.id,
    title: task.title,
    at: task.dueAt?.getTime() ?? null,
    parentId: task.projectId,
  });

export const projectHit = (project: Pick<ProjectModel, 'id' | 'name'>): ISearchHitCacheRow =>
  hit({ kind: 'project', id: project.id, title: project.name, at: null });

export const personHit = (user: Pick<UserModel, 'id' | 'name' | 'lastName'>): ISearchHitCacheRow =>
  hit({
    kind: 'person',
    id: user.id,
    title: [user.name, user.lastName].filter(Boolean).join(' '),
    at: null,
  });

export const cameraHit = (camera: Pick<CameraModel, 'id' | 'name'>): ISearchHitCacheRow =>
  hit({ kind: 'camera', id: camera.id, title: camera.name, at: null });

export function projectSearch(
  page: KeysetPage<ISearchHitCacheRow>,
  scope: string,
  words: readonly string[]
): ViewWrite[] {
  const value: PagedRows<ISearchHitCacheRow> = {
    rows: page.rows.filter((row) => matchesWords(row.title, words)),
    hasMore: page.hasMore,
  };
  return [{ key: VIEW_CACHE_KEYS.commandSearch, scope, value }];
}

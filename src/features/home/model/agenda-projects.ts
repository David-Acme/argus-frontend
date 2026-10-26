import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { DashboardProjectCard, TranslateFn } from '@/core/types';
import { isOpenTask } from '@/shared/libs/task-progress';

const CLOSED = new Set(['done', 'canceled']);

const PRIORITY = ['urgent', 'high', 'medium', 'low', 'none'];

const rank = (task: IProjectTaskCacheRow): number => {
  const index = PRIORITY.indexOf(task.priority);
  return index < 0 ? PRIORITY.length : index;
};

const byNext = (left: IProjectTaskCacheRow, right: IProjectTaskCacheRow): number =>
  (left.dueAt ?? Infinity) - (right.dueAt ?? Infinity) || rank(left) - rank(right);

export const openProjects = (
  cards: readonly DashboardProjectCard[],
  limit: number
): DashboardProjectCard[] => cards.filter((card) => !CLOSED.has(card.status)).slice(0, limit);

export function nextTask(tasks: readonly IProjectTaskCacheRow[]): IProjectTaskCacheRow | null {
  return tasks.filter(isOpenTask).sort(byNext)[0] ?? null;
}

export function projectMeta(
  card: Pick<DashboardProjectCard, 'done' | 'total'>,
  next: Pick<IProjectTaskCacheRow, 'title'> | null,
  t: TranslateFn
): string {
  if (card.total === 0) return t('screens.home.agenda-sections.project-empty');
  const progress = t('screens.home.agenda-sections.project-progress', {
    done: card.done,
    total: card.total,
  });
  return next
    ? t('screens.home.agenda-sections.project-next', { progress, task: next.title })
    : progress;
}

import { describe, expect, test } from 'bun:test';
import type { IReminderCacheRow, IReminderCacheSource } from '@/core/interfaces';
import { projectReminders } from '@/core/services/view-cache/reminder.projection';
import { applyIntents } from '@/shared/libs/optimistic';
import type { OptimisticIntent } from '@/shared/libs/optimistic';
import { byScheduled, REMINDER_LENSES } from '@/features/agenda/model/reminder-optimistic';

const NOW = Date.UTC(2026, 9, 6, 15, 0, 0);
const HOUR = 3_600_000;

const row = (patch: Partial<IReminderCacheRow> = {}): IReminderCacheRow => ({
  id: '1',
  title: 'Llamar al médico',
  description: '',
  scheduledAt: NOW + HOUR,
  isCompleted: false,
  completedAt: null,
  recurrenceRule: null,
  ...patch,
});

const intentFor = (patch: Partial<OptimisticIntent>): OptimisticIntent => ({
  id: 'i1',
  table: 'reminder',
  kind: 'update',
  recordId: '1',
  values: {},
  confirmed: false,
  ...patch,
});

describe('reminder projection and optimistic rows', () => {
  const source = (patch: Partial<IReminderCacheSource> = {}): IReminderCacheSource => ({
    id: '1',
    title: 'Llamar al médico',
    description: 'Pedir cita',
    scheduledAt: new Date(NOW + HOUR),
    isCompleted: false,
    completedAt: null,
    recurrenceRule: null,
    ...patch,
  });

  test('writes one flat list in milliseconds with the notes and the completion time', () => {
    const [write] = projectReminders({
      reminders: [source(), source({ id: '2', isCompleted: true, completedAt: new Date(NOW) })],
    });
    expect(write && 'rows' in write ? write.rows : null).toEqual([
      row({ description: 'Pedir cita', recurrenceExceptions: [] }),
      row({
        id: '2',
        description: 'Pedir cita',
        isCompleted: true,
        completedAt: NOW,
        recurrenceExceptions: [],
      }),
    ]);
  });

  test('completing shows at once, deleting removes the row and a create never shows: Argus alone creates reminders', () => {
    const rows = [row(), row({ id: '2', scheduledAt: NOW + 2 * HOUR })];
    const done = applyIntents(
      rows,
      [intentFor({ values: { isCompleted: true } })],
      REMINDER_LENSES,
      byScheduled
    );
    expect(done[0]?.isCompleted).toBe(true);
    expect(done[0]?.completedAt).not.toBeNull();
    const gone = applyIntents(rows, [intentFor({ kind: 'delete' })], REMINDER_LENSES, byScheduled);
    expect(gone.map((item) => item.id)).toEqual(['2']);
    const created = applyIntents(
      rows,
      [
        intentFor({
          kind: 'create',
          recordId: 'pending-9',
          values: { title: 'Nuevo', scheduledAt: Math.round((NOW + 90 * 60_000) / 1000) },
        }),
      ],
      REMINDER_LENSES,
      byScheduled
    );
    expect(created.map((item) => item.id)).toEqual(['1', '2']);
  });

  test('an edit changes the title and the time on the row while the server answers', () => {
    const edited = applyIntents(
      [row()],
      [
        intentFor({
          values: {
            title: 'Nuevo título',
            scheduledAt: Math.round((NOW + 5 * HOUR) / 1000),
            description: null,
          },
        }),
      ],
      REMINDER_LENSES
    );
    expect(edited[0]).toMatchObject({
      title: 'Nuevo título',
      scheduledAt: NOW + 5 * HOUR,
      description: '',
    });
  });
});

import { useCallback, useState } from 'react';
import type { IReminderCacheRow } from '@/core/interfaces';
import { storageService } from '@/core/services/storage';
import { useAuthStore } from '@/core/stores';
import { REMINDER_SNOOZED_KEY } from '@/features/reminders/constants/snooze';
import { isSnoozedNow, withSnooze, type SnoozedReminders } from '@/features/reminders/model/reminder-snooze';

function readMemory(key: string): SnoozedReminders {
  try {
    return storageService.getObject<SnoozedReminders>(key) ?? {};
  } catch {
    return {};
  }
}

export function useSnoozedReminders(rows: readonly IReminderCacheRow[]) {
  const userId = useAuthStore((state) => state.user?.id);
  const key = `${REMINDER_SNOOZED_KEY}${userId ?? 'anonymous'}`;
  const [memory, setMemory] = useState<{ key: string; value: SnoozedReminders }>(() => ({ key, value: readMemory(key) }));
  const current = memory.key === key ? memory.value : readMemory(key);

  const record = useCallback(
    (id: string, at: number) => {
      const next = withSnooze({ memory: current, id, at, rows });
      setMemory({ key, value: next });
      storageService.setObject(key, next);
    },
    [current, key, rows]
  );

  const isSnoozed = useCallback((row: IReminderCacheRow) => isSnoozedNow(current, row), [current]);

  return { isSnoozed, record };
}

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { IReminderCacheRow } from '@/core/interfaces';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ReminderDialog } from '@/features/reminders/components/reminder-dialog';
import { ReminderRow } from '@/features/reminders/components/reminder-row';
import { useReminders } from '@/features/reminders/hooks/use-reminders';
import { matchesReminder } from '@/features/reminders/model/reminder-rows';

type RemindersSectionProps = {
  query: string;
};

const CLOCK_TICK_MS = 60_000;

export function RemindersSection({ query }: RemindersSectionProps) {
  const { t } = useTranslation();
  const now = useNow(CLOCK_TICK_MS);
  const { has } = useCapabilities();
  const { groups, complete, remove } = useReminders();
  const [editing, setEditing] = useState<IReminderCacheRow | null>(null);
  const [showDone, setShowDone] = useState(false);

  if (!has(CAPABILITY.remindersRead)) return null;

  const editable = has(CAPABILITY.remindersWrite);
  const searching = query.trim().length > 0;
  const pending = groups.pending.filter((row) => matchesReminder(row, query));
  const done = groups.done.filter((row) => matchesReminder(row, query));
  const empty = pending.length === 0 && (searching || done.length === 0);

  const row = (reminder: IReminderCacheRow) => (
    <ReminderRow
      key={reminder.id}
      reminder={reminder}
      now={now}
      editable={editable}
      onToggle={(target, isDone) => void complete(target, isDone)}
      onEdit={setEditing}
      onDelete={(target) => void remove(target)}
    />
  );

  return (
    <View className="gap-3">
      <SectionHeader title={t('screens.reminders.title')} count={groups.pending.length} />
      {empty ? (
        <EmptyState
          fill={false}
          className="bg-card rounded-3xl py-8"
          icon="bell"
          title={searching ? t('screens.reminders.no-matches') : t('screens.reminders.empty')}
          hint={searching ? undefined : t('screens.reminders.empty-hint')}
        />
      ) : (
        <Panel className="gap-0.5 p-2">
          {pending.map(row)}
          {done.length > 0 ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showDone }}
                onPress={() => setShowDone((value) => !value)}
                className="min-h-11 flex-row items-center gap-2 rounded-2xl px-3 active:opacity-70">
                <Icon name={showDone ? 'chevron-up' : 'chevron-down'} className="text-muted-foreground size-4" />
                <Text variant="label" className="text-foreground-secondary">
                  {showDone ? t('screens.reminders.hide-done') : t('screens.reminders.show-done')}
                </Text>
              </Pressable>
              {showDone ? done.map(row) : null}
            </>
          ) : null}
        </Panel>
      )}
      {editing ? (
        <ReminderDialog
          key={editing.id}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          reminder={editing}
        />
      ) : null}
    </View>
  );
}

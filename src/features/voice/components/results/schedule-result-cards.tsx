import { clsx } from 'clsx';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import { AGENDA_BAR_CLASSES } from '@/features/voice/constants/result.constant';
import type { ResultActions } from '@/features/voice/hooks/use-result-actions';
import { useResultWhen } from '@/features/voice/hooks/use-result-when';
import type {
  AgendaDayItem,
  AgendaDayResult,
  EventMovedResult,
  ReminderResult,
} from '@/features/voice/model/argus-result';
import { countWordOf } from '@/features/voice/model/result-day';
import {
  ResultActionsRow,
  ResultHead,
  ResultShell,
} from '@/features/voice/components/results/result-shell';

export type ScheduleCardProps<R> = { result: R; actions: ResultActions; now: number };

type AgendaLineProps = { item: AgendaDayItem; time: string };

function useReminderState(result: ReminderResult): string | null {
  const { t } = useTranslation();
  if (result.asking) return null;
  if (result.status === 'done') return t('screens.voice.results.reminder-set');
  if (result.status === 'failed') return t('screens.voice.results.reminder-dropped');
  return result.answer === 'yes'
    ? t('screens.voice.results.answered-yes')
    : t('screens.voice.results.answered-no');
}

export function ReminderResultCard({ result, actions, now }: ScheduleCardProps<ReminderResult>) {
  const { t } = useTranslation();
  const when = useResultWhen(now);
  const { answer } = actions;
  const state = useReminderState(result);
  const meta =
    state === null ? when.whenOf(result.remindAt) : `${when.whenOf(result.remindAt)} · ${state}`;
  return (
    <ResultShell surface={actions.surface} label={result.title}>
      <ResultHead
        icon="bell"
        tone={!result.asking && result.status === 'done' ? 'ok' : 'accent'}
        title={result.title}
        meta={meta}
      />
      {result.asking ? (
        <ResultActionsRow>
          <Button
            compact
            variant="primary"
            label={t('screens.voice.results.yes')}
            onPress={() => answer(result, true)}
          />
          <Button
            compact
            label={t('screens.voice.results.no')}
            onPress={() => answer(result, false)}
          />
        </ResultActionsRow>
      ) : null}
    </ResultShell>
  );
}

export function EventMovedCard({ result, actions, now }: ScheduleCardProps<EventMovedResult>) {
  const { t } = useTranslation();
  const when = useResultWhen(now);
  const meta = t('screens.voice.results.event-was', {
    when: when.rangeOf(result.startsAt, result.endsAt),
    before: when.whenOf(result.previousStartsAt).toLocaleLowerCase(),
  });
  return (
    <ResultShell surface={actions.surface} label={result.title}>
      <ResultHead icon="cal" title={result.title} meta={meta} />
      <ResultActionsRow>
        <Button
          compact
          label={t('screens.voice.results.open')}
          onPress={() => actions.openAgenda(result.startsAt)}
        />
        <Button
          compact
          icon="refresh"
          label={t('screens.voice.results.undo')}
          onPress={() => actions.undoEvent(result)}
        />
      </ResultActionsRow>
    </ResultShell>
  );
}

function AgendaLine({ item, time }: AgendaLineProps) {
  return (
    <View className="border-line min-h-row flex-row items-center gap-3 border-t px-4 py-2">
      <View className="w-12">
        <Text variant="rowMeta" tone="2">
          {time}
        </Text>
      </View>
      <View
        className={clsx('w-event-bar self-stretch rounded-full', AGENDA_BAR_CLASSES[item.kind])}
      />
      <View className="min-w-0 flex-1">
        <Text variant="rowTitle" numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </View>
  );
}

export function AgendaDayCard({ result, actions, now }: ScheduleCardProps<AgendaDayResult>) {
  const { t } = useTranslation();
  const when = useResultWhen(now);
  const count = countWordOf(result.items.length);
  const meta =
    count === 'none'
      ? t('screens.voice.results.agenda-none')
      : count === 'one'
        ? t('screens.voice.results.agenda-one')
        : t('screens.voice.results.agenda-many', { count: String(result.items.length) });
  const title = when.dayOf(result.day);
  return (
    <ResultShell surface={actions.surface} label={`${title}. ${meta}`}>
      <ResultHead icon="cal" title={title} meta={meta} />
      {result.items.map((item) => (
        <AgendaLine
          key={item.id}
          item={item}
          time={item.allDay ? t('screens.voice.results.all-day') : when.timeOf(item.startsAt)}
        />
      ))}
      <View className="pt-3">
        <ResultActionsRow>
          <Button
            compact
            label={t('screens.voice.results.open-agenda')}
            onPress={() => actions.openAgenda(result.day)}
          />
        </ResultActionsRow>
      </View>
    </ResultShell>
  );
}

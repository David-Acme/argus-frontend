import type { ResultActions } from '@/features/voice/hooks/use-result-actions';
import type { ArgusResult } from '@/features/voice/model/argus-result';
import { CameraResultCard } from '@/features/voice/components/results/camera-result-card';
import {
  GuardModeCard,
  ScreenResultCard,
} from '@/features/voice/components/results/home-result-cards';
import {
  AgendaDayCard,
  EventMovedCard,
  ReminderResultCard,
} from '@/features/voice/components/results/schedule-result-cards';

export type ArgusResultCardProps = {
  result: ArgusResult;
  live: boolean;
  now: number;
  actions: ResultActions;
};

export function ArgusResultCard({ result, live, now, actions }: ArgusResultCardProps) {
  switch (result.kind) {
    case 'camera':
      return <CameraResultCard result={result} live={live} actions={actions} />;
    case 'screen':
      return <ScreenResultCard result={result} actions={actions} />;
    case 'guard-mode':
      return <GuardModeCard result={result} actions={actions} />;
    case 'reminder':
      return <ReminderResultCard result={result} actions={actions} now={now} />;
    case 'event-moved':
      return <EventMovedCard result={result} actions={actions} now={now} />;
    case 'agenda-day':
      return <AgendaDayCard result={result} actions={actions} now={now} />;
  }
}

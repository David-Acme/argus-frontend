import type { TranslateFn, VoiceActionRecord, VoicePhase } from '@/core/types';
import type { PresenceState } from '@/shared/ui/presence';
import { CALL_ENDED_SUMMARY_ITEMS } from '@/features/voice/constants/call.constant';
import type { CallKind } from '@/features/voice/model/incoming-surface';
import { voiceErrorMessage } from '@/features/voice/model/voice-error';

export type StageMoment = 'live' | 'ended' | 'failed';

export type StageAura = 'alert' | 'listen' | null;

export type StageMomentInput = {
  phase: VoicePhase;
  endedDurationMs: number | null;
};

export type StagePresenceInput = {
  moment: StageMoment;
  phase: VoicePhase;
  kind: CallKind;
};

const PHASE_PRESENCE: Readonly<Record<VoicePhase, PresenceState>> = {
  idle: 'listen',
  connecting: 'listen',
  reconnecting: 'think',
  listening: 'listen',
  thinking: 'think',
  speaking: 'speak',
  done: 'idle',
  error: 'error',
};

const LIVE_PHASES: ReadonlySet<VoicePhase> = new Set(['listening', 'thinking', 'speaking']);

export function stageMomentOf({ phase, endedDurationMs }: StageMomentInput): StageMoment {
  if (endedDurationMs !== null) return 'ended';
  return phase === 'error' || phase === 'done' ? 'failed' : 'live';
}

export function stagePresenceOf({ moment, phase, kind }: StagePresenceInput): PresenceState {
  if (moment === 'ended') return 'idle';
  if (moment === 'failed') return PHASE_PRESENCE[phase];
  if (kind === 'alert' && phase !== 'speaking' && phase !== 'listening') return 'alert';
  return PHASE_PRESENCE[phase];
}

export function stageAuraOf({
  moment,
  kind,
}: Pick<StagePresenceInput, 'moment' | 'kind'>): StageAura {
  if (moment === 'ended') return null;
  if (kind === 'alert') return 'alert';
  return moment === 'live' ? 'listen' : null;
}

export function isLivePhase(phase: VoicePhase): boolean {
  return LIVE_PHASES.has(phase);
}

export function endedSummaryOf(actions: readonly VoiceActionRecord[]): VoiceActionRecord[] {
  return actions.filter((action) => action.status === 'done').slice(-CALL_ENDED_SUMMARY_ITEMS);
}

export function formatCallClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export type SummaryNoticeInput = {
  appActive: boolean;
  locked: boolean;
};

export function postsSummaryNotice({ appActive, locked }: SummaryNoticeInput): boolean {
  return !appActive || locked;
}

export function summaryBodyOf(labels: readonly string[], fallback: string): string {
  return labels.length > 0 ? labels.join(' · ') : fallback;
}

export type StageLineInput = {
  t: TranslateFn;
  moment: StageMoment;
  phase: VoicePhase;
  elapsedMs: number;
  connected: boolean;
  reason: string | null;
  endedDurationMs: number | null;
};

export type StageHintInput = {
  t: TranslateFn;
  phase: VoicePhase;
  error: string | null;
  muted: boolean;
  notice: string | null;
};

export function stageLineOf({
  t,
  moment,
  phase,
  elapsedMs,
  connected,
  reason,
  endedDurationMs,
}: StageLineInput): string {
  if (moment === 'ended') {
    return t('screens.voice.stage.ended-line', { time: formatCallClock(endedDurationMs ?? 0) });
  }
  if (moment === 'failed')
    return t(phase === 'error' ? 'screens.voice.status-error' : 'screens.voice.status-done');
  if (!connected && reason) return reason;
  return formatCallClock(elapsedMs);
}

export function stageHintOf({ t, phase, error, muted, notice }: StageHintInput): string | null {
  if (phase === 'error') return voiceErrorMessage(error, t);
  if (muted) return t('screens.voice.muted-hint');
  return notice;
}

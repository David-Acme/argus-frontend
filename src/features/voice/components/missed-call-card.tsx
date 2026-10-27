import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ScopedTheme } from 'uniwind';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { notificationService } from '@/core/services/notification.service';
import { CAPABILITY, NOTIFICATION_FEED_SCOPE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { usePagedView } from '@/shared/hooks/use-infinite-list';
import { useTranslation } from '@/shared/hooks/use-translation';
import { callBackHref } from '@/shared/libs/call-back';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import { CallAvatar } from '@/features/voice/components/call-avatar';
import {
  CALL_MINI_AVATAR,
  CALL_MISSED_TICK_MS,
  CALL_MISSED_WINDOW_MS,
} from '@/features/voice/constants/call.constant';
import { useCallFloat } from '@/features/voice/hooks/use-call-float';
import { useNow } from '@/features/voice/hooks/use-now';
import { useReminderCall } from '@/features/voice/hooks/use-reminder-call';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';
import { CALL_SCREEN_PATH } from '@/features/voice/model/incoming-surface';
import {
  latestMissedCall,
  minutesAgo,
  missedCallActions,
} from '@/features/voice/model/missed-call';
import type { MissedCall, MissedCallAction } from '@/features/voice/model/missed-call';

const HIDDEN_ON: readonly string[] = [CALL_SCREEN_PATH, '/notification', '/welcome', '/login'];

const ACTION_KEYS = {
  view: 'screens.voice.missed.view',
  'mark-done': 'screens.voice.missed.mark-done',
  'call-back': 'screens.voice.missed.call-back',
} as const;

type MissedViewProps = {
  missed: MissedCall;
  now: number;
  actions: readonly MissedCallAction[];
  onAct: (action: MissedCallAction) => Promise<void>;
};

function MissedView({ missed, now, actions, onAct }: MissedViewProps) {
  const { t } = useTranslation();
  const float = useCallFloat();
  const minutes = minutesAgo(missed.at, now);
  const age =
    minutes === 0
      ? t('screens.voice.missed.now')
      : t('screens.voice.missed.ago', { count: String(minutes) });
  return (
    <ScopedTheme theme="dark">
      <View
        role="alert"
        className="bg-surface rounded-sheet absolute inset-x-2 gap-3 self-center p-4"
        style={float}>
        <View className="flex-row items-center gap-3">
          <CallAvatar state="idle" size={CALL_MINI_AVATAR} />
          <View className="min-w-0 flex-1">
            <Text variant="label" numberOfLines={1}>
              {missed.title || t('screens.voice.missed.title')}
            </Text>
            <Text variant="rowMeta" tone="2" numberOfLines={2}>
              {[age, missed.body].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          {actions.map((action) => (
            <View key={action} className="flex-1">
              <Button
                label={t(ACTION_KEYS[action])}
                icon={action === 'call-back' ? 'phone' : undefined}
                variant={action === 'call-back' ? 'primary' : 'secondary'}
                onPress={() => onAct(action)}
                block
              />
            </View>
          ))}
        </View>
      </View>
    </ScopedTheme>
  );
}

export function MissedCallCard() {
  const router = useRouter();
  const pathname = usePathname();
  const { has } = useCapabilities();
  const { isActive, waitingCall } = useVoiceSession();
  const reminderCall = useReminderCall();
  const { rows } = usePagedView<INotificationPreviewCacheRow>(
    VIEW_CACHE_KEYS.notificationFeed,
    NOTIFICATION_FEED_SCOPE,
    has(CAPABILITY.notificationsRead)
  );
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const now = useNow(CALL_MISSED_TICK_MS);
  const missed = latestMissedCall({ rows, now, windowMs: CALL_MISSED_WINDOW_MS, dismissed });
  const hidden =
    isActive || waitingCall !== null || HIDDEN_ON.some((path) => pathname.startsWith(path));
  if (!missed || hidden) return null;

  const close = () => {
    setDismissed((previous) => new Set([...previous, missed.notificationId]));
    void notificationService.markRead({
      threadKey: missed.threadKey,
      ids: [missed.notificationId],
    });
  };
  const act = async (action: MissedCallAction) => {
    if (action === 'mark-done') {
      if (missed.reminderId !== null && (await reminderCall.markDone(missed.reminderId))) close();
      return;
    }
    close();
    if (action === 'call-back') router.navigate(callBackHref(missed.reminderId));
    if (action === 'view')
      router.push(`/notification?notificationId=${encodeURIComponent(missed.notificationId)}`);
  };
  const actions = missedCallActions({
    kind: missed.kind,
    reminderLinked: missed.reminderId !== null,
  }).filter((action) => action !== 'call-back' || has(CAPABILITY.assistantVoice));
  return <MissedView missed={missed} now={now} actions={actions} onAct={act} />;
}

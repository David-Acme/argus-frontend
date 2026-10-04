import { View } from 'react-native';
import type { AuthSession } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { useSessionLabels } from '@/features/sessions/hooks/use-session-labels';
import { SESSION_PLATFORM_ICONS, sessionInsightsOf } from '@/features/sessions/model/sessions';

type SessionInsightsProps<T extends AuthSession> = {
  sessions: readonly T[];
  now: number;
  ownerOf?: (session: T) => string | null;
  limit?: number;
  className?: string;
};

type InsightTileProps = {
  value: string;
  label: string;
};

const RECENT_SIGN_INS = 4;

function InsightTile({ value, label }: InsightTileProps) {
  return (
    <View className="bg-surface-secondary min-w-28 flex-1 gap-0.5 rounded-2xl px-3.5 py-3">
      <Text variant="headline" numberOfLines={1}>
        {value}
      </Text>
      <Text variant="micro" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function SessionInsights<T extends AuthSession>({
  sessions,
  now,
  ownerOf,
  limit = RECENT_SIGN_INS,
  className,
}: SessionInsightsProps<T>) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const labels = useSessionLabels(now);
  const insights = sessionInsightsOf(sessions, now, limit);

  const signedInAt = (seconds: number) => {
    const at = new Date(seconds * 1000);
    return t('screens.sessions.insights.signed-in-at', {
      date: dates.formatDayMonth(at),
      time: dates.formatTime(at),
    });
  };

  return (
    <View className={cn('gap-4', className)}>
      <View className="flex-row flex-wrap gap-2">
        <InsightTile value={String(insights.open)} label={t('screens.sessions.insights.open')} />
        <InsightTile
          value={String(insights.activeToday)}
          label={t('screens.sessions.insights.active-today')}
        />
        <InsightTile
          value={
            insights.nextExpiry === null
              ? t('screens.sessions.insights.next-expiry-none')
              : dates.formatDayMonth(new Date(insights.nextExpiry * 1000))
          }
          label={t('screens.sessions.insights.next-expiry')}
        />
      </View>
      {insights.recentSignIns.length > 0 ? (
        <View className="gap-1">
          <Text variant="micro" className="pb-1 font-semibold">
            {t('screens.sessions.insights.recent-sign-ins')}
          </Text>
          {insights.recentSignIns.map((session) => {
            const owner = ownerOf?.(session) ?? null;
            const name = labels.nameOf(session);
            return (
              <View key={session.id} className="flex-row items-center gap-3 py-1.5">
                <Icon
                  name={SESSION_PLATFORM_ICONS[session.platform]}
                  className="text-muted-foreground size-4"
                />
                <Text variant="label" numberOfLines={1} className="min-w-0 flex-1">
                  {owner ? `${name} · ${owner}` : name}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {signedInAt(session.createdAt)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

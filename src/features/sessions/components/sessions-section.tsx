import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { AuthSession } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { useSessionLabels } from '@/features/sessions/hooks/use-session-labels';
import { useSessions } from '@/features/sessions/hooks/use-sessions';
import { SESSION_GROUP_ICONS, type SessionGroup } from '@/features/sessions/model/sessions';
import { SessionInsights } from '@/features/sessions/components/session-insights';
import { SessionRow } from '@/features/sessions/components/session-row';
import { ThisDeviceCard } from '@/features/sessions/components/this-device-card';

type SessionsSectionProps = {
  className?: string;
  onConnectDevice?: () => void;
};

type SessionGroupListProps = {
  group: SessionGroup;
  renderRow: (session: AuthSession) => ReactNode;
};

type SessionsNoticeProps = {
  icon: 'check-circle' | 'loader-circle' | 'wifi-off';
  title: string;
  hint?: string;
  action?: ReactNode;
};

function SessionsNotice({ icon, title, hint, action }: SessionsNoticeProps) {
  return (
    <View className="bg-surface-secondary flex-row flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5">
      <Icon
        name={icon}
        className={
          icon === 'check-circle' ? 'text-success size-5' : 'text-foreground-secondary size-5'
        }
      />
      <View className="min-w-48 flex-1 gap-0.5">
        <Text variant="label">{title}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      {action}
    </View>
  );
}

function SessionGroupList({ group, renderRow }: SessionGroupListProps) {
  const { t } = useTranslation();

  return (
    <View>
      <View className="flex-row items-center gap-2 pb-1">
        <Icon name={SESSION_GROUP_ICONS[group.key]} className="text-muted-foreground size-3.5" />
        <Text variant="micro" className="font-semibold">
          {t(`screens.sessions.${group.key}`)}
        </Text>
        <Text variant="micro">{String(group.sessions.length)}</Text>
      </View>
      <View className="divide-border-subtle divide-y">{group.sessions.map(renderRow)}</View>
    </View>
  );
}

export function SessionsSection({ className, onConnectDevice }: SessionsSectionProps) {
  const { t } = useTranslation();
  const { isWide } = useWindowClass();
  const { overview, now, failed, busy, reload, closeOne, closeOthers, closeAll, closeHere } =
    useSessions();
  const labels = useSessionLabels(now);
  const { current, groups, others } = overview;
  const hasList = current !== null || others.length > 0;
  const everySession = current ? [current, ...others] : others;

  const detailOf = (session: AuthSession) =>
    `${labels.platformOf(session)} · ${labels.activityLabel(session)}`;

  const renderRow = (session: AuthSession) => {
    const name = labels.nameOf(session);
    return (
      <SessionRow
        key={session.id}
        session={session}
        name={name}
        detail={detailOf(session)}
        since={labels.sinceLabel(session)}
        onClose={() => void closeOne(session, name)}
      />
    );
  };

  const actions = (
    <View className={isWide ? 'gap-2' : 'gap-2 pt-1'}>
      <Button
        variant="outline"
        disabled={others.length === 0 || busy !== null}
        loading={busy === 'others'}
        onPress={() => void closeOthers()}>
        <Icon name="log-out" className="size-4" />
        <Text>{t('screens.sessions.close-others')}</Text>
      </Button>
      <Button
        variant="ghost"
        disabled={busy !== null}
        loading={busy === 'all'}
        onPress={() => void closeAll()}>
        <Icon name="log-out" className="text-error-strong size-4" />
        <Text className="text-error-strong">{t('screens.sessions.sign-out-everywhere')}</Text>
      </Button>
      {onConnectDevice ? (
        <Button variant="ghost" disabled={busy !== null} onPress={onConnectDevice}>
          <Icon name="qr-code" className="size-4" />
          <Text>{t('screens.profile.connect-device')}</Text>
        </Button>
      ) : null}
    </View>
  );

  const list =
    groups.length > 0 ? (
      <View className="gap-4">
        {groups.map((group) => (
          <SessionGroupList key={group.key} group={group} renderRow={renderRow} />
        ))}
      </View>
    ) : (
      <SessionsNotice
        icon="check-circle"
        title={t('screens.sessions.only-this')}
        hint={t('screens.sessions.only-this-hint')}
      />
    );

  const insights = <SessionInsights sessions={everySession} now={now} />;

  const card = current ? (
    <ThisDeviceCard
      session={current}
      name={labels.nameOf(current)}
      detail={detailOf(current)}
      since={labels.sinceLabel(current)}
      closing={busy === 'here'}
      onClose={() => void closeHere()}
    />
  ) : null;

  return (
    <Panel className={cn('gap-4 p-5', className)}>
      <View className="flex-row items-center gap-3">
        <View className="bg-surface-secondary size-11 items-center justify-center rounded-full">
          <Icon name="monitor-smartphone" className="text-foreground-secondary size-5" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="headline">{t('screens.sessions.title')}</Text>
          <Text variant="caption">{t('screens.sessions.hint')}</Text>
        </View>
      </View>

      {!hasList ? (
        failed ? (
          <SessionsNotice
            icon="wifi-off"
            title={t('screens.sessions.load-error')}
            action={
              <Button size="sm" variant="outline" onPress={() => void reload()}>
                <Text>{t('common.retry')}</Text>
              </Button>
            }
          />
        ) : (
          <SessionsNotice icon="loader-circle" title={t('screens.sessions.loading')} />
        )
      ) : isWide ? (
        <View className="flex-row items-start gap-5">
          <View className="w-[300px] gap-3">
            {card}
            {actions}
          </View>
          <View className="min-w-0 flex-1 gap-5">
            {list}
            <View className="border-border-subtle border-t pt-4">{insights}</View>
          </View>
        </View>
      ) : (
        <View className="gap-4">
          {card}
          {list}
          {insights}
          {actions}
        </View>
      )}
    </Panel>
  );
}

import { useRouter } from 'expo-router';
import type { AuthSession } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { resourceOf } from '@/shared/libs/remote-resource';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { ResourceView } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { SessionsSkeleton } from '@/features/sessions/components/devices-section';
import {
  APPROVE_HREF,
  CONNECTS_DEVICE,
  SESSION_PLATFORM_GLYPHS,
} from '@/features/sessions/constants/sessions.constant';
import { useSessionLabels } from '@/features/sessions/hooks/use-session-labels';
import { useSessions } from '@/features/sessions/hooks/use-sessions';
import type { Sessions } from '@/features/sessions/hooks/use-sessions';
import { useThisDevice } from '@/features/sessions/hooks/use-this-device';
import { pairedDateOf } from '@/features/sessions/model/sessions';
import type { SessionOverview } from '@/features/sessions/model/sessions';

type ListProps = { overview: SessionOverview; sessions: Sessions };

type ThisDeviceProps = { current: AuthSession | null; sessions: Sessions };

type OthersProps = { others: readonly AuthSession[]; sessions: Sessions };

function useSessionMeta(sessions: Sessions) {
  const labels = useSessionLabels(sessions.now);
  const metaOf = (session: AuthSession) =>
    `${labels.platformOf(session)} · ${labels.activityLabel(session)}`;
  return { labels, metaOf };
}

const leadingOf = (session: AuthSession) => (
  <Avatar icon={SESSION_PLATFORM_GLYPHS[session.platform]} />
);

function ThisDevice({ current, sessions }: ThisDeviceProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { labels, metaOf } = useSessionMeta(sessions);
  return (
    <Section title={t('screens.sessions.this-device')}>
      {current ? (
        <Row leading={leadingOf(current)} title={labels.nameOf(current)} meta={metaOf(current)} />
      ) : null}
      {CONNECTS_DEVICE ? (
        <Row
          leading={<Avatar icon="qr" />}
          title={t('screens.sessions.connect-device')}
          meta={t('screens.sessions.connect-device-meta')}
          chevron
          onPress={() => router.push(APPROVE_HREF)}
        />
      ) : null}
      <Row
        danger
        leading={<Avatar icon="logout" tone="alert" />}
        title={t('screens.sessions.close-here')}
        meta={t('screens.sessions.sign-out-meta')}
        onPress={() => void sessions.closeHere()}
      />
    </Section>
  );
}

function Others({ others, sessions }: OthersProps) {
  const { t } = useTranslation();
  const { labels, metaOf } = useSessionMeta(sessions);
  return (
    <Section
      title={t('screens.sessions.other')}
      meta={others.length > 0 ? String(others.length) : undefined}>
      {others.length === 0 ? (
        <Row
          leading={<Avatar icon="check" tone="ok" />}
          title={t('screens.sessions.only-this')}
          meta={t('screens.sessions.only-this-meta')}
        />
      ) : (
        others.map((session) => {
          const name = labels.nameOf(session);
          return (
            <Row
              key={session.id}
              leading={leadingOf(session)}
              title={name}
              meta={`${metaOf(session)} · ${labels.sinceLabel(session)}`}
              trailing={
                <Button
                  iconOnly
                  compact
                  filled
                  icon="logout"
                  label={t('screens.sessions.close-label', { name })}
                  onPress={() => sessions.closeOne(session, name)}
                />
              }
            />
          );
        })
      )}
    </Section>
  );
}

function SessionList({ overview, sessions }: ListProps) {
  const { t } = useTranslation();
  const { current, others } = overview;
  return (
    <>
      <ThisDevice current={current} sessions={sessions} />
      <Others others={others} sessions={sessions} />
      <Section>
        {others.length > 0 ? (
          <Row
            title={t('screens.sessions.close-others')}
            meta={t('screens.sessions.close-others-meta')}
            onPress={() => void sessions.closeOthers()}
          />
        ) : null}
        <Row
          danger
          title={t('screens.sessions.sign-out-everywhere')}
          meta={t('screens.sessions.close-all-meta')}
          onPress={() => void sessions.closeAll()}
        />
      </Section>
    </>
  );
}

function HomeSection() {
  const { t } = useTranslation();
  const { formatFullDate } = useDateFormatter();
  const { instance, unpair } = useThisDevice();
  const ask = async () => {
    const accepted = await confirm({
      title: t('screens.sessions.home.unpair-confirm-title'),
      description: t('screens.sessions.home.unpair-confirm-description'),
      confirmLabel: t('screens.sessions.home.unpair'),
      intent: 'danger',
    });
    if (accepted) await unpair();
  };
  if (!instance) return null;
  const paired = pairedDateOf(instance.pairedAt);
  return (
    <Section title={t('screens.sessions.home.title')}>
      <Row
        leading={<Avatar icon="home" />}
        title={t('screens.sessions.home.address', { address: instance.ip })}
        meta={
          paired
            ? t('screens.sessions.home.paired', { date: formatFullDate(paired) })
            : instance.host
        }
      />
      <Row
        danger
        leading={<Avatar icon="x" tone="alert" />}
        title={t('screens.sessions.home.unpair')}
        meta={t('screens.sessions.home.unpair-meta')}
        onPress={() => void ask()}
      />
    </Section>
  );
}

export default function SessionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const sessions = useSessions();
  const copy = useResourceCopy({ title: t('screens.sessions.load-error') });
  const resource = resourceOf({
    data: sessions.answered ? sessions.overview : null,
    status: sessions.failed ? 'failed' : 'loading',
    retry: sessions.reload,
    empty: (overview) => overview.current === null && overview.others.length === 0,
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  return (
    <Screen
      title={t('screens.sessions.title')}
      meta={t('screens.sessions.hint')}
      back={{ label: t('common.back'), onPress: back }}
      refresh={{ refreshing: false, onRefresh: () => void sessions.reload() }}>
      <ResourceView
        resource={resource}
        copy={copy}
        skeleton={
          <Section>
            <SessionsSkeleton />
          </Section>
        }
        empty={{
          message: t('screens.sessions.none-returned'),
          action: { label: t('common.retry'), onPress: sessions.reload },
        }}>
        {(overview) => <SessionList overview={overview} sessions={sessions} />}
      </ResourceView>
      <HomeSection />
    </Screen>
  );
}

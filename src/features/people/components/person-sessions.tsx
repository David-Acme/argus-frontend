import type { AuthSession } from '@/core/types';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { ResourceView, SkeletonRow } from '@/shared/ui/resource-view';
import type { Resource } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { SESSION_PLATFORM_GLYPHS, useSessionLabels } from '@/features/sessions';
import type { PersonAccount } from '@/features/people/hooks/use-person-account';

export type PersonSessionsProps = { account: PersonAccount; active: boolean };

type SessionLineProps = { account: PersonAccount; session: AuthSession };

function resourceOf(account: PersonAccount): Resource<readonly AuthSession[]> {
  if (account.sessions.length > 0) return { status: 'ready', data: account.sessions };
  if (account.failed) return { status: 'failed', retry: account.reload };
  if (account.loading) return { status: 'loading' };
  return { status: 'ready', data: [] };
}

function SessionLine({ account, session }: SessionLineProps) {
  const { t } = useTranslation();
  const labels = useSessionLabels(account.now);
  const name = labels.nameOf(session);
  return (
    <Row
      leading={<Avatar icon={SESSION_PLATFORM_GLYPHS[session.platform]} />}
      title={name}
      meta={`${labels.platformOf(session)} · ${labels.activityLabel(session)}`}
      trailing={
        <Button
          iconOnly
          compact
          filled
          icon="logout"
          label={t('screens.sessions.close-label', { name })}
          onPress={() => account.closeOne(session, name)}
        />
      }
    />
  );
}

export function PersonSessions({ account, active }: PersonSessionsProps) {
  const { t } = useTranslation();
  const copy = useResourceCopy({ title: t('screens.users.sessions-failed') });
  const resource = resourceOf(account);
  const title = t('screens.users.sessions');
  if (resource.status === 'ready')
    return (
      <Section title={title}>
        {resource.data.map((session) => (
          <SessionLine key={session.id} account={account} session={session} />
        ))}
        {resource.data.length > 1 ? (
          <Row title={t('screens.sessions.admin.close-all')} danger onPress={account.closeAll} />
        ) : null}
        {resource.data.length === 0 ? (
          <Row
            leading={<Avatar icon="devices" />}
            title={t('screens.sessions.admin.no-sessions')}
            meta={t(
              active
                ? 'screens.sessions.admin.no-sessions-hint'
                : 'screens.sessions.admin.disabled-hint'
            )}
          />
        ) : null}
      </Section>
    );
  return (
    <Section title={title} variant="plain">
      <ResourceView
        resource={resource}
        copy={copy}
        skeleton={
          <>
            <SkeletonRow />
            <SkeletonRow short />
          </>
        }
        empty={{
          message: t('screens.sessions.admin.no-sessions'),
          action: { label: t('common.retry'), onPress: account.reload },
        }}>
        {() => null}
      </ResourceView>
    </Section>
  );
}

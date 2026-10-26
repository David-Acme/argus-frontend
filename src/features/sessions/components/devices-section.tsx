import { useRouter } from 'expo-router';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { resourceOf } from '@/shared/libs/remote-resource';
import { Avatar } from '@/shared/ui/avatar';
import { ResourceView, SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import {
  DEVICES_SHOWN,
  SESSION_PLATFORM_GLYPHS,
  SESSIONS_HREF,
} from '@/features/sessions/constants/sessions.constant';
import { useSessionLabels } from '@/features/sessions/hooks/use-session-labels';
import { useSessions } from '@/features/sessions/hooks/use-sessions';

export function SessionsSkeleton() {
  return (
    <>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow short />
    </>
  );
}

export function DevicesSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const sessions = useSessions();
  const labels = useSessionLabels(sessions.now);
  const copy = useResourceCopy({ title: t('screens.sessions.load-error') });
  const { current, others } = sessions.overview;
  const shown = [...(current ? [current] : []), ...others].slice(0, DEVICES_SHOWN);
  const resource = resourceOf({
    data: sessions.answered ? shown : null,
    status: sessions.failed ? 'failed' : 'loading',
    retry: sessions.reload,
  });
  const head = {
    title: t('screens.profile.devices.title'),
    action: {
      label: t('screens.profile.devices.manage'),
      onPress: () => router.push(SESSIONS_HREF),
    },
  };
  if (resource.status === 'ready')
    return (
      <Section {...head}>
        {resource.data.map((session) => (
          <Row
            key={session.id}
            leading={<Avatar icon={SESSION_PLATFORM_GLYPHS[session.platform]} />}
            title={labels.nameOf(session)}
            meta={`${labels.platformOf(session)} · ${labels.activityLabel(session)}`}
          />
        ))}
      </Section>
    );
  return (
    <Section {...head} variant="plain">
      <ResourceView
        resource={resource}
        copy={copy}
        skeleton={<SessionsSkeleton />}
        empty={{
          message: t('screens.sessions.only-this'),
          action: { label: t('common.retry'), onPress: sessions.reload },
        }}>
        {() => null}
      </ResourceView>
    </Section>
  );
}

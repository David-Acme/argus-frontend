import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { PrivacyMe } from '@/core/types';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { resourceOf } from '@/shared/libs/remote-resource';
import { Avatar } from '@/shared/ui/avatar';
import { ResourceView, SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import { PrivacyNoticeDialog } from '@/features/privacy/components/privacy-notice-dialog';
import { PRIVACY_SIGNAL_LOOK } from '@/features/privacy/constants/privacy-screen.constant';
import { usePrivacy } from '@/features/privacy/hooks/use-privacy';
import { usePrivacySignals } from '@/features/privacy/hooks/use-privacy-signals';
import {
  blockedByHousehold,
  locationChosen,
  locationOffered,
} from '@/features/privacy/model/privacy';

type ChoicesProps = { me: PrivacyMe; privacy: ReturnType<typeof usePrivacy> };

function Choices({ me, privacy }: ChoicesProps) {
  const { t } = useTranslation();
  const { moduleActive } = useCapabilities();
  const signals = usePrivacySignals(me.applicable);
  const off = t('screens.privacy.household-off');
  const locationBlocked = me.household.location === false;
  return (
    <Section>
      {signals.map((signal) => {
        const look = PRIVACY_SIGNAL_LOOK[signal];
        const blocked = blockedByHousehold(me.household, signal);
        const hint = t(look.hint);
        return (
          <Row
            key={signal}
            leading={<Avatar icon={look.icon} />}
            title={t(look.title)}
            meta={blocked ? `${hint} ${off}` : hint}
            trailing={
              <Switch
                label={t(look.title)}
                value={me.choices[signal] && !blocked}
                disabled={blocked}
                onValueChange={(value) => void privacy.setChoice(signal, value)}
              />
            }
          />
        );
      })}
      {locationOffered(me, moduleActive) ? (
        <Row
          leading={<Avatar icon="door" />}
          title={t('screens.privacy.location.title')}
          meta={
            locationBlocked
              ? `${t('screens.privacy.location.hint')} ${off}`
              : t('screens.privacy.location.hint')
          }
          trailing={
            <Switch
              label={t('screens.privacy.location.title')}
              value={locationChosen(me.choices) && !locationBlocked}
              disabled={locationBlocked}
              onValueChange={(value) => void privacy.setLocation(value)}
            />
          }
        />
      ) : null}
    </Section>
  );
}

function useDecided(me: PrivacyMe | null): string {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  if (!me) return t('screens.privacy.section.terms-summary');
  if (!me.decided || !me.decidedAt) return t('screens.privacy.section.not-accepted');
  return t('screens.privacy.section.accepted', {
    version: String(me.noticeVersion),
    date: dates.formatFullDate(new Date((me.updatedAt ?? me.decidedAt) * 1000)),
  });
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const privacy = usePrivacy();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const decided = useDecided(privacy.me);
  const copy = useResourceCopy({ title: t('screens.privacy.section.unavailable') });
  const resource = resourceOf({ data: privacy.me, status: privacy.status, retry: privacy.reload });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  return (
    <Screen
      title={t('screens.profile.links.privacy.title')}
      meta={t('screens.privacy.subtitle')}
      back={{ label: t('common.back'), onPress: back }}>
      <ResourceView
        resource={resource}
        copy={copy}
        skeleton={
          <Section>
            <SkeletonRow trailing />
            <SkeletonRow trailing />
            <SkeletonRow trailing />
          </Section>
        }
        empty={{
          message: t('screens.privacy.section.unavailable'),
          action: { label: t('common.retry'), onPress: privacy.reload },
        }}>
        {(me) => <Choices me={me} privacy={privacy} />}
      </ResourceView>
      <Section>
        <Row
          leading={<Avatar icon="lock" />}
          title={t('screens.privacy.section.terms-title')}
          meta={decided}
          chevron
          onPress={() => setNoticeOpen(true)}
        />
      </Section>
      <PrivacyNoticeDialog open={noticeOpen} onOpenChange={setNoticeOpen} />
    </Screen>
  );
}

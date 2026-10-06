import { useState, type PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '@/core/services/auth.service';
import type { PrivacyChoices } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { ConsentForm } from '@/features/privacy/components/consent-form';
import { usePrivacy } from '@/features/privacy/hooks/use-privacy';
import { usePrivacySignals } from '@/features/privacy/hooks/use-privacy-signals';
import { consentDraft, needsConsent, NO_CHOICES } from '@/features/privacy/model/privacy';

export function PrivacyGate({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { me, decide } = usePrivacy();
  const signals = usePrivacySignals(me?.applicable);
  const [submitting, setSubmitting] = useState(false);

  const accept = async (choices: PrivacyChoices) => {
    setSubmitting(true);
    const saved = await decide(choices);
    if (saved) consentDraft.take();
    setSubmitting(false);
  };

  const decline = async () => {
    const leave = await confirm({
      title: t('screens.privacy.consent.decline-title'),
      description: t('screens.privacy.consent.decline-description'),
      confirmLabel: t('screens.privacy.consent.decline-confirm'),
      intent: 'danger',
    });
    if (leave) await authService.logout();
  };

  if (!me || !needsConsent(me)) return children;

  return (
    <View className="bg-background flex-1">
      <ScrollView
        contentContainerClassName="grow justify-center px-4 sm:px-6"
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}>
        <ConsentForm
          variant={me.decided ? 'updated' : 'review'}
          initial={me.decided ? me.choices : (consentDraft.peek() ?? NO_CHOICES)}
          household={me.household}
          signals={signals}
          submitting={submitting}
          onAccept={(choices) => void accept(choices)}
          onDecline={() => void decline()}
        />
      </ScrollView>
    </View>
  );
}

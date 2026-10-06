import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PrivacyChoices } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY, IS_NATIVE } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { useModuleCatalog } from '@/features/modules';
import {
  answeredChoices,
  chosenModuleIds,
  NO_CHOICES,
  PrivacyChoiceList,
  signalsToAsk,
  usePrivacy,
} from '@/features/privacy';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { nextHref } from '@/features/auth/model/onboarding-flow';

export default function OnboardingModulePrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const catalog = useModuleCatalog();
  const { me, decide } = usePrivacy();
  const [answers, setAnswers] = useState<PrivacyChoices | null>(null);
  const [saving, setSaving] = useState(false);
  const asked = useMemo(() => signalsToAsk(catalog), [catalog]);
  const names = useMemo(
    () =>
      chosenModuleIds(catalog)
        .map((id) => catalog?.modules.find((module) => module.id === id)?.name ?? id)
        .join(', '),
    [catalog]
  );
  const choices = answers ?? me?.choices ?? NO_CHOICES;
  const next = nextHref('owner', 'module-privacy', { native: IS_NATIVE, moduleSignals: true });

  const goOn = useCallback(() => router.replace(next ?? '/'), [next, router]);

  const save = async () => {
    if (!me) return;
    setSaving(true);
    const saved = await decide(answeredChoices(me.choices, asked, choices));
    setSaving(false);
    if (!saved) toast.warning(t('screens.privacy.modules.save-failed'));
    goOn();
  };

  if (!has(CAPABILITY.modulesManage)) return <Redirect href="/" />;
  if (catalog !== null && asked.length === 0) return <Redirect href={nextHref('owner', 'modules', { native: IS_NATIVE, moduleSignals: false }) ?? '/'} />;

  return (
    <View className="bg-background flex-1">
      <ScrollView
        contentContainerClassName="grow justify-center px-6"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <View className="w-full max-w-xl gap-6 self-center">
          <OnboardingSteps flow="owner" step="module-privacy" />
          <View className="gap-3">
            <View className="bg-accent-soft size-14 items-center justify-center rounded-3xl">
              <Icon name="shield-check" className="text-accent-strong size-7" />
            </View>
            <Text variant="micro" className="font-semibold tracking-wide uppercase">
              {t('screens.privacy.modules.eyebrow')}
            </Text>
            <Text variant="title">{t('screens.privacy.modules.title')}</Text>
            <Text variant="body" className="text-foreground-secondary">
              {t('screens.privacy.modules.intro')}
            </Text>
          </View>

          {me ? (
            <View className="gap-2">
              {names ? (
                <Text variant="label" className="text-foreground-secondary">
                  {t('screens.privacy.modules.for-modules', { modules: names })}
                </Text>
              ) : null}
              <PrivacyChoiceList
                choices={choices}
                signals={asked}
                household={me.household}
                disabled={saving}
                onChange={(signal, value) => setAnswers({ ...choices, [signal]: value })}
              />
            </View>
          ) : (
            <Text variant="caption" className="px-1 py-3">
              {t('screens.privacy.modules.loading')}
            </Text>
          )}

          <View className="gap-3">
            <Button size="lg" loading={saving} disabled={!me} onPress={() => void save()}>
              <Text>{t('screens.privacy.modules.save')}</Text>
            </Button>
            <Button variant="ghost" disabled={saving} onPress={goOn}>
              <Text>{t('screens.privacy.modules.later')}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

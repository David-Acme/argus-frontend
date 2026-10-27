import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { View } from 'react-native';
import { useAuthStore } from '@/core/stores';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Notice } from '@/shared/ui/notice';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingMid } from '@/features/auth/components/onboarding-mid';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { PrivacyLine } from '@/features/auth/components/privacy-line';
import { flowOf } from '@/features/auth/model/onboarding-flow';
import {
  checkName,
  knownName,
  nameIsValid,
  refusedFields,
} from '@/features/auth/model/person-name';
import type { NameErrors } from '@/features/auth/model/person-name';
import { saveSelfName } from '@/features/auth/services/self-name.service';
import { useOnboardingNext } from '@/features/auth/hooks/use-onboarding-next';

export default function NameScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { next } = useOnboardingNext();
  const flow = flowOf(useLocalSearchParams<{ flow?: string }>());
  const known = useAuthStore((state) => knownName(state.user?.name));
  const [name, setName] = useState(known);
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState<NameErrors>({});
  const [failed, setFailed] = useState(false);
  const lastRef = useRef<TextInput>(null);
  const saving = useRef(false);

  const save = async () => {
    const check = checkName({ name, lastName });
    setFailed(false);
    setErrors(check.errors);
    if (!nameIsValid(check) || saving.current) return;
    saving.current = true;
    const answer = await saveSelfName(check.value).finally(() => {
      saving.current = false;
    });
    if (answer.ok) {
      router.replace(next(flow, 'name'));
      return;
    }
    const refused = refusedFields(answer.errors);
    setErrors(refused);
    setFailed(Object.keys(refused).length === 0);
  };

  return (
    <OnboardingFrame
      top={<OnboardingTop place={{ flow, step: 'name' }} />}
      footer={<Button variant="primary" block label={t('screens.name.save')} onPress={save} />}>
      <OnboardingHeading title={t('screens.name.title')} lead={t('screens.name.lead')} />
      <OnboardingMid form>
        <View className="w-full gap-4">
          <Field
            label={t('screens.name.name')}
            content="given"
            value={name}
            onChangeText={setName}
            error={errors.name ? t(errors.name) : undefined}
            submit={{ key: 'next', onSubmit: () => lastRef.current?.focus() }}
          />
          <Field
            ref={lastRef}
            label={t('screens.name.last-name')}
            content="family"
            value={lastName}
            onChangeText={setLastName}
            error={errors.lastName ? t(errors.lastName) : undefined}
            submit={{ key: 'done', onSubmit: () => void save() }}
          />
        </View>
        {failed ? (
          <View className="w-full" accessibilityLiveRegion="polite">
            <Notice inline tone="alert" title={t('screens.name.errors.save-failed')} />
          </View>
        ) : null}
        <PrivacyLine text={t('screens.name.privacy')} />
      </OnboardingMid>
    </OnboardingFrame>
  );
}

import { View } from 'react-native';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Notice } from '@/shared/ui/notice';
import { InfoRows } from '@/features/auth/components/info-rows';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingMid } from '@/features/auth/components/onboarding-mid';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { WHERE_ROWS } from '@/features/auth/constants/pairing.constant';
import { notFoundRowsOf } from '@/features/auth/model/pairing-state';
import type { PairingState } from '@/features/auth/model/pairing-state';

export type PairingForm = {
  state: PairingState;
  code: string;
  address: string;
  busy: boolean;
  ready: boolean;
  setCode: (code: string) => void;
  setAddress: (address: string) => void;
  connect: () => Promise<void>;
  back: () => void;
  searchAgain: () => void;
  scan: () => void;
  openAddress: () => void;
};

export type PairingViewProps = { form: PairingForm };

const PLACE = { flow: 'owner', step: 'pair' } as const;

const PHONE = IS_NATIVE;

function CodeInput({ form }: PairingViewProps) {
  const { t } = useTranslation();
  return (
    <View className="w-full">
      <Field
        label={t('screens.pairing.code-label')}
        placeholder={t('screens.pairing.code-placeholder')}
        content="code"
        value={form.code}
        onChangeText={(text) => form.setCode(text.toUpperCase())}
        error={form.state.codeError ? t(form.state.codeError) : undefined}
      />
    </View>
  );
}

function StateNote({ form }: PairingViewProps) {
  const { t } = useTranslation();
  const { note } = form.state;
  if (!note) return null;
  const title = note.name ? t('screens.pairing.paired-named', { name: note.name }) : t(note.key);
  return (
    <View className="w-full" accessibilityLiveRegion="polite">
      <Notice inline tone={note.tone} title={title} />
    </View>
  );
}

export function PairingCodeView({ form }: PairingViewProps) {
  const { t } = useTranslation();
  return (
    <OnboardingFrame
      top={<OnboardingTop onBack={form.back} place={PLACE} />}
      footer={
        <>
          <Button
            variant="primary"
            block
            label={t('screens.pairing.connect')}
            onPress={form.connect}
            busy={form.busy}
            disabled={!form.ready}
          />
          {PHONE ? (
            <Button
              variant="ghost"
              block
              icon="qr"
              label={t('screens.pairing.scan')}
              onPress={form.scan}
            />
          ) : (
            <Button
              variant="ghost"
              block
              label={t('screens.pairing.address-open')}
              onPress={form.openAddress}
            />
          )}
        </>
      }>
      <OnboardingHeading
        title={t('screens.pairing.title')}
        lead={t('screens.pairing.lead')}
        mark="estela"
      />
      <OnboardingMid>
        <CodeInput form={form} />
        <StateNote form={form} />
      </OnboardingMid>
      <InfoRows rows={WHERE_ROWS} />
    </OnboardingFrame>
  );
}

export function PairingAddressView({ form }: PairingViewProps) {
  const { t } = useTranslation();
  const { addressError } = form.state;
  return (
    <OnboardingFrame
      top={<OnboardingTop onBack={form.back} place={PLACE} />}
      footer={
        <>
          <Button
            variant="primary"
            block
            label={t('screens.pairing.not-found.search')}
            onPress={form.connect}
            busy={form.busy}
            disabled={!form.ready || !form.address.trim()}
          />
          <Button
            variant="ghost"
            block
            label={t('screens.pairing.not-found.again')}
            onPress={form.searchAgain}
          />
        </>
      }>
      <OnboardingHeading
        title={t('screens.pairing.not-found.title')}
        lead={t('screens.pairing.not-found.lead')}
        mark="estela"
      />
      <OnboardingMid form>
        <View className="w-full">
          <Field
            label={t('screens.pairing.not-found.label')}
            placeholder={t('screens.pairing.not-found.placeholder')}
            content="address"
            value={form.address}
            onChangeText={form.setAddress}
            error={addressError ? t(addressError) : undefined}
          />
        </View>
        <CodeInput form={form} />
        <StateNote form={form} />
      </OnboardingMid>
      <InfoRows rows={notFoundRowsOf(PHONE)} />
    </OnboardingFrame>
  );
}

import { Button } from '@/shared/components/ui/button';
import { Panel } from '@/shared/components/ui/panel';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { CenteredScreen } from '@/shared/components/layout';
import { Text } from '@/shared/components/ui/text';
import { QrManualEntry } from '@/features/qr';
import { usePairingFlow, type PairingFlowPhase } from '@/features/auth/hooks/use-pairing-flow';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useStagger } from '@/shared/hooks/use-stagger';
import { itemIn } from '@/shared/libs/animations';
import { useQrScanStore } from '@/core/stores';
import { hostLabel } from '@/shared/libs/pairing-qr';
import { IS_NATIVE } from '@/shared/constants';
import { ONBOARDING_STEPS } from '@/features/auth/constants/welcome';
import { NativeOnlyAnimatedView } from '@/shared/components/ui/native-only-animated-view';
import type { NetErrorCode, TranslationKey } from '@/core/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

const PHASE_LABEL: Record<PairingFlowPhase, TranslationKey> = {
  idle: 'screens.pairing.title',
  parsing: 'screens.pairing.parsing',
  discovering: 'screens.pairing.discovering',
  pairing: 'screens.pairing.pairing',
  success: 'screens.pairing.success',
  error: 'screens.pairing.title',
};

const ERROR_LABEL: Partial<Record<NetErrorCode, TranslationKey>> = {
  ALREADY_PAIRED: 'screens.pairing.errors.already-paired',
  INVALID_PAIRING_CODE: 'screens.pairing.errors.invalid-code',
  DISCOVERY_NOT_FOUND: 'screens.pairing.errors.not-found',
  HOST_NOT_ALLOWED: 'screens.pairing.errors.invalid-address',
  FINGERPRINT_MISMATCH: 'screens.pairing.errors.fingerprint-mismatch',
  NETWORK_ERROR: 'screens.pairing.errors.network',
};

const SUCCESS_PAUSE_MS = 700;

export default function PairingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const flow = usePairingFlow();
  const status = useQrScanStore((s) => s.status);
  const value = useQrScanStore((s) => s.value);
  const [titleDelay, cardDelay] = useStagger(2, 90);
  const [address, setAddress] = useState('');
  const [addressOpen, setAddressOpen] = useState(false);
  const showAddress = addressOpen || flow.error?.code === 'DISCOVERY_NOT_FOUND';

  const handleScan = useCallback(() => {
    useQrScanStore.getState().open({ purpose: 'server' });
    router.push('/qr');
  }, [router]);

  const handleRetry = useCallback(() => {
    flow.reset();
    handleScan();
  }, [flow, handleScan]);

  const handleCode = useCallback(
    (code: string) => {
      void flow.run(code, address);
    },
    [flow, address],
  );

  const handleOpenAddress = useCallback(() => setAddressOpen(true), []);

  useEffect(() => {
    if (status !== 'scanned' || value == null || flow.phase !== 'idle') return;
    useQrScanStore.getState().clear();
    void flow.run(value);
  }, [status, value, flow]);

  useEffect(() => {
    if (flow.phase !== 'success') return;
    const timer = setTimeout(() => router.replace('/'), SUCCESS_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [flow.phase, router]);

  const errorKey = flow.error?.code ? ERROR_LABEL[flow.error.code] ?? 'screens.pairing.errors.network' : null;
  const invalidCode = flow.phase === 'error' && flow.error?.code === 'INVALID_PAIRING_CODE';

  return (
    <CenteredScreen maxWidth={448} className="items-stretch">
      <NativeOnlyAnimatedView entering={itemIn.delay(titleDelay)} className="gap-1.5">
        {IS_NATIVE ? (
          <OnboardingSteps
            current={ONBOARDING_STEPS.pairing}
            total={ONBOARDING_STEPS.total}
            className="mb-4"
          />
        ) : null}
        <Text variant="title">{t('screens.pairing.title')}</Text>
        <Text variant="caption" className="text-foreground-secondary">
          {t('screens.pairing.subtitle')}
        </Text>
      </NativeOnlyAnimatedView>

      <NativeOnlyAnimatedView entering={itemIn.delay(cardDelay)}>
      <Panel title={t('screens.pairing.link-server')} className="gap-4">
        {flow.phase === 'idle' ? (
          IS_NATIVE ? (
            <Button onPress={handleScan} size="lg">
              <Icon name="scan-barcode" />
              <Text>{t('screens.pairing.scan')}</Text>
            </Button>
          ) : (
            <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <Icon name="monitor" className="text-accent-strong size-5" />
              <Text variant="body" className="flex-1">
                {t('screens.pairing.desktop-hint')}
              </Text>
            </View>
          )
        ) : null}

        {flow.phase === 'parsing' || flow.phase === 'discovering' || flow.phase === 'pairing' ? (
          <View className="flex-row items-center gap-3">
            <Icon name="refresh-cw" className="text-accent-strong size-5" />
            <Text>{t(PHASE_LABEL[flow.phase])}</Text>
          </View>
        ) : null}

        {flow.phase === 'success' ? (
          <View className="gap-2">
            <View className="flex-row items-center gap-3">
              <Icon name="check-circle" className="text-success size-5" />
              <Text>{t('screens.pairing.success')}</Text>
            </View>
            {flow.qr ? (
              <Text variant="caption">{hostLabel(flow.qr.host)}</Text>
            ) : null}
          </View>
        ) : null}

        {flow.phase === 'error' && errorKey ? (
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <Icon name="triangle-alert" className="text-error-strong size-5" />
              <Text className="text-error-strong">{t(errorKey)}</Text>
            </View>
            {IS_NATIVE ? (
              <Button variant="outline" onPress={handleRetry}>
                <Text>{t('screens.pairing.scan-again')}</Text>
              </Button>
            ) : null}
          </View>
        ) : null}

        {flow.phase === 'idle' || flow.phase === 'error' ? (
          <QrManualEntry
            label="screens.pairing.enter-code"
            placeholder="screens.pairing.code-placeholder"
            invalid={invalidCode}
            onSubmit={handleCode}
            startExpanded={!IS_NATIVE}
          />
        ) : null}

        {(flow.phase === 'idle' || flow.phase === 'error') && showAddress ? (
          <View className="gap-1.5">
            <Text variant="caption" className="text-foreground-secondary">
              {t('screens.pairing.address-label')}
            </Text>
            <Input
              value={address}
              onChangeText={setAddress}
              placeholder={t('screens.pairing.address-placeholder')}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t('screens.pairing.address-label')}
            />
            <Text variant="caption">
              {t('screens.pairing.address-hint')}
            </Text>
          </View>
        ) : null}

        {(flow.phase === 'idle' || flow.phase === 'error') && !showAddress ? (
          <Button variant="ghost" size="sm" onPress={handleOpenAddress}>
            <Text>{t('screens.pairing.address-open')}</Text>
          </Button>
        ) : null}
      </Panel>
      </NativeOnlyAnimatedView>
    </CenteredScreen>
  );
}
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Icon } from '@/shared/components/ui/icon';
import { CenteredScreen } from '@/shared/components/layout';
import { Text } from '@/shared/components/ui/text';
import { QrManualEntry } from '@/shared/components/qr';
import { usePairingFlow, type PairingFlowPhase } from '@/shared/hooks/use-pairing-flow';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useStagger } from '@/shared/hooks/use-stagger';
import { itemIn } from '@/shared/libs/animations';
import { useQrScanStore } from '@/core/stores';
import { hostLabel } from '@/shared/libs/pairing-qr';
import { IS_NATIVE } from '@/shared/constants';
import { NativeOnlyAnimatedView } from '@/shared/components/ui/native-only-animated-view';
import type { NetErrorCode, TranslationKey } from '@/core/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
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
      void flow.run(code);
    },
    [flow],
  );

  const autoOpened = useRef(false);
  useEffect(() => {
    if (!IS_NATIVE || autoOpened.current || status !== 'idle' || flow.phase !== 'idle') return;
    autoOpened.current = true;
    handleScan();
  }, [status, flow.phase, handleScan]);

  useEffect(() => {
    if (status !== 'scanned' || value == null || flow.phase !== 'idle') return;
    useQrScanStore.getState().clear();
    void flow.run(value);
  }, [status, value, flow]);

  // Auto-advance: mobile continues to the face step (first pairing = no owner
  // yet), desktop goes to the device-login screen.
  useEffect(() => {
    if (flow.phase !== 'success') return;
    const timer = setTimeout(() => {
      router.replace(IS_NATIVE ? '/welcome/face' : '/login');
    }, SUCCESS_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [flow.phase, router]);

  const errorKey = flow.error?.code ? ERROR_LABEL[flow.error.code] ?? 'screens.pairing.errors.network' : null;
  const invalidCode = flow.phase === 'error' && flow.error?.code === 'INVALID_PAIRING_CODE';

  return (
    <CenteredScreen maxWidth={448} className="items-stretch">
      <NativeOnlyAnimatedView entering={itemIn.delay(titleDelay)} className="gap-1.5">
        <Text variant="h3">{t('screens.pairing.title')}</Text>
        <Text className="text-foreground-secondary text-sm leading-5">
          {t('screens.pairing.subtitle')}
        </Text>
      </NativeOnlyAnimatedView>

      <NativeOnlyAnimatedView entering={itemIn.delay(cardDelay)}>
      <Card>
        <CardHeader>
          <CardTitle>{t('screens.pairing.link-server')}</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          {flow.phase === 'idle' ? (
            IS_NATIVE ? (
              <Button onPress={handleScan} size="lg">
                <Icon name="scan-barcode" />
                <Text>{t('screens.pairing.scan')}</Text>
              </Button>
            ) : (
              <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <Icon name="monitor" className="text-accent size-5" />
                <Text className="flex-1 text-sm leading-5">
                  {t('screens.pairing.desktop-hint')}
                </Text>
              </View>
            )
          ) : null}

          {flow.phase === 'parsing' || flow.phase === 'discovering' || flow.phase === 'pairing' ? (
            <View className="flex-row items-center gap-3">
              <Icon name="refresh-cw" className="text-accent size-5" />
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
                <Text variant="muted">{hostLabel(flow.qr.host)}</Text>
              ) : null}
            </View>
          ) : null}

          {flow.phase === 'error' && errorKey ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-3">
                <Icon name="triangle-alert" className="text-error size-5" />
                <Text className="text-error">{t(errorKey)}</Text>
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
        </CardContent>
      </Card>
      </NativeOnlyAnimatedView>
    </CenteredScreen>
  );
}
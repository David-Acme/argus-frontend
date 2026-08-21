import { authService } from '@/core/services/auth.service';
import { useQrScanStore } from '@/core/stores';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { CenteredScreen } from '@/shared/components/layout';
import { Text } from '@/shared/components/ui/text';
import { parseLoginQr } from '@/shared/libs/login-qr';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

type Phase = 'idle' | 'scanning' | 'approving' | 'approved' | 'error';

export default function ApproveScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const status = useQrScanStore((s) => s.status);
  const value = useQrScanStore((s) => s.value);
  const handledRef = useRef(false);

  const openScanner = useCallback(() => {
    handledRef.current = false;
    useQrScanStore.getState().open({ purpose: 'login' });
    router.push('/qr');
  }, [router]);

  const handleValue = useCallback(async (raw: string) => {
    const payload = parseLoginQr(raw);
    if (!payload) {
      setPhase('error');
      return;
    }
    setPhase('approving');
    const res = await authService.approveDeviceLogin(payload.id);
    if (res.ok) {
      setPhase('approved');
      useQrScanStore.getState().clear();
    } else {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    if (status !== 'scanned' || value == null || handledRef.current) return;
    handledRef.current = true;
    void handleValue(value);
  }, [status, value, handleValue]);

  useEffect(() => {
    if (phase !== 'approved') return;
    const timer = setTimeout(() => router.back(), 1200);
    return () => clearTimeout(timer);
  }, [phase, router]);

  return (
    <CenteredScreen maxWidth={448} className="items-stretch">
      <View className="items-center gap-3">
        <View className="bg-accent-soft size-16 items-center justify-center rounded-full">
          <Icon name="monitor" className="text-accent size-8" />
        </View>
        <Text variant="h3" className="text-center">
          {t('screens.approve.title')}
        </Text>
        <Text className="text-foreground-secondary text-center text-sm leading-5">
          {t('screens.approve.subtitle')}
        </Text>
      </View>

      {phase === 'idle' ? (
        <Button size="lg" onPress={openScanner}>
          <Icon name="scan-barcode" />
          <Text>{t('screens.approve.scan')}</Text>
        </Button>
      ) : null}

      {phase === 'approving' ? (
        <View className="items-center gap-3">
          <Icon name="refresh-cw" className="text-accent size-6" />
          <Text>{t('screens.approve.approving')}</Text>
        </View>
      ) : null}

      {phase === 'approved' ? (
        <View className="items-center gap-3">
          <Icon name="check-circle" className="text-success size-10" />
          <Text>{t('screens.approve.approved')}</Text>
        </View>
      ) : null}

      {phase === 'error' ? (
        <View className="items-center gap-3">
          <Icon name="triangle-alert" className="text-error size-8" />
          <Text variant="muted" className="text-center">
            {t('screens.approve.error')}
          </Text>
          <Button variant="outline" onPress={() => setPhase('idle')}>
            <Text>{t('common.retry')}</Text>
          </Button>
        </View>
      ) : null}
    </CenteredScreen>
  );
}
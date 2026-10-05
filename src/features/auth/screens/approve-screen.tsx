import { authService } from '@/core/services/auth.service';
import { useQrScanStore } from '@/core/stores';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { CenteredScreen } from '@/shared/components/layout';
import { Text } from '@/shared/components/ui/text';
import { parseLoginQr } from '@/features/auth/model/login-qr';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { DeviceLoginDetails } from '@/core/types';

type Phase = 'idle' | 'checking' | 'confirm' | 'approving' | 'approved' | 'expired' | 'error';

const GONE_STATUSES: ReadonlySet<number> = new Set([404, 409, 410]);

const HOME_ORIGINS: ReadonlySet<DeviceLoginDetails['origin']> = new Set(['lan', 'loopback']);

export default function ApproveScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [details, setDetails] = useState<DeviceLoginDetails | null>(null);
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
    setPhase('checking');
    const res = await authService.deviceLoginDetails(payload.id);
    if (res.ok && res.info) {
      setDetails(res.info);
      setPhase('confirm');
    } else {
      setPhase(GONE_STATUSES.has(res.status) ? 'expired' : 'error');
    }
  }, []);

  const approve = useCallback(async () => {
    if (!details) return;
    setPhase('approving');
    const res = await authService.approveDeviceLogin(details.challengeId);
    if (res.ok) {
      setPhase('approved');
      useQrScanStore.getState().clear();
    } else {
      setPhase(GONE_STATUSES.has(res.status) ? 'expired' : 'error');
    }
  }, [details]);

  const reset = useCallback(() => {
    setDetails(null);
    useQrScanStore.getState().clear();
    setPhase('idle');
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
          <Icon name="monitor" className="text-accent-strong size-8" />
        </View>
        <Text variant="title" className="text-center">
          {t('screens.approve.title')}
        </Text>
        <Text variant="caption" className="text-foreground-secondary text-center">
          {t('screens.approve.subtitle')}
        </Text>
      </View>

      {phase === 'idle' ? (
        <Button size="lg" onPress={openScanner}>
          <Icon name="scan-barcode" />
          <Text>{t('screens.approve.scan')}</Text>
        </Button>
      ) : null}

      {phase === 'checking' ? (
        <View className="items-center gap-3">
          <Icon name="refresh-cw" className="text-accent-strong size-6" />
          <Text>{t('screens.approve.checking')}</Text>
        </View>
      ) : null}

      {phase === 'confirm' && details ? (
        <View className="gap-4">
          <View className="bg-card gap-3 rounded-3xl p-4 shadow-md shadow-black/[0.05]">
            <Text variant="headline">{t('screens.approve.confirm-title')}</Text>
            <View className="flex-row items-center gap-3">
              <Icon name={details.platform === 'desktop' ? 'monitor' : 'smartphone'} className="text-foreground-secondary size-5" />
              <View className="min-w-0 flex-1">
                <Text className="font-semibold" numberOfLines={1}>
                  {details.deviceName || t(`screens.sessions.fallback-name.${details.platform}`)}
                </Text>
                <Text variant="caption" className="text-foreground-secondary">
                  {t(`screens.sessions.platform.${details.platform}`)}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <Icon name={HOME_ORIGINS.has(details.origin) ? 'home' : 'globe'} className="text-foreground-secondary size-5" />
              <View className="min-w-0 flex-1">
                <Text>{t(`screens.approve.origin.${details.origin}`)}</Text>
                {details.ipAddress ? (
                  <Text variant="caption" className="text-foreground-secondary">
                    {t('screens.approve.address', { ip: details.ipAddress })}
                  </Text>
                ) : null}
              </View>
            </View>
            {HOME_ORIGINS.has(details.origin) ? null : (
              <View className="flex-row items-start gap-2">
                <Icon name="triangle-alert" className="text-error-strong size-5" />
                <Text variant="caption" className="flex-1">
                  {t('screens.approve.remote-warning')}
                </Text>
              </View>
            )}
            <Text variant="caption" className="text-foreground-secondary">
              {t('screens.approve.confirm-hint')}
            </Text>
          </View>
          <Button size="lg" onPress={() => void approve()}>
            <Text>{t('screens.approve.confirm')}</Text>
          </Button>
          <Button variant="outline" onPress={reset}>
            <Text>{t('common.cancel')}</Text>
          </Button>
        </View>
      ) : null}

      {phase === 'approving' ? (
        <View className="items-center gap-3">
          <Icon name="refresh-cw" className="text-accent-strong size-6" />
          <Text>{t('screens.approve.approving')}</Text>
        </View>
      ) : null}

      {phase === 'approved' ? (
        <View className="items-center gap-3">
          <Icon name="check-circle" className="text-success size-10" />
          <Text>{t('screens.approve.approved')}</Text>
        </View>
      ) : null}

      {phase === 'error' || phase === 'expired' ? (
        <View className="items-center gap-3">
          <Icon name="triangle-alert" className="text-error-strong size-8" />
          <Text variant="caption" className="text-center">
            {t(phase === 'expired' ? 'screens.approve.expired' : 'screens.approve.error')}
          </Text>
          <Button variant="outline" onPress={reset}>
            <Text>{t('common.retry')}</Text>
          </Button>
        </View>
      ) : null}
    </CenteredScreen>
  );
}
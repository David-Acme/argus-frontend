import { authService } from '@/core/services/auth.service';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { QrCode } from '@/shared/components/ui/qr-code';
import { buildLoginQr } from '@/shared/libs/login-qr';
import { useTranslation } from '@/shared/hooks/use-translation';
import { IS_NATIVE } from '@/shared/constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

const POLL_MS = 2000;
const QR_SIZE = 220;

type Phase = 'loading' | 'waiting-owner' | 'qr' | 'approved' | 'expired' | 'error';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('loading');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const createChallenge = useCallback(async () => {
    setPhase('loading');
    const res = await authService.createDeviceLogin();
    if (!res.ok || !res.info?.challengeId) {
      setPhase('error');
      return;
    }
    setChallengeId(res.info.challengeId);
    setPhase('qr');
  }, []);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    const tick = async () => {
      const res = await authService.pollDeviceLogin(id);
      if (res.ok && res.info) {
        if (res.info.status === 'approved' && res.info.accessToken && res.info.refreshToken) {
          stopPolling();
          setPhase('approved');
          return;
        }
        if (res.info.status === 'expired') {
          stopPolling();
          setChallengeId(null);
          setPhase('expired');
          return;
        }
      }
      pollTimer.current = setTimeout(() => void tick(), POLL_MS);
    };
    pollTimer.current = setTimeout(() => void tick(), POLL_MS);
  }, [stopPolling]);

  // Desktop flow: wait for the owner to register from a phone, then show the
  // QR. Mobile never reaches this screen (redirected to the face login).
  useEffect(() => {
    let active = true;
    const boot = async () => {
      const res = await authService.hasAdmin();
      if (!active) return;
      if (res.ok && res.info?.hasAdmin) {
        void createChallenge();
      } else {
        setPhase('waiting-owner');
      }
    };
    void boot();
    return () => {
      active = false;
      stopPolling();
    };
  }, [createChallenge, stopPolling]);

  useEffect(() => {
    if (phase === 'qr' && challengeId) startPolling(challengeId);
    return stopPolling;
  }, [phase, challengeId, startPolling, stopPolling]);

  useEffect(() => {
    if (phase !== 'approved') return;
    const timer = setTimeout(() => router.replace('/'), 600);
    return () => clearTimeout(timer);
  }, [phase, router]);

  const retryOwner = useCallback(async () => {
    const res = await authService.hasAdmin();
    if (res.ok && res.info?.hasAdmin) {
      void createChallenge();
    } else {
      setPhase('waiting-owner');
    }
  }, [createChallenge]);

  const refreshChallenge = useCallback(() => {
    setChallengeId(null);
    void createChallenge();
  }, [createChallenge]);

  if (IS_NATIVE) return <Redirect href="/welcome/face?mode=login" />;

  return (
    <View
      className="bg-background flex-1 w-full max-w-md self-center items-center justify-center gap-6 px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <View className="items-center gap-2">
        <Text variant="h3">{t('screens.login.title')}</Text>
        <Text className="text-foreground-secondary text-center text-sm leading-5">
          {t('screens.login.subtitle')}
        </Text>
      </View>

      {phase === 'loading' || phase === 'waiting-owner' ? (
        <View className="items-center gap-3">
          <Icon name="refresh-cw" className="text-accent size-6" />
          <Text variant="muted" className="text-center">
            {phase === 'loading'
              ? t('screens.login.preparing')
              : t('screens.login.waiting-owner')}
          </Text>
        </View>
      ) : null}

      {phase === 'qr' && challengeId ? (
        <>
          <View className="rounded-2xl border border-border bg-white p-4 shadow-lg shadow-black/5">
            <QrCode value={buildLoginQr(challengeId)} size={QR_SIZE} color="#181816" />
          </View>
          <Text variant="muted" className="text-center">
            {t('screens.login.qr-hint')}
          </Text>
          <Button variant="outline" onPress={refreshChallenge}>
            <Icon name="refresh-cw" />
            <Text>{t('screens.login.new-code')}</Text>
          </Button>
        </>
      ) : null}

      {phase === 'approved' ? (
        <View className="items-center gap-3">
          <Icon name="check-circle" className="text-success size-10" />
          <Text>{t('screens.login.approved')}</Text>
        </View>
      ) : null}

      {phase === 'expired' || phase === 'error' ? (
        <View className="items-center gap-3">
          <Icon name="triangle-alert" className="text-error size-8" />
          <Text variant="muted" className="text-center">
            {t(phase === 'expired' ? 'screens.login.expired' : 'screens.login.error')}
          </Text>
          <Button variant="outline" onPress={phase === 'expired' ? refreshChallenge : retryOwner}>
            <Text>{t('common.retry')}</Text>
          </Button>
        </View>
      ) : null}

      {phase === 'waiting-owner' ? (
        <Button variant="outline" onPress={retryOwner}>
          <Text>{t('screens.login.owner-done')}</Text>
        </Button>
      ) : null}
    </View>
  );
}

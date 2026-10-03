import { inviteService } from '@/core/services/invite';
import { useQrScanStore } from '@/core/stores';
import { CenteredScreen } from '@/shared/components/layout';
import { Panel } from '@/shared/components/ui/panel';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { parseInvitationQr } from '@/shared/libs/invitation-qr';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

type InvitationPhase = 'idle' | 'resolving' | 'accepted' | 'error';

function InvitationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const status = useQrScanStore((state) => state.status);
  const value = useQrScanStore((state) => state.value);
  const [phase, setPhase] = useState<InvitationPhase>('idle');

  const openScanner = useCallback(() => {
    useQrScanStore.getState().open({ purpose: 'invite' });
    router.push('/qr');
  }, [router]);

  useEffect(() => {
    if (status !== 'scanned' || !value || phase !== 'idle') return;
    useQrScanStore.getState().clear();
    const qr = parseInvitationQr(value);
    if (!qr) {
      queueMicrotask(() => setPhase('error'));
      return;
    }

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setPhase('resolving');
      void inviteService.accept(qr).then((response) => {
        if (!active) return;
        if (!response.ok || !response.info) {
          setPhase('error');
          return;
        }
        setPhase('accepted');
        router.replace({
          pathname: '/welcome/face',
          params: { mode: 'invite-enroll', inviteToken: qr.token },
        });
      });
    });
    return () => {
      active = false;
    };
  }, [phase, router, status, value]);

  const retry = useCallback(() => {
    setPhase('idle');
    openScanner();
  }, [openScanner]);

  return (
    <CenteredScreen maxWidth={448} className="items-stretch">
      <View className="gap-1.5">
        <Text variant="title">{t('screens.invitation.title')}</Text>
        <Text variant="caption" className="text-foreground-secondary">
          {t('screens.invitation.subtitle')}
        </Text>
      </View>

      <Panel title={t('screens.invitation.scan-title')} className="gap-4">
        {phase === 'idle' ? (
          <Button size="lg" onPress={openScanner}>
            <Icon name="scan-barcode" />
            <Text>{t('screens.invitation.scan')}</Text>
          </Button>
        ) : null}

        {phase === 'resolving' ? (
          <View className="flex-row items-center gap-3 py-1">
            <Icon name="refresh-cw" className="text-accent-strong size-5" />
            <Text>{t('screens.invitation.validating')}</Text>
          </View>
        ) : null}

        {phase === 'accepted' ? (
          <View className="flex-row items-center gap-3 py-1">
            <Icon name="check-circle" className="text-success size-5" />
            <Text>{t('screens.invitation.accepted')}</Text>
          </View>
        ) : null}

        {phase === 'error' ? (
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <Icon name="triangle-alert" className="text-error-strong size-5" />
              <Text variant="body" className="text-error-strong flex-1">
                {t('screens.invitation.error')}
              </Text>
            </View>
            <Button variant="outline" onPress={retry}>
              <Text>{t('common.retry')}</Text>
            </Button>
          </View>
        ) : null}
      </Panel>
    </CenteredScreen>
  );
}

export default function InvitationRoute() {
  return IS_NATIVE ? <InvitationScreen /> : <Redirect href="/welcome" />;
}

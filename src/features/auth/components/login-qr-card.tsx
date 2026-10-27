import { View } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { IS_NATIVE, QR_COLORS } from '@/shared/constants';
import { LazyQrCode } from '@/shared/components/ui/lazy-qr-code';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import type { LoginQr } from '@/features/auth/hooks/use-login-qr';
import { countdownOf, secondsLeft } from '@/features/auth/model/login-countdown';
import { buildLoginQr } from '@/features/auth/model/login-qr';

export type LoginQrCardProps = { qr: LoginQr };

type WaitLineProps = { text: string };

const PHONE = IS_NATIVE;

const STEPS: readonly TranslationKey[] = [
  PHONE ? 'screens.login.steps.open-phone' : 'screens.login.steps.open',
  'screens.login.steps.approve',
  'screens.login.steps.confirm',
];

const QR_FRAME = { backgroundColor: QR_COLORS.background };

function WaitLine({ text }: WaitLineProps) {
  return (
    <View className="flex-row items-center justify-center gap-2" accessibilityLiveRegion="polite">
      <View className="size-dot bg-accent rounded-full" />
      <Text variant="meta" tone="2">
        {text}
      </Text>
    </View>
  );
}

function waitText(qr: LoginQr): TranslationKey | 'countdown' {
  if (qr.phase === 'loading') return 'screens.login.preparing';
  if (qr.phase === 'expired') return 'screens.login.expired';
  if (qr.phase === 'approved') return 'screens.login.approved';
  return 'countdown';
}

export function LoginQrCard({ qr }: LoginQrCardProps) {
  const { t } = useTranslation();
  const now = useNow(1000);
  const left = secondsLeft(qr.expiresAt, now);
  const line = waitText(qr);
  const waiting = PHONE ? 'screens.login.waiting-phone' : 'screens.login.waiting';
  return (
    <>
      {qr.challengeId && qr.phase !== 'loading' ? (
        <View
          className="rounded-media p-4"
          style={QR_FRAME}
          role="img"
          aria-label={t('screens.login.qr-label')}>
          <LazyQrCode value={buildLoginQr(qr.challengeId)} size={size.loginQr} quietZone={0} />
        </View>
      ) : (
        <View className="size-login-qr rounded-media bg-fill" aria-hidden />
      )}
      <WaitLine text={line === 'countdown' ? t(waiting, { time: countdownOf(left) }) : t(line)} />
      <View className="w-full gap-3">
        {STEPS.map((step, index) => (
          <View key={step} className="flex-row items-center gap-3">
            <View className="size-step-number bg-fill items-center justify-center rounded-full">
              <Text variant="caption">{String(index + 1)}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text variant="body">{t(step)}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

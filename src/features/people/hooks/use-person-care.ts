import { useTranslation } from '@/shared/hooks/use-translation';
import type { Ask } from '@/features/people/hooks/use-ask';
import { useBiometricErase } from '@/features/people/hooks/use-biometric-erase';
import { usePortraitVerification } from '@/features/people/hooks/use-portrait-verification';
import { useVoiceRecognition } from '@/features/people/hooks/use-voice-recognition';
import type { PersonLine, PersonRights } from '@/features/people/model/people';

type CareInput = { person: PersonLine; rights: PersonRights; ask: Ask['ask'] };

export function usePersonCare({ person, rights, ask }: CareInput) {
  const { t } = useTranslation();
  const userId = Number(person.id);
  const name = person.name;
  const voice = useVoiceRecognition(userId, rights.voice);
  const biometrics = useBiometricErase();
  const portrait = usePortraitVerification();

  const forgetVoice = () =>
    ask({
      title: t('screens.users.voice.forget-title', { name }),
      body: t('screens.users.voice.forget-description'),
      confirmLabel: t('screens.users.voice.forget'),
      destructive: true,
      run: () => voice.forget({ userId, name }),
    });

  const eraseBiometrics = () =>
    ask({
      title: t('screens.users.biometrics.confirm-title', { name }),
      body: t('screens.users.biometrics.confirm-description', { name }),
      confirmLabel: t('screens.users.biometrics.erase'),
      destructive: true,
      run: () => biometrics.erase({ userId, name }),
    });

  return {
    voice: voice.voice,
    forgetVoice,
    eraseBiometrics,
    erasing: biometrics.pending,
    portrait: {
      uri: portrait.uri,
      loading: portrait.loading,
      verify: () => portrait.verify(person.id),
    },
  };
}

export type PersonCare = ReturnType<typeof usePersonCare>;

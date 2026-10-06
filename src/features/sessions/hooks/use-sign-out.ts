import { useCallback, useState } from 'react';
import { authService } from '@/core/services/auth.service';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';

export function useSignOut() {
  const { t } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    const accepted = await confirm({
      title: t('screens.sessions.confirm-here-title'),
      description: t('screens.sessions.confirm-here-description'),
      confirmLabel: t('screens.sessions.close-here'),
      intent: 'warning',
    });
    if (!accepted) return;
    setSigningOut(true);
    try {
      await authService.logout('closed-here');
    } finally {
      setSigningOut(false);
    }
  }, [t]);

  return { signOut, signingOut };
}

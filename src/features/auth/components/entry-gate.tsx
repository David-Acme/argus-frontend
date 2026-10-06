import { Redirect, usePathname } from 'expo-router';
import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { authService } from '@/core/services/auth.service';
import { sessionService } from '@/core/services/session.service';
import { moduleOfAppRoute } from '@/core/services/modules/module-state';
import { useAuthStore } from '@/core/stores';
import { CONTEXT_WAIT_MS, IS_NATIVE } from '@/shared/constants';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useExpiry } from '@/shared/hooks/use-expiry';
import { routeFallback } from '@/shared/libs/route-access';
import { BrandSplash } from '@/features/auth/components/brand-splash';
import { ServerUnreachable } from '@/features/auth/components/server-unreachable';
import { nextHref } from '@/features/auth/model/onboarding-flow';

type EntryDestination = 'welcome' | 'owner-enroll' | 'login' | 'unreachable';

async function resolveEntry(): Promise<EntryDestination> {
  const pairing = await sessionService.getPairingState();
  if (!pairing.paired) return 'welcome';
  if (!IS_NATIVE) return 'login';
  const status = await authService.serverStatus();
  if (!status.ok || !status.info) return 'unreachable';
  return status.info.hasOwner ? 'login' : 'owner-enroll';
}

function EntryRedirect() {
  const [destination, setDestination] = useState<EntryDestination | null>(null);

  const retry = useCallback(() => {
    setDestination(null);
    void resolveEntry().then(setDestination);
  }, []);

  useEffect(() => {
    let current = true;
    void resolveEntry().then((next) => {
      if (current) setDestination(next);
    });
    return () => {
      current = false;
    };
  }, []);

  if (destination === null) return <BrandSplash />;
  if (destination === 'unreachable') return <ServerUnreachable onRetry={retry} />;
  if (destination === 'welcome') return <Redirect href="/welcome" />;
  if (destination === 'owner-enroll') return <Redirect href={nextHref('owner', 'pair', { native: IS_NATIVE }) ?? '/welcome'} />;
  return IS_NATIVE ? <Redirect href="/welcome/face?mode=login" /> : <Redirect href="/login" />;
}

export function EntryGate({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const pathname = usePathname();
  const view = useAccessView();
  const pending = status === 'signed-in' && !view.ready && moduleOfAppRoute(pathname) !== null;
  const waitedOut = useExpiry(pending, CONTEXT_WAIT_MS);
  if (status === 'signed-in') {
    if (pending && !waitedOut) return <BrandSplash />;
    const fallback = routeFallback(pathname, view);
    return fallback ? <Redirect href={fallback} /> : children;
  }
  if (status === 'loading') return <BrandSplash />;
  return <EntryRedirect />;
}

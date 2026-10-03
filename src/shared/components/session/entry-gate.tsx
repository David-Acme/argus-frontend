import { Redirect, usePathname } from 'expo-router';
import { useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import { authService } from '@/core/services/auth.service';
import { sessionService } from '@/core/services/session.service';
import { useAuthStore } from '@/core/stores';
import { IS_NATIVE } from '@/shared/constants';
import { routeFallback } from '@/shared/libs/route-access';
import { BrandSplash } from './brand-splash';
import { ServerUnreachable } from './server-unreachable';

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
  if (destination === 'owner-enroll') return <Redirect href="/welcome/face?mode=owner-enroll" />;
  return IS_NATIVE ? <Redirect href="/welcome/face?mode=login" /> : <Redirect href="/login" />;
}

export function EntryGate({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role ?? 'guest');
  const pathname = usePathname();
  if (status === 'signed-in') {
    const fallback = routeFallback(pathname, role);
    return fallback ? <Redirect href={fallback} /> : children;
  }
  if (status === 'loading') return <BrandSplash />;
  return <EntryRedirect />;
}

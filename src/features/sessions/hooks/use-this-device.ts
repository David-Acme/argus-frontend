import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { authService } from '@/core/services/auth.service';
import { netService } from '@/core/services/net';
import { pushService } from '@/core/services/push';
import type { NetPairedInstance } from '@/core/types';

export function useThisDevice() {
  const router = useRouter();
  const [instance, setInstance] = useState<NetPairedInstance | null>(null);

  const unpair = async () => {
    await pushService.unpair();
    await authService.logout();
    await netService.unpair();
    router.replace('/');
  };

  useEffect(() => {
    let active = true;
    void netService.instance().then((current) => {
      if (active) setInstance(current);
    });
    return () => {
      active = false;
    };
  }, []);

  return { instance, unpair };
}

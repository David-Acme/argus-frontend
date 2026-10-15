import { useEffect } from 'react';
import { IS_TAURI } from '@/shared/constants';
import { startDesktopBridge, type LinkPath } from '@/core/services/desktop/desktop-bridge';
import { httpService } from '@/core/services/http';

export function useDesktopBridge(linkPath: LinkPath): void {
  useEffect(() => {
    if (!IS_TAURI) return;
    const stopping = startDesktopBridge(linkPath, httpService);
    return () => {
      void stopping.then((stop) => stop(), () => undefined);
    };
  }, [linkPath]);
}

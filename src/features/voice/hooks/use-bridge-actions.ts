import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useAuthStore } from '@/core/stores';
import { useAccessView, useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { actionRunner } from '@/features/voice/services/actions/action-runner';
import { assistantChat } from '@/features/voice/services/chat';
import { argusResults } from '@/features/voice/services/results';
import { voiceService } from '@/features/voice/services/voice';

export function useBridgeActions(lastEventCamera: RefObject<string | null>): void {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const view = useAccessView();
  const { cameraActions, guard } = useCapabilities();
  const watchesCameras = cameraActions.watch;
  const setsGuardMode = guard.setMode;
  const pathRef = useRef(pathname);
  const accessRef = useRef(view);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    accessRef.current = view;
  }, [view]);

  useEffect(() => {
    if (!user) return;
    const run = actionRunner({
      t,
      push: (href) => router.push(href),
      path: () => pathRef.current,
      access: () => accessRef.current,
      lastEventCamera: () => lastEventCamera.current,
      watchesCameras,
      setsGuardMode,
    });
    let queue = Promise.resolve();
    const settle = (inCall: boolean) => async (action: Parameters<typeof run>[0]) => {
      argusResults.recordAction(action);
      const settlement = await run(action, inCall);
      argusResults.settleAction(action, settlement);
      return settlement.outcome;
    };
    const inCall = settle(true);
    const inChat = settle(false);
    const unsubscribers = [
      voiceService.onAction((action) => {
        queue = queue.then(async () =>
          voiceService.completeAction(action.id, await inCall(action))
        );
      }),
      assistantChat.onAction((action) => {
        queue = queue.then(async () =>
          assistantChat.completeAction(action.id, await inChat(action))
        );
      }),
    ];
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [lastEventCamera, router, setsGuardMode, t, user, watchesCameras]);
}

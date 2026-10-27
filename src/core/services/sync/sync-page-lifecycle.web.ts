import type { PageLifecycleHandlers } from '@/core/types';

export function watchPageLifecycle({ leave, back }: PageLifecycleHandlers): () => void {
  const onHide = (): void => leave();
  const onShow = (event: PageTransitionEvent): void => {
    if (event.persisted) back();
  };
  window.addEventListener('pagehide', onHide);
  window.addEventListener('pageshow', onShow);
  return () => {
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('pageshow', onShow);
  };
}

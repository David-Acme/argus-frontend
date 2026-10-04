import { IS_TAURI } from '@/shared/constants';

type ExitListener = () => void;

async function tauriWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export async function enterWindowFullscreen(): Promise<void> {
  try {
    if (IS_TAURI) {
      await (await tauriWindow()).setFullscreen(true);
      return;
    }
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    return;
  }
}

export async function exitWindowFullscreen(): Promise<void> {
  try {
    if (IS_TAURI) {
      await (await tauriWindow()).setFullscreen(false);
      return;
    }
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    return;
  }
}

export function onWindowFullscreenExit(listener: ExitListener): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') listener();
  };
  const onChange = () => {
    if (!document.fullscreenElement) listener();
  };
  window.addEventListener('keydown', onKey);
  document.addEventListener('fullscreenchange', onChange);
  return () => {
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onChange);
  };
}

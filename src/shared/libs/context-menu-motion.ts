export type ContextMenuPlatform = 'android' | 'ios';

type ContextMenuMotion = {
  enterDuration: number;
  exitDuration: number;
  initialScale: number;
};

export function contextMenuMotion(platform: ContextMenuPlatform): ContextMenuMotion {
  return platform === 'ios'
    ? { enterDuration: 160, exitDuration: 120, initialScale: 0.98 }
    : { enterDuration: 120, exitDuration: 90, initialScale: 0.985 };
}

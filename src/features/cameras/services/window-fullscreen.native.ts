import * as ScreenOrientation from 'expo-screen-orientation';
import { Dimensions } from 'react-native';

type ExitListener = () => void;

const TABLET_MIN_SIDE = 600;

let restoreLock: ScreenOrientation.OrientationLock | null = null;
let heldPortrait = false;

function isPhone(): boolean {
  const { width, height } = Dimensions.get('screen');
  return Math.min(width, height) < TABLET_MIN_SIDE;
}

export async function enterWindowFullscreen(): Promise<void> {
  if (!isPhone()) return;
  try {
    if (!heldPortrait) restoreLock ??= await ScreenOrientation.getOrientationLockAsync();
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  } catch {
    return;
  }
}

export async function exitWindowFullscreen(): Promise<void> {
  if (restoreLock == null) return;
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    heldPortrait = true;
  } catch {
    return;
  }
}

export async function releaseWindowOrientation(): Promise<void> {
  const previous = restoreLock;
  restoreLock = null;
  heldPortrait = false;
  if (previous == null) return;
  try {
    if (previous === ScreenOrientation.OrientationLock.DEFAULT) await ScreenOrientation.unlockAsync();
    else await ScreenOrientation.lockAsync(previous);
  } catch {
    return;
  }
}

export function onWindowFullscreenExit(_listener: ExitListener): () => void {
  return () => undefined;
}

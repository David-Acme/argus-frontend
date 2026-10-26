import { Platform } from 'react-native';

export const IS_WEB = Platform.OS === 'web';

export const IS_NATIVE = !IS_WEB;

export const IS_ANDROID = Platform.OS === 'android';

export const IS_IOS = Platform.OS === 'ios';

export const IS_TAURI = IS_WEB && '__TAURI_INTERNALS__' in window;

const APPLE_PLATFORM = /Mac|iPhone|iPad/;

export const COMMAND_KEY =
  IS_IOS || (IS_WEB && APPLE_PLATFORM.test(globalThis.navigator?.platform ?? '')) ? '⌘K' : 'Ctrl K';

export const TOAST_DEFAULT_MS = 4000;
export const TOAST_ACTION_MS = 6000;
export const TOAST_MAX_VISIBLE = 3;
export const TOAST_SWIPE_PX = 48;

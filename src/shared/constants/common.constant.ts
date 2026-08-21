import { Platform } from 'react-native';

export const IS_WEB = Platform.OS === 'web';

export const IS_NATIVE = !IS_WEB;

export const IS_ANDROID = Platform.OS === 'android';

export const IS_IOS = Platform.OS === 'ios';

export const IS_TAURI = IS_WEB && '__TAURI_INTERNALS__' in window;

/** How long a toast stays up, and how many can stack before the oldest goes. */
export const TOAST_DEFAULT_MS = 4000;
export const TOAST_MAX_VISIBLE = 3;

import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import type { IPermissionsService } from '@/core/interfaces';
import { storageService } from '@/core/services/storage';
import type { PermissionAnswer, RuntimePermission } from '@/core/types';
import { BLUETOOTH_CONNECT_API, IS_ANDROID, PERMISSION_ASKED_KEY, PERMISSION_BLOCKED_KEY } from '@/shared/constants';

const ALWAYS: PermissionAnswer = { granted: true, canAskAgain: true };

const bluetoothAsked = (): boolean =>
  IS_ANDROID && typeof Platform.Version === 'number' && Platform.Version >= BLUETOOTH_CONNECT_API;

const answerOf = ({ granted, canAskAgain }: PermissionAnswer): PermissionAnswer => ({ granted, canAskAgain });

function bluetoothBlocked(): boolean {
  try {
    return storageService.getBoolean(`${PERMISSION_BLOCKED_KEY}bluetooth`) === true;
  } catch {
    return false;
  }
}

async function readBluetooth(): Promise<PermissionAnswer> {
  if (!bluetoothAsked()) return ALWAYS;
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  return { granted, canAskAgain: granted || !bluetoothBlocked() };
}

async function requestBluetooth(): Promise<PermissionAnswer> {
  if (!bluetoothAsked()) return ALWAYS;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  const blocked = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
  try {
    storageService.set(`${PERMISSION_BLOCKED_KEY}bluetooth`, blocked);
  } catch {
  }
  return { granted: result === PermissionsAndroid.RESULTS.GRANTED, canAskAgain: !blocked };
}

export const permissionsService: IPermissionsService = {
  async read(kind: RuntimePermission) {
    if (kind === 'microphone') return answerOf(await getRecordingPermissionsAsync());
    if (kind === 'notifications') return answerOf(await Notifications.getPermissionsAsync());
    return readBluetooth();
  },
  async request(kind: RuntimePermission) {
    if (kind === 'microphone') return answerOf(await requestRecordingPermissionsAsync());
    if (kind === 'notifications') return answerOf(await Notifications.requestPermissionsAsync());
    return requestBluetooth();
  },
  async openSettings() {
    await Linking.openSettings();
  },
  asked(kind: RuntimePermission) {
    try {
      return storageService.getBoolean(`${PERMISSION_ASKED_KEY}${kind}`) === true;
    } catch {
      return false;
    }
  },
  markAsked(kind: RuntimePermission) {
    try {
      storageService.set(`${PERMISSION_ASKED_KEY}${kind}`, true);
    } catch {
    }
  },
};

import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking } from 'react-native';
import type { DevicePermission, DevicePermissionId } from '@/core/types';
import { pushService } from '@/core/services/push';
import { log } from '@/core/services/log';
import { IS_ANDROID, IS_IOS, IS_TAURI } from '@/shared/constants';
import {
  missingRuntime,
  permissionsFor,
  visiblePermissions,
  type PermissionPlatform,
  type PermissionPurpose,
} from '@/shared/libs/device-permissions';

const PLATFORM: PermissionPlatform = IS_ANDROID ? 'android' : IS_IOS ? 'ios' : IS_TAURI ? 'desktop' : 'browser';

async function granted(id: DevicePermissionId): Promise<boolean> {
  switch (id) {
    case 'microphone':
      return (await getRecordingPermissionsAsync()).granted;
    case 'notifications':
      return pushService.notificationsPermitted();
    case 'background':
      return pushService.backgroundAllowed();
    case 'full-screen':
      return pushService.fullScreenAllowed();
    case 'exact-alarms':
      return pushService.exactAlarmsAllowed();
  }
}

async function askRuntime(id: DevicePermissionId): Promise<boolean> {
  if (id === 'microphone') {
    const answer = await requestRecordingPermissionsAsync();
    return answer.granted || answer.canAskAgain;
  }
  if (id === 'notifications') return pushService.requestNotificationsPermission();
  return true;
}

async function request(id: DevicePermissionId): Promise<void> {
  switch (id) {
    case 'microphone':
    case 'notifications': {
      if (!(await askRuntime(id))) await Linking.openSettings();
      return;
    }
    case 'background':
      pushService.requestBackground();
      return;
    case 'full-screen':
      pushService.openFullScreenSettings();
      return;
    case 'exact-alarms':
      pushService.openExactAlarmSettings();
      return;
  }
}

async function readAll(ids: readonly DevicePermissionId[]): Promise<DevicePermission[] | null> {
  try {
    return await Promise.all(ids.map(async (id) => ({ id, granted: await granted(id) })));
  } catch (error) {
    log.error('permissions', 'the device permissions could not be read', error);
    return null;
  }
}

export type DevicePermissions = {
  permissions: DevicePermission[];
  loaded: boolean;
  allGranted: boolean;
  request: (id: DevicePermissionId) => void;
  requestRuntime: () => Promise<void>;
};

export function useDevicePermissions(purpose: PermissionPurpose): DevicePermissions {
  const ids = useMemo(() => permissionsFor(PLATFORM, purpose), [purpose]);
  const [permissions, setPermissions] = useState<DevicePermission[] | null>(null);
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(() => setGeneration((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    void readAll(ids).then((states) => {
      if (alive && states) setPermissions(states);
    });
    return () => {
      alive = false;
    };
  }, [ids, generation]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const ask = useCallback(
    (id: DevicePermissionId) => {
      void request(id)
        .catch((error: unknown) => log.error('permissions', 'the permission could not be requested', error))
        .finally(refresh);
    },
    [refresh],
  );

  const requestRuntime = useCallback(async () => {
    for (const id of missingRuntime(permissions ?? [])) {
      try {
        await askRuntime(id);
      } catch (error) {
        log.error('permissions', 'the permission could not be requested', error);
      }
    }
    refresh();
  }, [permissions, refresh]);

  const states = permissions ?? [];
  return {
    permissions: visiblePermissions(states, purpose),
    loaded: permissions !== null,
    allGranted: permissions !== null && states.every(({ granted }) => granted),
    request: ask,
    requestRuntime,
  };
}

import { create } from 'zustand';
import { storageService } from '@/core/services/storage';
import { IS_WEB, MICROPHONE_STORAGE_KEY } from '@/shared/constants';

export type Microphone = { deviceId: string; label: string };

export type MicrophoneState = {
  devices: readonly Microphone[];
  choice: Microphone | null;
  lost: Microphone | null;
};

export type MicrophoneRefresh = { devices: readonly Microphone[]; lost: Microphone | null };

type DeviceEntry = Pick<MediaDeviceInfo, 'deviceId' | 'kind' | 'label'>;

const SYSTEM_IDS = new Set(['', 'default', 'communications']);

export function microphonesOf(entries: readonly DeviceEntry[]): Microphone[] {
  return entries
    .filter((entry) => entry.kind === 'audioinput' && !SYSTEM_IDS.has(entry.deviceId))
    .map((entry) => ({ deviceId: entry.deviceId, label: entry.label.trim() }));
}

export function lostChoiceOf(
  choice: Microphone | null,
  devices: readonly Microphone[]
): Microphone | null {
  if (choice === null || devices.length === 0) return null;
  return devices.some((device) => device.deviceId === choice.deviceId) ? null : choice;
}

export function audioConstraintsOf(
  base: MediaTrackConstraints,
  choice: Microphone | null
): MediaTrackConstraints {
  return choice === null ? base : { ...base, deviceId: { ideal: choice.deviceId } };
}

export const microphonesSupported = (): boolean =>
  IS_WEB &&
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.enumerateDevices === 'function';

function storedChoice(): Microphone | null {
  const stored = storageService.getObject<Microphone>(MICROPHONE_STORAGE_KEY);
  return stored && typeof stored.deviceId === 'string' && stored.deviceId.length > 0
    ? stored
    : null;
}

export const useMicrophoneStore = create<MicrophoneState>(() => ({
  devices: [],
  choice: microphonesSupported() ? storedChoice() : null,
  lost: null,
}));

export function chooseMicrophone(choice: Microphone | null): void {
  if (choice === null) storageService.remove(MICROPHONE_STORAGE_KEY);
  else storageService.setObject(MICROPHONE_STORAGE_KEY, choice);
  useMicrophoneStore.setState({ choice });
}

export async function refreshMicrophones(): Promise<MicrophoneRefresh> {
  if (!microphonesSupported()) return { devices: [], lost: null };
  const devices = microphonesOf(await navigator.mediaDevices.enumerateDevices());
  const lost = lostChoiceOf(useMicrophoneStore.getState().choice, devices);
  if (lost) chooseMicrophone(null);
  useMicrophoneStore.setState(lost ? { devices, lost } : { devices });
  return { devices, lost };
}

export const forgetLostMicrophone = (): void => useMicrophoneStore.setState({ lost: null });

export const chosenMicrophone = (): Microphone | null => useMicrophoneStore.getState().choice;

export function onMicrophonesChange(listener: () => void): () => void {
  if (!microphonesSupported()) return () => undefined;
  navigator.mediaDevices.addEventListener('devicechange', listener);
  return () => navigator.mediaDevices.removeEventListener('devicechange', listener);
}

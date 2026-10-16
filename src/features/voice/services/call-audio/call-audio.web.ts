import { invoke } from '@tauri-apps/api/core';
import type { CallAudioDevice, ICallAudio } from '@/core/types';
import { log } from '@/core/services/log';
import { IS_TAURI } from '@/shared/constants';
import { desktopDevicesOf } from '@/features/voice/model/call-audio';

class DesktopCallAudio implements ICallAudio {
  readonly support = { devices: true, routePicker: false };
  private readonly listeners = new Set<() => void>();

  async devices(): Promise<CallAudioDevice[]> {
    try {
      return desktopDevicesOf(await invoke<unknown>('argus_rtc_devices'));
    } catch (error) {
      log.error('voice', 'the desktop audio devices are unavailable', error);
      return [];
    }
  }

  async select(device: CallAudioDevice): Promise<void> {
    if (device.direction === 'route') return;
    try {
      await invoke('argus_rtc_select_device', { request: { direction: device.direction, id: device.id } });
      for (const listener of this.listeners) listener();
    } catch (error) {
      log.error('voice', 'the desktop audio device could not be selected', error);
    }
  }

  async showRoutePicker(): Promise<void> {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

class BrowserCallAudio implements ICallAudio {
  readonly support = { devices: false, routePicker: false };

  async devices(): Promise<CallAudioDevice[]> {
    return [];
  }

  async select(): Promise<void> {}

  async showRoutePicker(): Promise<void> {}

  subscribe(): () => void {
    return () => undefined;
  }
}

const audio: ICallAudio = IS_TAURI ? new DesktopCallAudio() : new BrowserCallAudio();

export function currentCallAudio(): ICallAudio {
  return audio;
}

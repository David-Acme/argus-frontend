import type { CallAudioDevice, CallAudioKind, ICallAudio } from '@/core/types';
import { pushService } from '@/core/services/push';
import { log } from '@/core/services/log';
import { IS_ANDROID, IS_IOS } from '@/shared/constants';
import { livekitOutputKind } from '@/features/voice/model/call-audio';

const importLivekit = () => import('@livekit/react-native');
let livekitModule: ReturnType<typeof importLivekit> | undefined;
const livekit = () => (livekitModule ??= importLivekit());

class TelecomCallAudio implements ICallAudio {
  readonly support = { devices: true, routePicker: false };

  async devices(): Promise<CallAudioDevice[]> {
    return pushService.callEndpoints().map((endpoint) => ({ ...endpoint, direction: 'route' }));
  }

  async select(device: CallAudioDevice): Promise<void> {
    pushService.selectCallEndpoint(device.id);
  }

  async showRoutePicker(): Promise<void> {}

  subscribe(listener: () => void): () => void {
    return pushService.onCallControl((action) => {
      if (action === 'endpoints') listener();
    });
  }
}

class SessionCallAudio implements ICallAudio {
  readonly support = { devices: true, routePicker: IS_IOS };
  private selected: string | null = null;
  private readonly listeners = new Set<() => void>();

  async devices(): Promise<CallAudioDevice[]> {
    try {
      const { AudioSession } = await livekit();
      const outputs = await AudioSession.getAudioOutputs();
      return outputs.map((id, index) => {
        const kind: CallAudioKind = livekitOutputKind(id);
        return { id, kind, direction: 'route', name: id, active: this.selected === null ? index === 0 : this.selected === id };
      });
    } catch (error) {
      log.error('voice', 'the call audio outputs are unavailable', error);
      return [];
    }
  }

  async select(device: CallAudioDevice): Promise<void> {
    try {
      const { AudioSession } = await livekit();
      await AudioSession.selectAudioOutput(device.id);
      this.selected = device.id;
      for (const listener of this.listeners) listener();
    } catch (error) {
      log.error('voice', 'the call audio output could not be selected', error);
    }
  }

  async showRoutePicker(): Promise<void> {
    if (!IS_IOS) return;
    try {
      const { AudioSession } = await livekit();
      await AudioSession.showAudioRoutePicker();
    } catch (error) {
      log.error('voice', 'the audio route picker could not be shown', error);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

const telecom = new TelecomCallAudio();
const session = new SessionCallAudio();

export function currentCallAudio(): ICallAudio {
  return IS_ANDROID && pushService.telecomCallActive() ? telecom : session;
}

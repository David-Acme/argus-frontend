import { Channel, invoke } from '@tauri-apps/api/core';
import type { IRealtimeCall } from '@/core/interfaces';
import type { RtcEvent, RtcJoin } from '@/core/types';

export class TauriRealtimeCall implements IRealtimeCall {
  private channel: Channel<RtcEvent> | null = null;

  async join(join: RtcJoin, listener: (event: RtcEvent) => void): Promise<void> {
    const channel = new Channel<RtcEvent>();
    channel.onmessage = (event) => {
      if (this.channel === channel) listener(event);
    };
    this.channel = channel;
    try {
      await invoke('argus_rtc_join', { request: join, onEvent: channel });
    } catch (error) {
      if (this.channel === channel) this.channel = null;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async setMicrophone(enabled: boolean): Promise<void> {
    await invoke('argus_rtc_microphone', { enabled });
  }

  async send(topic: string, payload: string): Promise<void> {
    await invoke('argus_rtc_send', { request: { topic, payload } });
  }

  async leave(): Promise<void> {
    this.channel = null;
    await invoke('argus_rtc_leave');
  }
}

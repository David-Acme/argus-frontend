import { Channel, invoke } from '@tauri-apps/api/core';
import type { IRealtimeCall } from '@/core/interfaces';
import type { RtcEvent, RtcJoin } from '@/core/types';
import { desktopDevicesOf, inputNamed } from '@/features/voice/model/call-audio';
import type { MicrophoneChoice, MicrophoneSource } from './rtc-livekit';

export class TauriRealtimeCall implements IRealtimeCall {
  private channel: Channel<RtcEvent> | null = null;
  private stopMicrophoneWatch: () => void = () => undefined;

  constructor(private readonly microphone?: MicrophoneSource) {}

  async join(join: RtcJoin, listener: (event: RtcEvent) => void): Promise<void> {
    const channel = new Channel<RtcEvent>();
    channel.onmessage = (event) => {
      if (this.channel === channel) listener(event);
    };
    this.channel = channel;
    try {
      await invoke('argus_rtc_join', { request: join, onEvent: channel });
      await this.useMicrophone(this.microphone?.chosen() ?? null);
      this.stopMicrophoneWatch =
        this.microphone?.watch((choice) => void this.useMicrophone(choice)) ?? (() => undefined);
    } catch (error) {
      if (this.channel === channel) this.channel = null;
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async setMicrophone(enabled: boolean): Promise<void> {
    await invoke('argus_rtc_microphone', { enabled });
  }

  microphoneOn(): boolean {
    return false;
  }

  async send(topic: string, payload: string): Promise<void> {
    await invoke('argus_rtc_send', { request: { topic, payload } });
  }

  async leave(): Promise<void> {
    this.channel = null;
    this.stopMicrophoneWatch();
    this.stopMicrophoneWatch = () => undefined;
    await invoke('argus_rtc_leave');
  }

  private async useMicrophone(choice: MicrophoneChoice | null): Promise<void> {
    if (!choice) return;
    const input = inputNamed(
      desktopDevicesOf(await invoke<unknown>('argus_rtc_devices')),
      choice.label
    );
    if (input)
      await invoke('argus_rtc_select_device', { request: { direction: 'input', id: input.id } });
  }
}

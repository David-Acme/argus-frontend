import type { Participant, RemoteParticipant, RemoteTrack, Room } from 'livekit-client';
import type { IRealtimeCall } from '@/core/interfaces';
import type { RtcEvent, RtcJoin } from '@/core/types';
import { decodeUtf8, encodeUtf8, endReasonOf } from '@/features/voice/model/rtc-protocol';

type Listener = (event: RtcEvent) => void;

export type LivekitCallOptions = {
  attachAudio: boolean;
  prepare?: (join: RtcJoin) => Promise<RtcJoin>;
  release?: () => Promise<void>;
};

const AGENT_STATE_ATTRIBUTE = 'lk.agent.state';
const LEVEL_INTERVAL_MS = 66;

export class LivekitRealtimeCall implements IRealtimeCall {
  private room: Room | null = null;
  private agentIdentity = '';
  private listener: Listener = () => undefined;
  private audioElements: HTMLMediaElement[] = [];
  private levelTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: LivekitCallOptions) {}

  async join(join: RtcJoin, listener: Listener): Promise<void> {
    await this.leave();
    this.listener = listener;
    this.agentIdentity = join.agentIdentity;
    listener({ kind: 'state', state: 'connecting', reason: null });
    const target = this.options.prepare ? await this.options.prepare(join) : join;
    const livekit = await import('livekit-client');
    const room = new livekit.Room({
      adaptiveStream: false,
      dynacast: false,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      publishDefaults: { dtx: true, red: true },
    });
    this.room = room;
    const RoomEvent = livekit.RoomEvent;
    room
      .on(RoomEvent.Reconnecting, () =>
        this.emit({ kind: 'state', state: 'reconnecting', reason: null })
      )
      .on(RoomEvent.SignalReconnecting, () =>
        this.emit({ kind: 'state', state: 'reconnecting', reason: null })
      )
      .on(RoomEvent.Reconnected, () =>
        this.emit({ kind: 'state', state: 'connected', reason: null })
      )
      .on(RoomEvent.Disconnected, (reason) => this.handleDisconnected(room, reason))
      .on(RoomEvent.ParticipantConnected, (participant) => this.announceAgent(participant))
      .on(RoomEvent.ParticipantAttributesChanged, (_changed, participant) =>
        this.announceAgent(participant)
      )
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (participant.identity !== this.agentIdentity) return;
        this.dropAgentAudio();
        this.emit({ kind: 'agent', identity: participant.identity, state: null });
      })
      .on(RoomEvent.TrackSubscribed, (track, _publication, participant) =>
        this.followAgentAudio(track, participant)
      )
      .on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
        if (participant.identity !== this.agentIdentity || track.kind !== 'audio') return;
        track.detach();
        this.dropAgentAudio();
      })
      .on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
        if (!topic || participant?.identity !== this.agentIdentity) return;
        this.emit({ kind: 'data', topic, payload: decodeUtf8(payload) });
      });
    try {
      await room.connect(target.url, target.token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (error) {
      await this.leave();
      throw error;
    }
    this.emit({ kind: 'state', state: 'connected', reason: null });
    const agent = room.remoteParticipants.get(this.agentIdentity);
    if (agent) {
      this.announceAgent(agent);
      for (const publication of agent.trackPublications.values()) {
        if (publication.track) this.followAgentAudio(publication.track as RemoteTrack, agent);
      }
    }
  }

  async setMicrophone(enabled: boolean): Promise<void> {
    await this.room?.localParticipant.setMicrophoneEnabled(enabled);
  }

  async send(topic: string, payload: string): Promise<void> {
    const room = this.room;
    if (!room) throw new Error('RTC_NOT_CONNECTED|No call');
    await room.localParticipant.publishData(encodeUtf8(payload) as Uint8Array<ArrayBuffer>, {
      reliable: true,
      topic,
      destinationIdentities: [this.agentIdentity],
    });
  }

  async leave(): Promise<void> {
    const room = this.room;
    this.room = null;
    this.dropAgentAudio();
    if (room) await room.disconnect();
    if (room && this.options.release) await this.options.release();
  }

  private emit(event: RtcEvent): void {
    this.listener(event);
  }

  private handleDisconnected(room: Room, reason: number | undefined): void {
    if (this.room !== room) return;
    this.dropAgentAudio();
    this.emit({ kind: 'state', state: 'disconnected', reason: endReasonOf(reason) });
  }

  private announceAgent(participant: Participant): void {
    if (participant.identity !== this.agentIdentity) return;
    this.emit({
      kind: 'agent',
      identity: participant.identity,
      state: participant.attributes[AGENT_STATE_ATTRIBUTE] ?? null,
    });
  }

  private followAgentAudio(track: RemoteTrack, participant: RemoteParticipant): void {
    if (participant.identity !== this.agentIdentity || track.kind !== 'audio') return;
    if (this.options.attachAudio) {
      const element = track.attach();
      element.style.display = 'none';
      document.body.appendChild(element);
      this.audioElements.push(element);
    }
    this.emit({ kind: 'agentAudio', active: true });
    if (this.levelTimer !== null) clearInterval(this.levelTimer);
    this.levelTimer = setInterval(() => {
      const room = this.room;
      if (!room) return;
      this.emit({
        kind: 'level',
        local: room.localParticipant.audioLevel,
        remote: participant.audioLevel,
      });
    }, LEVEL_INTERVAL_MS);
  }

  private dropAgentAudio(): void {
    if (this.levelTimer !== null) {
      clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
    for (const element of this.audioElements) element.remove();
    const hadAudio = this.audioElements.length > 0;
    this.audioElements = [];
    if (hadAudio || this.room) this.emit({ kind: 'agentAudio', active: false });
  }
}

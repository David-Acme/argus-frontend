import type { IArgusSocket } from '@/core/interfaces';
import type { SessionCredential } from '@/core/types';
import { authFrame, readAuthReply, renewalDelayMs, type MediaFrame } from '@/features/cameras/model/media-access';

export type MediaAccessDeps = {
  credential: () => SessionCredential;
  watchAccessToken: (listener: (accessToken: string | null) => void) => () => void;
  renewIntervalMs: number;
};

export class MediaAccessRenewal {
  private socket: IArgusSocket | null = null;
  private socketCredential: SessionCredential | null = null;
  private open = false;
  private sentAt = 0;
  private renewingWith: string | null = null;
  private pending: SessionCredential | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopWatching: (() => void) | null;

  constructor(
    private readonly deps: MediaAccessDeps,
    private readonly onRefused?: (status: number) => void,
  ) {
    this.stopWatching = deps.watchAccessToken(() => this.schedule());
  }

  get credential(): SessionCredential | null {
    return this.socketCredential;
  }

  attach(socket: IArgusSocket, credential: SessionCredential): void {
    this.reset();
    this.socket = socket;
    this.socketCredential = credential;
  }

  opened(): void {
    if (!this.socket) return;
    this.open = true;
    this.schedule();
  }

  detach(): void {
    this.reset();
    this.socket = null;
    this.socketCredential = null;
  }

  dispose(): void {
    this.detach();
    this.stopWatching?.();
    this.stopWatching = null;
  }

  handle(frame: MediaFrame): boolean {
    const reply = readAuthReply(frame);
    if (!reply) return false;
    if (reply.kind === 'renewed' && this.pending) this.socketCredential = this.pending;
    this.pending = null;
    this.renewingWith = null;
    if (reply.kind === 'refused') this.onRefused?.(reply.status);
    else this.schedule();
    return true;
  }

  private reset(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.open = false;
    this.sentAt = 0;
    this.renewingWith = null;
    this.pending = null;
  }

  private schedule(): void {
    if (!this.socket || !this.open || this.timer) return;
    const delay = renewalDelayMs(this.sentAt, Date.now(), this.deps.renewIntervalMs);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.renew();
    }, delay);
  }

  private renew(): void {
    if (!this.socket || !this.open) return;
    const credential = this.deps.credential();
    const token = credential.accessToken;
    const current = this.renewingWith ?? this.socketCredential?.accessToken ?? null;
    if (!token || token === current) return;
    this.sentAt = Date.now();
    this.renewingWith = token;
    this.pending = credential;
    this.socket.sendText(authFrame(token));
  }
}

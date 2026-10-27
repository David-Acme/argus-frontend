import type { TypingFrame } from '@/core/contracts/conversation.contract';
import { ARGUS_COUNTERPART_ID } from '@/core/types';

export type TypingDeps = {
  now: () => number;
  schedule: (run: () => void, ms: number) => () => void;
};

export type TypingSnapshot = {
  typing: ReadonlyMap<number, number>;
  typed: ReadonlySet<string>;
};

type Listener = () => void;

export const TYPED_CLIENT_IDS_KEPT = 50;

const EMPTY: TypingSnapshot = { typing: new Map(), typed: new Set() };

export class TypingTracker {
  private typing = new Map<number, number>();
  private typed: string[] = [];
  private snapshotValue: TypingSnapshot = EMPTY;
  private cancelExpiry: (() => void) | null = null;
  private listeners = new Set<Listener>();

  constructor(private readonly deps: TypingDeps) {}

  get snapshot(): TypingSnapshot {
    return this.snapshotValue;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  apply(frame: TypingFrame): void {
    if (frame.clientId !== null && !this.typed.includes(frame.clientId))
      this.typed = [...this.typed, frame.clientId].slice(-TYPED_CLIENT_IDS_KEPT);
    if (frame.active && frame.ttlMs > 0)
      this.typing.set(frame.counterpartId, this.deps.now() + frame.ttlMs);
    else this.typing.delete(frame.counterpartId);
    this.changed();
  }

  stop(counterpartId: number = ARGUS_COUNTERPART_ID): void {
    if (!this.typing.delete(counterpartId)) return;
    this.changed();
  }

  clear(): void {
    if (this.typing.size === 0 && this.typed.length === 0) return;
    this.typing.clear();
    this.typed = [];
    this.changed();
  }

  private changed(): void {
    this.expire();
    this.snapshotValue = { typing: new Map(this.typing), typed: new Set(this.typed) };
    this.listeners.forEach((listener) => listener());
  }

  private expire(): void {
    const now = this.deps.now();
    for (const [counterpartId, until] of this.typing)
      if (until <= now) this.typing.delete(counterpartId);
    this.cancelExpiry?.();
    this.cancelExpiry = null;
    if (this.typing.size === 0) return;
    const next = Math.min(...this.typing.values());
    this.cancelExpiry = this.deps.schedule(() => {
      this.cancelExpiry = null;
      this.changed();
    }, next - now);
  }
}

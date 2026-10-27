import type { VoiceAction } from '@/core/types';
import { ARGUS_RESULTS_KEPT, VOICE_RESULT_TYPE } from '@/features/voice/constants/voice';
import {
  answeredOffer,
  resultOfAction,
  resultOfFrame,
  settleResult,
  upsertResult,
  type ActionSettlement,
  type ArgusResult,
} from '@/features/voice/model/argus-result';

export type ArgusResultsDeps = {
  onType: (type: string, listener: (payload: unknown) => void) => () => void;
  now: () => number;
};

type Listener = () => void;

export class ArgusResults {
  private results: readonly ArgusResult[] = [];
  private userId: string | null = null;
  private listeners = new Set<Listener>();

  constructor(private readonly deps: ArgusResultsDeps) {
    deps.onType(VOICE_RESULT_TYPE, (payload) => {
      const result = resultOfFrame(payload, deps.now());
      if (result) this.put(result);
    });
  }

  get snapshot(): readonly ArgusResult[] {
    return this.results;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  bindUser(userId: string | null): void {
    if (this.userId === userId) return;
    this.userId = userId;
    this.results = [];
    this.notify();
  }

  recordAction(action: VoiceAction): void {
    const result = resultOfAction(action, this.deps.now());
    if (result && !this.results.some((current) => current.id === result.id)) this.put(result);
  }

  settleAction(action: VoiceAction, settlement: ActionSettlement): void {
    const current = this.results.find((result) => result.id === `action:${action.id}`);
    if (current) this.put(settleResult(current, settlement));
  }

  answerOffer(id: string, accepted: boolean): void {
    const current = this.results.find((result) => result.id === id);
    if (current) this.put(answeredOffer(current, accepted));
  }

  private put(result: ArgusResult): void {
    this.results = upsertResult(this.results, result, ARGUS_RESULTS_KEPT);
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

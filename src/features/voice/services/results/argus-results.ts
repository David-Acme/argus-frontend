import type { VoiceAction } from '@/core/types';
import { ARGUS_RESULTS_KEPT } from '@/features/voice/constants/voice';
import {
  answeredOffer,
  resultIdOfFrame,
  resultOfAction,
  settleResult,
  upsertResult,
} from '@/features/voice/model/argus-result';
import type {
  ActionSettlement,
  ArgusResult,
  OfferAnswer,
  ReminderResult,
} from '@/features/voice/model/argus-result';
import { applyResultFrame, mergeResult } from '@/features/voice/model/result-merge';

export type ResultFrameListener = (payload: unknown) => void;

export type ArgusResultsDeps = {
  onFrame: (listener: ResultFrameListener) => () => void;
  now: () => number;
};

type Listener = () => void;

const sameResult = (left: ArgusResult, right: ArgusResult): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export class ArgusResults {
  private results: readonly ArgusResult[] = [];
  private userId: string | null = null;
  private listeners = new Set<Listener>();

  constructor(private readonly deps: ArgusResultsDeps) {
    deps.onFrame((payload) => this.receive(payload));
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
    const signedIn = this.userId !== null;
    this.userId = userId;
    if (!signedIn) return;
    this.results = [];
    this.notify();
  }

  recordAction(action: VoiceAction): void {
    const result = resultOfAction(action, this.deps.now());
    if (result && !this.find(result.id)) this.put(result);
  }

  settleAction(action: VoiceAction, settlement: ActionSettlement): void {
    const current = this.find(`action:${action.id}`);
    if (current) this.put(settleResult(current, settlement));
  }

  answerOffer(result: ReminderResult, answer: OfferAnswer): void {
    const current = this.find(result.id);
    this.put(answeredOffer(current?.kind === 'reminder' ? current : result, answer));
  }

  private receive(payload: unknown): void {
    const id = resultIdOfFrame(payload);
    if (id === null) return;
    const result = applyResultFrame(this.find(id), payload, this.deps.now());
    if (result) this.put(result);
  }

  private find(id: string): ArgusResult | undefined {
    return this.results.find((result) => result.id === id);
  }

  private put(result: ArgusResult): void {
    const current = this.find(result.id);
    const next = mergeResult(current, result);
    if (current && sameResult(current, next)) return;
    this.results = upsertResult(this.results, next, ARGUS_RESULTS_KEPT);
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

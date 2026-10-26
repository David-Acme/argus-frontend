import { create } from 'zustand';
import {
  HOLD_IDLE,
  holdTalkStep,
  type HoldTalkEvent,
  type HoldTalkState,
} from '@/features/voice/model/hold-talk';

type HoldTalkStore = {
  hold: HoldTalkState;
  dispatch: (event: HoldTalkEvent) => void;
};

export const useHoldTalkStore = create<HoldTalkStore>((set) => ({
  hold: HOLD_IDLE,
  dispatch: (event) => set((current) => ({ hold: holdTalkStep(current.hold, event) })),
}));

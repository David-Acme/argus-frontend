import { create } from 'zustand';
import { storageService } from '@/core/services/storage';
import { ONBOARDING_STAGE_KEY } from '@/shared/constants';
import type { OnboardingStage } from '@/core/types';

const readStage = (): OnboardingStage => {
  const stored = storageService.getString(ONBOARDING_STAGE_KEY);
  return stored === 'welcome' || stored === 'pairing' || stored === 'face' || stored === 'voice'
    ? stored
    : 'welcome';
};

const initialStage = readStage();

type OnboardingStoreState = {
  stage: OnboardingStage;
  setStage: (stage: OnboardingStage) => void;
  complete: () => void;
};

export const useOnboardingStore = create<OnboardingStoreState>((set) => ({
  stage: initialStage,
  setStage: (stage) => {
    storageService.set(ONBOARDING_STAGE_KEY, stage);
    set({ stage });
  },
  complete: () => {
    storageService.set(ONBOARDING_STAGE_KEY, 'done');
    set({ stage: 'done' });
  },
}));
import { create } from 'zustand';
import { storageService } from '@/core/services/storage';
import { ONBOARDING_STAGE_KEY, VOICE_ENABLED_KEY } from '@/shared/constants';
import type { OnboardingStage } from '@/core/types';

const readStage = (): OnboardingStage => {
  const stored = storageService.getString(ONBOARDING_STAGE_KEY);
  return stored === 'welcome' || stored === 'pairing' || stored === 'face' || stored === 'voice'
    ? stored
    : 'welcome';
};

const initialStage = readStage();
const initialVoiceEnabled = storageService.getBoolean(VOICE_ENABLED_KEY) === true;

type OnboardingStoreState = {
  stage: OnboardingStage;
  voiceEnabled: boolean;
  setStage: (stage: OnboardingStage) => void;
  complete: () => void;
  setVoiceEnabled: (enabled: boolean) => void;
};

export const useOnboardingStore = create<OnboardingStoreState>((set) => ({
  stage: initialStage,
  voiceEnabled: initialVoiceEnabled,
  setStage: (stage) => {
    storageService.set(ONBOARDING_STAGE_KEY, stage);
    set({ stage });
  },
  complete: () => {
    storageService.set(ONBOARDING_STAGE_KEY, 'done');
    set({ stage: 'done' });
  },
  setVoiceEnabled: (enabled) => {
    storageService.set(VOICE_ENABLED_KEY, String(enabled));
    set({ voiceEnabled: enabled });
  },
}));
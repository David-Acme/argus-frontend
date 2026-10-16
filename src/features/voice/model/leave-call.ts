export type LeaveCallEffects = {
  stopVoice: () => void;
  canGoBack: () => boolean;
  goBack: () => void;
  goHome: () => void;
};

export function leaveCall(effects: LeaveCallEffects): void {
  effects.stopVoice();
  if (effects.canGoBack()) effects.goBack();
  else effects.goHome();
}

export type LeaveAction = 'back' | 'background' | 'stay';

export function leaveAction(input: { canGoBack: boolean; enteredFromOutside: boolean }): LeaveAction {
  if (input.enteredFromOutside) return 'background';
  return input.canGoBack ? 'back' : 'stay';
}

export type LeaveCallEffects = {
  stopVoice: () => void;
  canGoBack: () => boolean;
  goBack: () => void;
  sendToBackground: () => void;
  enteredFromOutside: boolean;
};

export function leaveCall(effects: LeaveCallEffects): void {
  effects.stopVoice();
  const canGoBack = effects.canGoBack();
  const action = leaveAction({ canGoBack, enteredFromOutside: effects.enteredFromOutside });
  if (action === 'background') {
    if (canGoBack) effects.goBack();
    effects.sendToBackground();
  } else if (action === 'back') {
    effects.goBack();
  }
}

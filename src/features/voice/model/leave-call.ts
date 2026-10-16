export type LeaveAction = 'back' | 'background' | 'stay';

export function leaveAction(input: { canGoBack: boolean; enteredFromOutside: boolean }): LeaveAction {
  if (input.canGoBack) return 'back';
  return input.enteredFromOutside ? 'background' : 'stay';
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
  const action = leaveAction({ canGoBack: effects.canGoBack(), enteredFromOutside: effects.enteredFromOutside });
  if (action === 'back') effects.goBack();
  else if (action === 'background') effects.sendToBackground();
}

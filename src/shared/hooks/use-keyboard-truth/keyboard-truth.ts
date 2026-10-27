export type KeyboardTruthEvent = 'show' | 'hide' | 'leave' | 'return';

export type Subscription = { remove: () => void };

export type KeyboardSources = {
  onShow: (listener: () => void) => Subscription;
  onHide: (listener: () => void) => Subscription;
  onLeave: (listener: () => void) => Subscription;
  onReturn: (listener: () => void) => Subscription;
  dismiss: () => void;
};

export function keyboardTruthStep(current: boolean, event: KeyboardTruthEvent): boolean {
  if (event === 'show') return true;
  if (event === 'return') return current;
  return false;
}

export function watchKeyboardTruth(
  sources: KeyboardSources,
  apply: (step: (current: boolean) => boolean) => void
): () => void {
  const on = (event: KeyboardTruthEvent) => () =>
    apply((current) => keyboardTruthStep(current, event));
  const leave = on('leave');
  const subscriptions = [
    sources.onShow(on('show')),
    sources.onHide(on('hide')),
    sources.onLeave(() => {
      sources.dismiss();
      leave();
    }),
    sources.onReturn(on('return')),
  ];
  return () => subscriptions.forEach((subscription) => subscription.remove());
}

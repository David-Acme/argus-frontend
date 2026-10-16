export type BackgroundAskState = {
  inCall: boolean;
  allowed: boolean;
  asked: boolean;
};

export function shouldAskBackground({ inCall, allowed, asked }: BackgroundAskState): boolean {
  return inCall && !allowed && !asked;
}

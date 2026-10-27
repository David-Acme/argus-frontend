export type CallScale = {
  avatar: number;
  endedAvatar: number;
  ringControl: number;
  panelControl: number;
  avatarGap: number;
  captionLines: number;
};

const TALL: CallScale = {
  avatar: 168,
  endedAvatar: 140,
  ringControl: 54,
  panelControl: 48,
  avatarGap: 32,
  captionLines: 2,
};
const MEDIUM: CallScale = {
  avatar: 136,
  endedAvatar: 112,
  ringControl: 54,
  panelControl: 48,
  avatarGap: 24,
  captionLines: 2,
};
const SHORT: CallScale = {
  avatar: 104,
  endedAvatar: 88,
  ringControl: 52,
  panelControl: 48,
  avatarGap: 16,
  captionLines: 1,
};
const FLAT: CallScale = {
  avatar: 64,
  endedAvatar: 56,
  ringControl: 48,
  panelControl: 48,
  avatarGap: 8,
  captionLines: 1,
};

export const CALL_SCALE_STEPS = [
  { minHeight: 740, scale: TALL },
  { minHeight: 640, scale: MEDIUM },
  { minHeight: 560, scale: SHORT },
  { minHeight: 0, scale: FLAT },
] as const;

export function callScaleOf(height: number): CallScale {
  return CALL_SCALE_STEPS.find((step) => height >= step.minHeight)?.scale ?? FLAT;
}

export type VoiceLeg = 'phone' | 'laptop';

export const voiceLegOf = (native: boolean): VoiceLeg => (native ? 'phone' : 'laptop');

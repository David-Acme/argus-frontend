import type { TokenTheme } from './tokens';

export const auraTones = ['calm', 'duty', 'attn', 'alert', 'off', 'listen'] as const;

export type AuraTone = (typeof auraTones)[number];

export const aura: Record<TokenTheme, Record<AuraTone, readonly [string, string, string]>> = {
  light: {
    calm: ['#EBD9B4', '#F3E7CF', '#E3EBDF'],
    duty: ['#C9CEE8', '#E3E2F0', '#D9E2EC'],
    attn: ['#F2CF95', '#F7E4C2', '#F1DCC0'],
    alert: ['#F1AFA6', '#F7D3CC', '#F3C9B8'],
    off: ['#E2E0DC', '#EDEBE8', '#E6E4E0'],
    listen: ['#E7C98E', '#F2DDB5', '#E9D3C9'],
  },
  dark: {
    calm: ['#5C4621', '#332918', '#3B2D1A'],
    duty: ['#262C52', '#1A1D33', '#162430'],
    attn: ['#5A3D12', '#33240F', '#2D2416'],
    alert: ['#6A231E', '#3A1715', '#3B2117'],
    off: ['#2D2B28', '#211F1D', '#262422'],
    listen: ['#5C4520', '#3A2B14', '#3A2A22'],
  },
};

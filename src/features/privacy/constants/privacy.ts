import type { PrivacySignal } from '@/core/types';

export const PRIVACY_NOTICE_VERSION = 1;

export const PRIVACY_SIGNALS: readonly PrivacySignal[] = [
  'presence',
  'faceCameras',
  'voiceLearning',
  'cameraAudio',
];

export const PRIVACY_SIGNAL_ICONS = {
  presence: 'home',
  faceCameras: 'scan-face',
  voiceLearning: 'audio-lines',
  cameraAudio: 'ear',
} as const satisfies Record<PrivacySignal, string>;

export type PrivacyJurisdiction = {
  country: { es: string; en: string };
  laws: { es: string; en: string };
  authority: { es: string; en: string };
  videoDays: number;
  videoMaxDays: number;
  incidentDays: number;
};

export const PRIVACY_JURISDICTIONS = {
  pe: {
    country: { es: 'Perú', en: 'Peru' },
    laws: {
      es: 'la Ley N° 29733 de Protección de Datos Personales, su reglamento (D.S. N° 016-2024-JUS) y la Directiva de videovigilancia N° 01-2020-JUS/DGTAIPD',
      en: 'Law No. 29733 on Personal Data Protection, its regulation (Supreme Decree No. 016-2024-JUS) and the video surveillance Directive No. 01-2020-JUS/DGTAIPD',
    },
    authority: {
      es: 'Autoridad Nacional de Protección de Datos Personales (ANPD)',
      en: 'National Personal Data Protection Authority (ANPD)',
    },
    videoDays: 30,
    videoMaxDays: 60,
    incidentDays: 120,
  },
} as const satisfies Record<string, PrivacyJurisdiction>;

export const PRIVACY_JURISDICTION: PrivacyJurisdiction = PRIVACY_JURISDICTIONS.pe;

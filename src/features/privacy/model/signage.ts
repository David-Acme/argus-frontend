import type { TranslateFn } from '@/core/types';
import type { PrivacyJurisdiction } from '@/features/privacy/constants/privacy';

export type SignageInput = {
  audio: boolean;
  responsible: string;
  language: 'es' | 'en';
  jurisdiction: PrivacyJurisdiction;
};

export type Signage = {
  heading: string;
  lines: string[];
};

export type SignageShareInput = {
  signage: Signage;
  language: 'es' | 'en';
};

export type SignageShareOutcome = 'shared' | 'printed' | 'copied' | 'dismissed' | 'failed';

export const SIGNAGE_RESPONSIBLE_MAX = 120;

export function signageResponsible(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, SIGNAGE_RESPONSIBLE_MAX);
}

export function buildSignage(input: SignageInput, t: TranslateFn): Signage {
  const responsible = signageResponsible(input.responsible);
  const lines = [t('screens.privacy.signage.line-cameras')];
  if (input.audio) {
    lines.push(t('screens.privacy.signage.line-audio'));
    lines.push(t('screens.privacy.signage.line-no-recording'));
  }
  if (responsible) lines.push(t('screens.privacy.signage.line-responsible', { name: responsible }));
  lines.push(
    t('screens.privacy.signage.line-rights', { authority: input.jurisdiction.authority[input.language] })
  );
  lines.push(t('screens.privacy.signage.line-law', { laws: input.jurisdiction.laws[input.language] }));
  return {
    heading: input.audio ? t('screens.privacy.signage.heading-audio') : t('screens.privacy.signage.heading'),
    lines,
  };
}

export function signageText(signage: Signage): string {
  return [signage.heading, '', ...signage.lines].join('\n');
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export function signageHtml(signage: Signage, language: 'es' | 'en'): string {
  const lines = signage.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  return [
    `<!doctype html><html lang="${language}"><head><meta charset="utf-8">`,
    `<title>${escapeHtml(signage.heading)}</title>`,
    '<style>',
    'body{font-family:system-ui,sans-serif;margin:48px;color:black}',
    'h1{font-size:40px;letter-spacing:0.04em;border-bottom:6px solid black;padding-bottom:16px}',
    'p{font-size:20px;line-height:1.45;margin:14px 0}',
    '</style></head><body>',
    `<h1>${escapeHtml(signage.heading)}</h1>`,
    lines,
    '</body></html>',
  ].join('');
}

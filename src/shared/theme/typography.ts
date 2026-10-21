export const typeSteps = ['hero', 'title', 'headline', 'body', 'meta', 'caption'] as const;

export type TypeStep = (typeof typeSteps)[number];

export type TypeSpec = {
  size: number;
  line: number;
  weight: '400' | '500' | '600' | '650' | '700' | '750' | '800';
  tracking: number;
  maxScale: number;
};

export const type: Record<TypeStep, TypeSpec> = {
  hero: { size: 36, line: 39.6, weight: '800', tracking: -0.03, maxScale: 1.5 },
  title: { size: 24, line: 30, weight: '750', tracking: -0.02, maxScale: 1.5 },
  headline: { size: 17, line: 23.8, weight: '650', tracking: 0, maxScale: 2 },
  body: { size: 16, line: 22.4, weight: '400', tracking: 0, maxScale: 2 },
  meta: { size: 14, line: 19.88, weight: '400', tracking: 0, maxScale: 2 },
  caption: { size: 12, line: 16.2, weight: '500', tracking: 0, maxScale: 2 },
};

export const typeRoles = {
  heroCompact: { size: 30, line: 33, weight: '800', tracking: -0.03, maxScale: 1.5 },
  heroSecondary: { size: 26, line: 28.6, weight: '800', tracking: -0.03, maxScale: 1.5 },
  section: { size: 21, line: 29.4, weight: '750', tracking: -0.015, maxScale: 1.5 },
  rowTitle: { size: 16, line: 21.6, weight: '500', tracking: 0, maxScale: 2 },
  rowMeta: { size: 14, line: 18.9, weight: '400', tracking: 0, maxScale: 2 },
  button: { size: 16, line: 22.4, weight: '650', tracking: 0, maxScale: 2 },
  buttonCompact: { size: 15, line: 21, weight: '650', tracking: 0, maxScale: 2 },
  label: { size: 15, line: 21, weight: '600', tracking: 0, maxScale: 2 },
  feed: { size: 15, line: 21, weight: '400', tracking: 0, maxScale: 2 },
  chip: { size: 13, line: 17.55, weight: '600', tracking: 0, maxScale: 2 },
  tab: { size: 12, line: 16.2, weight: '600', tracking: 0, maxScale: 1.15 },
  key: { size: 11, line: 17, weight: '650', tracking: 0, maxScale: 1.5 },
  sectionMeta: { size: 13, line: 19.5, weight: '500', tracking: 0, maxScale: 2 },
  chipValue: { size: 13, line: 17.55, weight: '800', tracking: 0, maxScale: 2 },
  initial: { size: 15, line: 22.5, weight: '400', tracking: 0, maxScale: 2 },
  initialLarge: { size: 22, line: 33, weight: '700', tracking: 0, maxScale: 1.5 },
  sectionLink: { size: 15, line: 22.5, weight: '600', tracking: 0, maxScale: 2 },
  toastTitle: { size: 15, line: 22.5, weight: '650', tracking: 0, maxScale: 2 },
  toastBody: { size: 14, line: 21, weight: '400', tracking: 0, maxScale: 2 },
  toastAction: { size: 15, line: 22.5, weight: '700', tracking: 0, maxScale: 2 },
  query: { size: 18, line: 27, weight: '400', tracking: 0, maxScale: 1.5 },
  groupTitle: { size: 12, line: 18, weight: '650', tracking: 0.04, maxScale: 2 },
  hint: { size: 12, line: 18, weight: '400', tracking: 0, maxScale: 2 },
  control: { size: 14, line: 21, weight: '600', tracking: 0, maxScale: 2 },
  fieldError: { size: 14, line: 21, weight: '500', tracking: 0, maxScale: 2 },
  entry: { size: 16, line: 24, weight: '400', tracking: 0, maxScale: 2 },
  code: { size: 24, line: 36, weight: '650', tracking: 0, maxScale: 1 },
  noticeTitle: { size: 16, line: 20.8, weight: '650', tracking: 0, maxScale: 2 },
  noticeBody: { size: 14, line: 18.9, weight: '400', tracking: 0, maxScale: 2 },
  feedWho: { size: 15, line: 21, weight: '600', tracking: 0, maxScale: 2 },
  mediaLabel: { size: 13, line: 17.55, weight: '600', tracking: 0, maxScale: 2 },
  mediaDetail: { size: 13, line: 17.55, weight: '500', tracking: 0, maxScale: 2 },
  mediaChip: { size: 12, line: 16.2, weight: '600', tracking: 0, maxScale: 2 },
  eyeChip: { size: 12, line: 16.2, weight: '650', tracking: 0, maxScale: 2 },
} as const satisfies Record<string, TypeSpec>;

export const fontFamily = {
  web: 'system-ui, -apple-system, "SF Pro Text", Roboto, "Segoe UI", sans-serif',
} as const;

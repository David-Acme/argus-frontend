import type { Page } from 'playwright-core';

export type SheetBox = { top: number; height: number; emptyBand: number };

export type HeightAudit = {
  chrome: number;
  firstContent: number | null;
  underBar: string[];
  outside: string[];
  sheet: SheetBox | null;
};

export type HeightEntry = {
  screen: string;
  state: string;
  file: string;
  fullPage: boolean;
  viewport: { name: string; w: number; h: number };
  height?: HeightAudit;
};

export type HeightFinding = { file: string; rule: string; detail: string };

export const HEIGHT_RULES = {
  chromeShare: 0.22,
  firstContentShare: 0.4,
  emptyBandShare: 0.25,
  phoneWidth: 600,
  phoneHeight: 480,
} as const;

export const isPhoneWindow = ({ w, h }: { w: number; h: number }): boolean =>
  w < HEIGHT_RULES.phoneWidth || h < HEIGHT_RULES.phoneHeight;

const percent = (share: number): string => `${Math.round(share * 1000) / 10} %`;

export function heightFindings(entry: HeightEntry): HeightFinding[] {
  const audit = entry.height;
  if (!audit || entry.fullPage || !isPhoneWindow(entry.viewport)) return [];
  const { h } = entry.viewport;
  const found: HeightFinding[] = [];
  const add = (rule: string, detail: string): void => {
    found.push({ file: entry.file, rule, detail });
  };
  if (audit.chrome / h > HEIGHT_RULES.chromeShare)
    add('chrome', `${audit.chrome} px of fixed chrome is ${percent(audit.chrome / h)}`);
  if (
    !audit.sheet &&
    audit.firstContent !== null &&
    audit.firstContent / h > HEIGHT_RULES.firstContentShare
  )
    add(
      'first-content',
      `first content at ${audit.firstContent} px (${percent(audit.firstContent / h)})`
    );
  if (audit.sheet && audit.sheet.emptyBand / h > HEIGHT_RULES.emptyBandShare)
    add(
      'sheet-empty',
      `${audit.sheet.emptyBand} px of empty band in a ${audit.sheet.height} px sheet`
    );
  for (const label of audit.underBar) add('under-bar', label);
  for (const label of audit.outside) add('outside', label);
  return found;
}

export const measureHeight = (page: Page): Promise<HeightAudit> =>
  page.evaluate(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const EDGE = 48;
    const LEAVES =
      '[dir="auto"], button, a, input, textarea, img, video, [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="tab"]';
    const INTERACTIVE =
      'button, a, input, textarea, [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="tab"]';
    const label = (element: Element): string =>
      (element.getAttribute('aria-label') ?? element.textContent ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 60);
    const visible = (element: Element): boolean => {
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0)
        return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const scrollRoom = (element: Element): number => {
      let room = 0;
      for (let node = element.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.overflowY !== 'auto' && style.overflowY !== 'scroll') continue;
        room += Math.max(0, node.scrollHeight - node.clientHeight - node.scrollTop);
      }
      const page = document.scrollingElement;
      if (page) room += Math.max(0, page.scrollHeight - page.clientHeight - page.scrollTop);
      return room;
    };
    const scrolls = (element: Element): boolean => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          node.scrollHeight > node.clientHeight + 1
        )
          return true;
      }
      return false;
    };
    const dialogs = Array.from(
      document.querySelectorAll('[role="dialog"], [aria-modal="true"]')
    ).filter(visible);
    const layer = dialogs.at(-1) ?? null;
    const bar =
      Array.from(document.querySelectorAll('[role="tablist"]'))
        .filter(visible)
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .find(
          ({ element, rect }) =>
            rect.top > height / 2 &&
            rect.width < width + 1 &&
            ['absolute', 'fixed'].includes(getComputedStyle(element).position)
        ) ?? null;
    const topBar = Array.from(document.querySelectorAll('[data-testid="screen-top-bar"]'))
      .filter(visible)
      .find((element) => element.getBoundingClientRect().top <= 8 && !scrolls(element));
    const chrome =
      (bar ? Math.max(0, height - bar.rect.top) : 0) +
      (topBar ? Math.max(0, topBar.getBoundingClientRect().bottom) : 0);
    const skipped = Array.from(
      document.querySelectorAll(
        '[role="tablist"], [data-testid="screen-top-bar"], [data-testid="status-hero"]'
      )
    );
    const inside = (element: Element, roots: readonly Element[]): boolean =>
      roots.some((root) => root.contains(element));
    const leaves = Array.from(document.querySelectorAll(LEAVES)).filter(
      (element) =>
        visible(element) && !inside(element, skipped) && (!layer || layer.contains(element))
    );
    const tops = leaves
      .map((element) => element.getBoundingClientRect().top)
      .filter((top) => top >= 0 && top < height);
    const firstContent = layer || tops.length === 0 ? null : Math.round(Math.min(...tops));
    const underBar: string[] = [];
    const outside: string[] = [];
    for (const element of Array.from(document.querySelectorAll(INTERACTIVE))) {
      if (!visible(element) || (bar && bar.element.contains(element))) continue;
      if (layer && !layer.contains(element)) continue;
      const rect = element.getBoundingClientRect();
      const room = scrollRoom(element);
      const text = label(element) || element.tagName.toLowerCase();
      if (rect.bottom > height + 1 && rect.bottom - height > room + 1 && outside.length < 8)
        outside.push(text);
      else if (
        bar &&
        !layer &&
        rect.bottom > bar.rect.top + 4 &&
        rect.top < bar.rect.bottom &&
        Math.min(rect.right, bar.rect.right) - Math.max(rect.left, bar.rect.left) > 4 &&
        rect.bottom - bar.rect.top > room + 1 &&
        underBar.length < 8
      )
        underBar.push(text);
    }
    let sheet: { top: number; height: number; emptyBand: number } | null = null;
    if (layer) {
      const box = layer.getBoundingClientRect();
      const spans = [
        ...leaves,
        ...Array.from(layer.querySelectorAll('svg, canvas')).filter(visible),
      ]
        .map((element) => element.getBoundingClientRect())
        .map((rect) => [Math.max(box.top, rect.top), Math.min(box.bottom, rect.bottom)] as const)
        .filter(([top, bottom]) => bottom > top)
        .sort((a, b) => a[0] - b[0]);
      let reached = spans[0]?.[1] ?? box.top;
      let emptyBand = 0;
      for (const [top, bottom] of spans) {
        emptyBand = Math.max(emptyBand, top - reached);
        reached = Math.max(reached, bottom);
      }
      sheet = {
        top: Math.round(box.top),
        height: Math.round(box.height),
        emptyBand: Math.round(Math.max(emptyBand, box.bottom - reached - EDGE)),
      };
    }
    return { chrome: Math.round(chrome), firstContent, underBar, outside, sheet };
  });

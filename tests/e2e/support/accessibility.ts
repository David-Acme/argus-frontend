import type { Page } from 'playwright-core';

type AxValue = { value?: unknown };

type AxNode = {
  nodeId: string;
  ignored?: boolean;
  role?: AxValue;
  name?: AxValue;
  properties?: { name: string; value: AxValue }[];
};

export type Control = { role: string; name: string };

const INTERACTIVE = new Set([
  'button',
  'textbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'tab',
  'link',
  'menuitem',
  'searchbox',
  'spinbutton',
]);

const text = (value: AxValue | undefined): string => (typeof value?.value === 'string' ? value.value.trim() : '');

export const controls = async (page: Page): Promise<Control[]> => {
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = (await session.send('Accessibility.getFullAXTree')) as { nodes: AxNode[] };
    return nodes
      .filter((node) => !node.ignored && INTERACTIVE.has(text(node.role)))
      .filter((node) => !(node.properties ?? []).some((property) => property.name === 'hidden' && property.value.value === true))
      .map((node) => ({ role: text(node.role), name: text(node.name) }));
  } finally {
    await session.detach();
  }
};

export const unnamed = async (page: Page): Promise<Control[]> =>
  (await controls(page)).filter((control) => control.name === '');

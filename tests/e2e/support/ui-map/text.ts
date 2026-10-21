import type { Locator } from 'playwright-core';
import { localeDictionaries } from '../../../../src/core/i18n/locales';
import type { TranslationKey } from '../../../../src/core/types';
import { sleep, type Scene } from './capture';

const lookup = (scene: Scene, key: TranslationKey): string => {
  let current: unknown = localeDictionaries[scene.look.lang];
  for (const part of key.split('.'))
    current = (current as Record<string, unknown> | undefined)?.[part];
  if (typeof current !== 'string') throw new Error(`no ${scene.look.lang} text for ${key}`);
  return current;
};

export const say = (
  scene: Scene,
  key: TranslationKey,
  params: Record<string, string | number> = {}
): string =>
  lookup(scene, key).replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );

export const button = (
  scene: Scene,
  key: TranslationKey,
  params?: Record<string, string | number>
): Locator => scene.page.getByRole('button', { name: say(scene, key, params), exact: true });

export const text = (
  scene: Scene,
  key: TranslationKey,
  params?: Record<string, string | number>
): Locator => scene.page.getByText(say(scene, key, params), { exact: true });

const settleAfterClick = (): Promise<void> => sleep(500);

export const press = async (locator: Locator, which: 'first' | 'last' = 'first'): Promise<void> => {
  const target = which === 'first' ? locator.first() : locator.last();
  await target.click({ timeout: 8000 });
  await settleAfterClick();
};

export const tap = (
  scene: Scene,
  key: TranslationKey,
  params?: Record<string, string | number>
): Promise<void> => press(button(scene, key, params));

export const tapText = (
  scene: Scene,
  key: TranslationKey,
  which: 'first' | 'last' = 'first'
): Promise<void> => press(text(scene, key), which);

export const tapLabel = (
  scene: Scene,
  label: string | RegExp,
  which: 'first' | 'last' = 'first'
): Promise<void> => press(scene.page.getByRole('button', { name: label }), which);

export const tapRaw = (
  scene: Scene,
  value: string | RegExp,
  which: 'first' | 'last' = 'first'
): Promise<void> => press(scene.page.getByText(value, { exact: typeof value === 'string' }), which);

export const fill = async (
  scene: Scene,
  label: TranslationKey | RegExp,
  value: string
): Promise<void> => {
  const name = typeof label === 'string' ? say(scene, label) : label;
  await scene.page.getByRole('textbox', { name }).first().fill(value, { timeout: 8000 });
  await sleep(200);
};

export const waitText = async (
  scene: Scene,
  key: TranslationKey,
  params?: Record<string, string | number>
): Promise<void> => {
  await text(scene, key, params).first().waitFor({ state: 'visible', timeout: 10000 });
};

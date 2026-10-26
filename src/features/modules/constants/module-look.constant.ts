import type { ModuleLifecycle, TranslationKey } from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';

const GLYPHS: Readonly<Record<string, IconGlyph>> = {
  core: 'sliders',
  surveillance: 'shield',
  productivity: 'cal',
};

export const moduleGlyph = (id: string): IconGlyph => GLYPHS[id] ?? 'grid';

export const LIFECYCLE_LABEL: Readonly<Record<ModuleLifecycle, TranslationKey>> = {
  not_installed: 'screens.modules.lifecycle.not_installed',
  active: 'screens.modules.lifecycle.active',
  disabled: 'screens.modules.lifecycle.disabled',
  uninstalled_data_kept: 'screens.modules.lifecycle.uninstalled_data_kept',
};

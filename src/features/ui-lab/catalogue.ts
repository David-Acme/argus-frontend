import type { ComponentType } from 'react';
import { AvatarDemo } from './demos/avatar-demo';
import { ButtonDemo } from './demos/button-demo';
import { CheckDemo } from './demos/check-demo';
import { ChipDemo } from './demos/chip-demo';
import { ChoiceDemo } from './demos/choice-demo';
import { CommandDemo } from './demos/command-demo';
import { ConfirmDemo } from './demos/confirm-demo';
import { FieldCodeDemo } from './demos/field-code-demo';
import { FieldDemo } from './demos/field-demo';
import { IconDemo } from './demos/icon-demo';
import { LayoutDemo } from './demos/layout-demo';
import { MenuDemo } from './demos/menu-demo';
import { PressableDemo } from './demos/pressable-demo';
import { RowDemo } from './demos/row-demo';
import { SectionDemo } from './demos/section-demo';
import { SwitchDemo } from './demos/switch-demo';
import { TextDemo } from './demos/text-demo';
import { ToastDemo } from './demos/toast-demo';

export type CatalogueFamily = 'foundations' | 'content' | 'input' | 'overlays' | 'identity';

export type CatalogueEntry = {
  id: string;
  family: CatalogueFamily;
  title: string;
  Demo: ComponentType;
};

export const catalogue: readonly CatalogueEntry[] = [
  { id: 'text', family: 'foundations', title: 'Text', Demo: TextDemo },
  { id: 'icon', family: 'foundations', title: 'Icon', Demo: IconDemo },
  { id: 'pressable', family: 'foundations', title: 'PressableSurface', Demo: PressableDemo },
  { id: 'layout', family: 'foundations', title: 'Stack, Inline, Cluster', Demo: LayoutDemo },
  { id: 'section', family: 'content', title: 'Section', Demo: SectionDemo },
  { id: 'row', family: 'content', title: 'Row', Demo: RowDemo },
  { id: 'chip', family: 'content', title: 'Chip', Demo: ChipDemo },
  { id: 'avatar', family: 'content', title: 'Avatar', Demo: AvatarDemo },
  { id: 'check', family: 'content', title: 'Check', Demo: CheckDemo },
  { id: 'button', family: 'input', title: 'Button', Demo: ButtonDemo },
  { id: 'switch', family: 'input', title: 'Switch', Demo: SwitchDemo },
  { id: 'confirm', family: 'overlays', title: 'Confirm', Demo: ConfirmDemo },
  { id: 'menu', family: 'overlays', title: 'Menu', Demo: MenuDemo },
  { id: 'toast', family: 'overlays', title: 'Toast', Demo: ToastDemo },
  { id: 'command', family: 'overlays', title: 'Command', Demo: CommandDemo },
  { id: 'field', family: 'input', title: 'Field', Demo: FieldDemo },
  { id: 'field-code', family: 'input', title: 'Field, code', Demo: FieldCodeDemo },
  { id: 'choice', family: 'input', title: 'Choice', Demo: ChoiceDemo },
];

export const catalogueFamilies: readonly CatalogueFamily[] = [
  'foundations',
  'content',
  'input',
  'overlays',
  'identity',
];

import type { ComponentType } from 'react';
import { AuraDemo } from './demos/aura-demo';
import { AvatarDemo } from './demos/avatar-demo';
import { ButtonDemo } from './demos/button-demo';
import { CheckDemo } from './demos/check-demo';
import { ChipDemo } from './demos/chip-demo';
import { IconDemo } from './demos/icon-demo';
import { LayoutDemo } from './demos/layout-demo';
import { NavDemo } from './demos/nav-demo';
import { PressableDemo } from './demos/pressable-demo';
import { RowDemo } from './demos/row-demo';
import { ScreenDemo } from './demos/screen-demo';
import { SectionDemo } from './demos/section-demo';
import { StatusDemo } from './demos/status-demo';
import { SwitchDemo } from './demos/switch-demo';
import { TextDemo } from './demos/text-demo';

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
  { id: 'aura', family: 'identity', title: 'Aura', Demo: AuraDemo },
  { id: 'status', family: 'content', title: 'Status', Demo: StatusDemo },
  { id: 'nav', family: 'foundations', title: 'Nav', Demo: NavDemo },
  { id: 'screen', family: 'foundations', title: 'Screen', Demo: ScreenDemo },
];

export const catalogueFamilies: readonly CatalogueFamily[] = [
  'foundations',
  'content',
  'input',
  'overlays',
  'identity',
];

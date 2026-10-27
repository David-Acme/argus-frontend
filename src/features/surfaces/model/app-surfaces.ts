import type { ModuleSurfaces } from '@/shared/libs/surfaces';
import { CORE_SURFACES } from './core-surfaces';
import { PRODUCTIVITY_SURFACES } from './productivity-surfaces';
import { SURVEILLANCE_SURFACES } from './surveillance-surfaces';

export const APP_SURFACES: readonly ModuleSurfaces[] = [
  CORE_SURFACES,
  SURVEILLANCE_SURFACES,
  PRODUCTIVITY_SURFACES,
];

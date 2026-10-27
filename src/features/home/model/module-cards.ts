import type { ActiveModule } from '@/shared/libs/surfaces';

export const MODULE_CARDS = 4;

export function rankedModules(
  modules: readonly ActiveModule[],
  attention: ReadonlyMap<string, number>
): ActiveModule[] {
  return [...modules].sort(
    (left, right) =>
      (attention.get(right.module) ?? 0) - (attention.get(left.module) ?? 0) ||
      left.order - right.order
  );
}

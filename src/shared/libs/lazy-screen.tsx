import { type ComponentType, lazy, Suspense } from 'react';

export function lazyScreen<Name extends string>(
  load: () => Promise<Record<Name, ComponentType>>,
  name: Name
): ComponentType {
  const Screen = lazy(async (): Promise<{ default: ComponentType }> => ({
    default: (await load())[name],
  }));
  return function LazyScreen() {
    return (
      <Suspense fallback={null}>
        <Screen />
      </Suspense>
    );
  };
}

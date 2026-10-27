import { type ComponentType, lazy, Suspense, useState } from 'react';

export type LazyScreen = ComponentType & { preload: () => Promise<void> };

export function lazyScreen<Name extends string>(
  load: () => Promise<Record<Name, ComponentType>>,
  name: Name
): LazyScreen {
  let resolved: ComponentType | null = null;
  let pending: Promise<ComponentType> | null = null;
  const fetch = (): Promise<ComponentType> => {
    pending ??= load().then((module) => {
      resolved = module[name];
      return resolved;
    });
    return pending;
  };
  const Screen = lazy(async (): Promise<{ default: ComponentType }> => ({
    default: await fetch(),
  }));
  function LazyScreen() {
    const [Ready] = useState(() => resolved);
    if (Ready) return <Ready />;
    return (
      <Suspense fallback={null}>
        <Screen />
      </Suspense>
    );
  }
  return Object.assign(LazyScreen, { preload: async () => void (await fetch()) });
}

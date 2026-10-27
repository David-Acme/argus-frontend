import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { resolveSurfaces, type ModuleSurfaces, type ResolvedSurfaces } from './surface-registry';

export type SurfaceProviderProps = { registry: readonly ModuleSurfaces[]; children: ReactNode };

const NO_MODULES: readonly ModuleSurfaces[] = [];

const SurfaceContext = createContext<readonly ModuleSurfaces[]>(NO_MODULES);

export function SurfaceProvider({ registry, children }: SurfaceProviderProps) {
  return <SurfaceContext.Provider value={registry}>{children}</SurfaceContext.Provider>;
}

export function useSurfaces(): ResolvedSurfaces {
  const registry = useContext(SurfaceContext);
  const view = useAccessView();
  return useMemo(() => resolveSurfaces(registry, view), [registry, view]);
}

import { createContext, useContext } from 'react';
import { useWindowLayout } from '@/shared/theme/use-window-layout';

const ScreenColumnContext = createContext(false);

const ColumnGrowContext = createContext(false);

const PanesContext = createContext<boolean | null>(null);

export const PanesProvider = PanesContext.Provider;

export function usePanes(): boolean {
  const panes = useContext(PanesContext);
  const { windowClass } = useWindowLayout();
  return panes ?? (windowClass === 'expanded' || windowClass === 'wide');
}

export const ScreenColumnProvider = ScreenColumnContext.Provider;

export const ColumnGrowProvider = ColumnGrowContext.Provider;

export function useInScreenColumn(): boolean {
  return useContext(ScreenColumnContext);
}

export function useGrowsInColumn(): boolean {
  return useContext(ColumnGrowContext);
}

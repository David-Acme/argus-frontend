import { createContext, useContext } from 'react';

const ScreenColumnContext = createContext(false);

const ColumnGrowContext = createContext(false);

const PanesContext = createContext(false);

export const PanesProvider = PanesContext.Provider;

export function usePanes(): boolean {
  return useContext(PanesContext);
}

export const ScreenColumnProvider = ScreenColumnContext.Provider;

export const ColumnGrowProvider = ColumnGrowContext.Provider;

export function useInScreenColumn(): boolean {
  return useContext(ScreenColumnContext);
}

export function useGrowsInColumn(): boolean {
  return useContext(ColumnGrowContext);
}

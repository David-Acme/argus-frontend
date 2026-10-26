import { createContext, useContext } from 'react';

const ScreenColumnContext = createContext(false);

const ColumnGrowContext = createContext(false);

export const ScreenColumnProvider = ScreenColumnContext.Provider;

export const ColumnGrowProvider = ColumnGrowContext.Provider;

export function useInScreenColumn(): boolean {
  return useContext(ScreenColumnContext);
}

export function useGrowsInColumn(): boolean {
  return useContext(ColumnGrowContext);
}

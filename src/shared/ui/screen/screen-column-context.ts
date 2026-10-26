import { createContext, useContext } from 'react';

const ScreenColumnContext = createContext(false);

const ScreenColumnGrowContext = createContext(false);

export const ScreenColumnProvider = ScreenColumnContext.Provider;

export const ScreenColumnGrowProvider = ScreenColumnGrowContext.Provider;

export function useInScreenColumn(): boolean {
  return useContext(ScreenColumnContext);
}

export function useScreenColumnGrow(): boolean {
  return useContext(ScreenColumnGrowContext);
}

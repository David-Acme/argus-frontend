import { createContext, useContext } from 'react';

const ScreenColumnContext = createContext(false);

export const ScreenColumnProvider = ScreenColumnContext.Provider;

export function useInScreenColumn(): boolean {
  return useContext(ScreenColumnContext);
}

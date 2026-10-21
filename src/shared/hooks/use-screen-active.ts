import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setActive(next === 'active')
    );
    return () => subscription.remove();
  }, []);
  return active;
}

export function useScreenActive(): boolean {
  const focused = useIsFocused();
  const appActive = useAppActive();
  return focused && appActive;
}

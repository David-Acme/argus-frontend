import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterEach, mock } from 'bun:test';
import { createContext, useRef } from 'react';

GlobalRegistrator.register();
Object.assign(globalThis, { __DEV__: false, IS_REACT_ACT_ENVIRONMENT: true });

type Shared<T> = { get: () => T; set: (next: T) => void };

const sharedValue = <T>(initial: T): Shared<T> => {
  let value = initial;
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
  };
};

mock.module('react-native', () => import('react-native-web'));
mock.module('react-native-svg', () => import('react-native-svg/lib/module/elements.web.js'));
mock.module('react-native-gesture-handler', async () => {
  const web = await import('react-native-web');
  return { Pressable: web.Pressable, ScrollView: web.ScrollView };
});
mock.module('react-native-safe-area-context', () => ({
  SafeAreaInsetsContext: createContext(null),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
mock.module('expo-device', () => ({ totalMemory: null }));
mock.module('uniwind', () => ({
  Uniwind: { setTheme: () => undefined },
  useUniwind: () => ({ theme: 'light' }),
  withUniwind: <T>(component: T) => component,
}));
mock.module('react-native-reanimated', async () => {
  const web = await import('react-native-web');
  return {
    default: { View: web.View, Text: web.Text },
    useSharedValue: <T>(initial: T) => useRef(sharedValue(initial)).current,
    makeMutable: sharedValue,
    useAnimatedScrollHandler: () => () => undefined,
    useAnimatedStyle: <T>(build: () => T) => build(),
    withSpring: <T>(target: T) => target,
    withTiming: <T>(target: T) => target,
  };
});

const { cleanup } = await import('@testing-library/react');

afterEach(() => cleanup());

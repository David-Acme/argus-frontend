import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterEach, mock } from 'bun:test';
import { useRef, type ReactNode } from 'react';

GlobalRegistrator.register();

Bun.plugin({
  name: 'rn-primitives-jsx',
  setup(build) {
    build.onLoad({ filter: /@rn-primitives\/.+\.mjs$/ }, async ({ path }) => ({
      contents: await Bun.file(path).text(),
      loader: 'jsx',
    }));
  },
});
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
type Chain = { [method: string]: (...args: unknown[]) => Chain };

const chain = (): Chain =>
  new Proxy({} as Chain, { get: (_target, _key, self: Chain) => () => self });

mock.module('react-native-gesture-handler', async () => {
  const web = await import('react-native-web');
  return {
    Pressable: web.Pressable,
    ScrollView: web.ScrollView,
    Gesture: { LongPress: chain },
    GestureDetector: ({ children }: { children: ReactNode }) => children,
  };
});
for (const primitive of ['alert-dialog', 'dialog', 'dropdown-menu', 'context-menu']) {
  mock.module(
    `@rn-primitives/${primitive}`,
    () => import(`../../../../node_modules/@rn-primitives/${primitive}/dist/${primitive}.web.mjs`)
  );
}
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
    useAnimatedStyle: <T>(build: () => T) => build(),
    withSpring: <T>(target: T) => target,
    withTiming: <T>(target: T) => target,
    Keyframe: class {
      duration() {
        return this;
      }
    },
    Easing: { bezier: () => () => 0 },
  };
});

const { cleanup } = await import('@testing-library/react');

afterEach(() => cleanup());

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterEach, mock } from 'bun:test';
import { createContext, useRef, type ReactNode } from 'react';
import { screenFocus } from './screen-focus';

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

type Chain = { [method: string]: (...args: unknown[]) => Chain };

const chain = (): Chain =>
  new Proxy({} as Chain, { get: (_target, _key, self: Chain) => () => self });

mock.module('react-native', () => import('react-native-web'));
mock.module('react-native-svg', () => import('react-native-svg/lib/module/elements.web.js'));
mock.module('react-native-gesture-handler', async () => {
  const web = await import('react-native-web');
  return {
    Pressable: web.Pressable,
    ScrollView: web.ScrollView,
    Gesture: { LongPress: chain, Pan: chain, Tap: chain, Exclusive: chain },
    GestureDetector: ({ children }: { children: ReactNode }) => children,
  };
});
for (const primitive of ['alert-dialog', 'dialog', 'dropdown-menu', 'context-menu', 'popover']) {
  mock.module(
    `@rn-primitives/${primitive}`,
    () => import(`../../../../node_modules/@rn-primitives/${primitive}/dist/${primitive}.web.mjs`)
  );
}
mock.module('react-native-safe-area-context', () => ({
  SafeAreaInsetsContext: createContext(null),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
mock.module('react-native-worklets', () => ({
  scheduleOnRN: <T extends unknown[]>(run: (...args: T) => void, ...args: T) => run(...args),
}));
mock.module('react-native-keyboard-controller', async () => {
  const web = await import('react-native-web');
  return { KeyboardAwareScrollView: web.ScrollView };
});
mock.module('expo-device', () => ({ totalMemory: null }));
mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ setParams: () => undefined }),
  useIsFocused: () => screenFocus.focused,
}));
mock.module(
  '@/shared/ui/presence/presence-canvas',
  () => import('@/shared/ui/presence/presence-canvas.web')
);
mock.module(
  '@/shared/ui/presence/use-tier-probe',
  () => import('@/shared/ui/presence/use-tier-probe.web')
);
mock.module('@/shared/ui/sheet/sheet', () => import('@/shared/ui/sheet/sheet.web'));
mock.module('@/shared/libs/window-fullscreen', () => import('@/shared/libs/window-fullscreen.web'));
mock.module(
  '@/shared/ui/media/player/player-fullscreen',
  () => import('@/shared/ui/media/player/player-fullscreen.web')
);
mock.module(
  '@/shared/ui/media/player/video-surface',
  () => import('@/shared/ui/media/player/video-surface.web')
);
mock.module('@/core/services/storage', () => import('@/core/services/storage/storage.web'));
mock.module(
  '@/features/conversations/components/live-wave',
  () => import('@/features/conversations/components/live-wave.web')
);
mock.module('uniwind', () => ({
  Uniwind: { setTheme: () => undefined },
  useUniwind: () => ({ theme: 'light' }),
  ScopedTheme: ({ children }: { children: ReactNode }) => children,
  withUniwind: <T>(component: T) => component,
}));
mock.module('react-native-reanimated', async () => {
  const web = await import('react-native-web');
  return {
    default: {
      View: web.View,
      Text: web.Text,
      ScrollView: web.ScrollView,
      createAnimatedComponent: <T>(component: T) => component,
    },
    useSharedValue: <T>(initial: T) => useRef(sharedValue(initial)).current,
    makeMutable: sharedValue,
    useAnimatedScrollHandler: () => () => undefined,
    useAnimatedReaction: () => undefined,
    useAnimatedStyle: <T>(build: () => T) => build(),
    useReducedMotion: () => false,
    withSpring: <T>(target: T) => target,
    withTiming: <T>(target: T, _config?: unknown, done?: (finished: boolean) => void) => {
      done?.(true);
      return target;
    },
    withRepeat: <T>(animation: T) => animation,
    withSequence: <T>(...steps: T[]) => steps.at(-1),
    cancelAnimation: () => undefined,
    useFrameCallback: () => ({ setActive: () => undefined }),
    Keyframe: class {
      duration() {
        return this;
      }
    },
    Easing: {
      bezier: () => () => 0,
      linear: (progress: number) => progress,
      cubic: (progress: number) => progress,
      in: <T>(easing: T) => easing,
      out: <T>(easing: T) => easing,
    },
    FadeIn: chain(),
    FadeOut: chain(),
    LayoutAnimationConfig: ({ children }: { children: ReactNode }) => children,
    LinearTransition: chain(),
    SlideInUp: chain(),
    SlideOutUp: chain(),
    ZoomIn: chain(),
  };
});

const { cleanup } = await import('@testing-library/react');
const { loadDictionary } = await import('@/core/locales');

await loadDictionary('en');

afterEach(() => cleanup());

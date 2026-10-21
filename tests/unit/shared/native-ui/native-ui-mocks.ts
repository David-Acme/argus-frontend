import { mock } from 'bun:test';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { es } from '@/core/i18n/locales/es';
import { translateLoose } from '@/core/i18n/translate';

type Props = Record<string, unknown> & { children?: ReactNode };

export const captured: Record<string, Props> = {};
export const calls: {
  alerts: unknown[][];
  drawAtlas: unknown[][];
  frames: number;
  disposed: string[];
  ran: unknown[][];
} = {
  alerts: [],
  drawAtlas: [],
  frames: 0,
  disposed: [],
  ran: [],
};
export const frameCallbacks: ((info: { timestamp: number }) => void)[] = [];
export const window = { width: 360, height: 800 };

function attributes(props: Props): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    if (['string', 'number', 'boolean'].includes(typeof value))
      out[key.toLowerCase()] = String(value);
  }
  return out;
}

function host(tag: string) {
  function Host(props: Props) {
    return createElement(`rn-${tag}`, attributes(props), props.children);
  }
  return Host;
}

function recorder(name: string, slots: readonly string[] = []) {
  function Recorder(props: Props) {
    captured[name] = props;
    const extra = slots.map((slot) => props[slot] as ReactNode);
    return createElement(`rn-${name.toLowerCase()}`, attributes(props), ...extra, props.children);
  }
  return Recorder;
}

function sharedValue<T>(initial: T) {
  let value = initial;
  return { get: () => value, set: (next: T) => (value = next), value };
}

function fakeCanvas() {
  return {
    clear: () => undefined,
    drawPaint: () => undefined,
    drawLine: () => undefined,
    drawRect: () => undefined,
    drawAtlas: (...args: unknown[]) => calls.drawAtlas.push(args),
  };
}

function fakeSurface() {
  const canvas = fakeCanvas();
  return {
    getCanvas: () => canvas,
    flush: () => undefined,
    makeImageSnapshot: () => {
      calls.frames += 1;
      const frame = calls.frames;
      return { kind: 'image', dispose: () => calls.disposed.push(`image-${frame}`) };
    },
    dispose: () => calls.disposed.push('surface'),
  };
}

const paint = () => ({
  setAntiAlias: () => undefined,
  setStyle: () => undefined,
  setStrokeCap: () => undefined,
  setStrokeWidth: () => undefined,
  setColor: () => undefined,
  setBlendMode: () => undefined,
  dispose: () => calls.disposed.push('paint'),
});

export function installNativeUiMocks(): void {
  mock.module('react-native', () => ({
    Platform: {
      OS: 'web',
      select: <T>(options: { web?: T; default?: T }) => options.web ?? options.default,
    },
    AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
    Linking: { openSettings: async () => undefined },
    PermissionsAndroid: {
      check: async () => false,
      request: async () => 'denied',
      PERMISSIONS: {},
      RESULTS: {},
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => false,
      isReduceTransparencyEnabled: async () => false,
      addEventListener: () => ({ remove: () => undefined }),
    },
    BackHandler: { addEventListener: () => ({ remove: () => undefined }) },
    Alert: { alert: (...args: unknown[]) => calls.alerts.push(args) },
    Dimensions: { get: () => window, addEventListener: () => ({ remove: () => undefined }) },
    PixelRatio: { get: () => 2 },
    StyleSheet: {
      create: <T>(styles: T) => styles,
      flatten: (style: unknown) => Object.assign({}, ...[style].flat(Infinity)),
    },
    useWindowDimensions: () => window,
    View: host('view'),
    Text: host('text'),
    TextInput: host('input'),
    Pressable: host('pressable'),
    ScrollView: host('scroll'),
  }));
  mock.module('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }),
  }));
  mock.module('react-native-gesture-handler', () => ({
    ScrollView: host('scroll'),
    GestureHandlerRootView: host('gesture-root'),
  }));
  mock.module('uniwind', () => ({ useUniwind: () => ({ theme: 'dark' }) }));
  mock.module('expo-router', () => ({
    useIsFocused: () => true,
    useLocalSearchParams: () => ({}),
    Redirect: host('redirect'),
  }));
  mock.module('expo-device', () => ({ totalMemory: 2 * 1024 ** 3 }));
  mock.module('react-native-reanimated', () => ({
    useSharedValue: sharedValue,
    useFrameCallback: (callback: (info: { timestamp: number }) => void) => {
      frameCallbacks.push(callback);
      return { setActive: () => undefined, isActive: false, callbackId: 1 };
    },
  }));
  mock.module('react-native-worklets', () => ({
    scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => {
      calls.ran.push(args);
      fn(...args);
    },
    scheduleOnUI: () => undefined,
  }));
  mock.module('@shopify/react-native-skia', () => ({
    Canvas: host('skia-canvas'),
    Image: host('skia-image'),
    ColorMatrix: host('skia-color-matrix'),
    BlendMode: { DstOut: 8, Plus: 12, Modulate: 13, SrcOver: 3 },
    PaintStyle: { Stroke: 1 },
    StrokeCap: { Round: 1 },
    Skia: {
      Surface: { MakeOffscreen: () => fakeSurface() },
      Paint: paint,
      RSXform: () => ({ set: () => undefined }),
      XYWHRect: (x: number, y: number, width: number, height: number) => ({
        x,
        y,
        width,
        height,
        setXYWH: () => undefined,
      }),
    },
  }));
  mock.module('@lodev09/react-native-true-sheet', () => ({
    TrueSheet: recorder('TrueSheet', ['header', 'footer']),
  }));
  mock.module('@rn-primitives/dialog', () => ({
    Root: recorder('DialogRoot'),
    Portal: host('portal'),
    Overlay: recorder('DialogOverlay'),
    Content: recorder('DialogContent'),
    Title: host('title'),
  }));
  mock.module('@/shared/hooks/use-translation', () => ({
    useTranslation: () => ({
      t: (key: string, params?: Record<string, string>) =>
        translateLoose(es, key).replace(/\{(\w+)\}/g, (_, name: string) => params?.[name] ?? ''),
      language: 'es',
    }),
  }));
  mock.module('@/shared/components/ui/button', () => ({ Button: recorder('Button') }));
  mock.module('@/shared/ui/button', () => ({
    Button: (props: Props) =>
      createElement(
        'rn-ui-button',
        attributes(props),
        (props.trailing as { key?: string } | undefined)?.key
      ),
  }));
  mock.module('@/shared/components/ui/text', () => ({ Text: host('text') }));
}

const SERVER = 'react-dom/server';

export async function markupRenderer(): Promise<(element: ReactElement) => string> {
  const server = (await import(SERVER)) as {
    renderToStaticMarkup: (element: ReactElement) => string;
  };
  return server.renderToStaticMarkup;
}

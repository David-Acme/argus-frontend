import { clsx } from 'clsx';
import { useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useNavOffsets } from '@/shared/hooks/use-bottom-nav-inset';
import {
  auraField,
  layout,
  usePaneSplit,
  useWindowLayout,
  type AuraTone,
  type WindowLayout,
} from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { PanesProvider } from './screen-column-context';
import { ScreenScroll } from './screen-scroll';
import type { ScreenRefresh } from './screen-scroll-types';
import { ScreenTopBar, type ScreenTopBarProps } from './screen-top-bar';
import { useScreenScroll } from './use-screen-scroll';

export type ScreenProps = ScreenTopBarProps & {
  aura?: AuraTone;
  refresh?: ScreenRefresh;
  columns?: boolean | 'panes';
  children: ReactNode;
};

const CAP = {
  medium: { maxWidth: layout.contentMedium },
  desktop: { maxWidth: layout.textMax },
} as const;

function contentStyleOf({ windowClass, navigation }: WindowLayout, top: number, clearance: number) {
  return {
    flexGrow: 1,
    paddingTop: top,
    paddingHorizontal: windowClass === 'compact' ? layout.gutterCompact : layout.gutterMedium,
    paddingBottom: navigation === 'bar' ? clearance : layout.gutterMedium,
  };
}

function capOf(windowClass: WindowLayout['windowClass'], desktop: boolean) {
  if (desktop) return CAP.desktop;
  return windowClass === 'medium' ? CAP.medium : undefined;
}

function hasTopBar({ title, meta, back, actions, updating }: ScreenTopBarProps): boolean {
  return Boolean(title || meta || back || actions || updating);
}

export function Screen({ aura, refresh, columns, children, ...bar }: ScreenProps) {
  const window = useWindowLayout();
  const insets = useContext(SafeAreaInsetsContext);
  const top = insets?.top ?? 0;
  const { clearance } = useNavOffsets();
  const { onScroll, auraHidden, band } = useScreenScroll(auraField.height, top);
  const bandFrame = { height: top };
  const desktop = window.windowClass === 'expanded' || window.windowClass === 'wide';
  const header = hasTopBar(bar) ? <ScreenTopBar {...bar} /> : null;
  const field = aura ? <Aura tone={aura} paused={auraHidden} /> : null;
  const paneSplit = usePaneSplit();
  const paned = desktop || (columns === 'panes' && paneSplit);
  if (columns && paned)
    return (
      <View className="bg-bg relative min-h-0 flex-1">
        {field}
        {header ? <View className="px-screen-column-x">{header}</View> : null}
        <View className="min-h-0 flex-1">
          <PanesProvider value>{children}</PanesProvider>
        </View>
      </View>
    );
  return (
    <View className="bg-bg relative flex-1">
      {field}
      <ScreenScroll
        onScroll={onScroll}
        refresh={refresh}
        contentStyle={contentStyleOf(window, top, clearance)}>
        <View
          className={clsx('w-full', window.windowClass !== 'compact' && 'self-center')}
          style={capOf(window.windowClass, desktop)}>
          {header}
          {children}
        </View>
      </ScreenScroll>
      <Animated.View
        aria-hidden
        pointerEvents="none"
        testID="screen-top-band"
        className="bg-bg absolute inset-x-0 top-0"
        style={[bandFrame, band]}
      />
    </View>
  );
}

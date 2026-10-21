import { clsx } from 'clsx';
import { useContext, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import {
  auraField,
  inset,
  layout,
  useWindowLayout,
  type AuraTone,
  type WindowLayout,
} from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { ScreenScroll } from './screen-scroll';
import type { ScreenRefresh } from './screen-scroll-types';
import { ScreenTopBar, type ScreenTopBarProps } from './screen-top-bar';
import { useScreenScroll } from './use-screen-scroll';

export type ScreenProps = ScreenTopBarProps & {
  aura?: AuraTone;
  refresh?: ScreenRefresh;
  columns?: boolean;
  children: ReactNode;
};

const CAP = {
  medium: { maxWidth: layout.contentMedium },
  desktop: { maxWidth: layout.textMax },
} as const;

function contentStyleOf({ windowClass, navigation }: WindowLayout, top: number) {
  return {
    flexGrow: 1,
    paddingTop: top,
    paddingHorizontal: windowClass === 'compact' ? layout.gutterCompact : layout.gutterMedium,
    paddingBottom: navigation === 'bar' ? inset.screen.bodyBottom : layout.gutterMedium,
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
  const { onScroll, auraHidden } = useScreenScroll(auraField.height);
  const desktop = window.windowClass === 'expanded' || window.windowClass === 'wide';
  const header = hasTopBar(bar) ? <ScreenTopBar {...bar} /> : null;
  const field = aura ? <Aura tone={aura} paused={auraHidden} /> : null;
  if (columns && desktop)
    return (
      <View className="bg-bg relative min-h-0 flex-1">
        {field}
        {header ? <View className="px-screen-column-x">{header}</View> : null}
        <View className="min-h-0 flex-1">{children}</View>
      </View>
    );
  return (
    <View className="bg-bg relative flex-1">
      {field}
      <ScreenScroll
        onScroll={onScroll}
        refresh={refresh}
        contentStyle={contentStyleOf(window, top)}>
        <View
          className={clsx('w-full', window.windowClass !== 'compact' && 'self-center')}
          style={capOf(window.windowClass, desktop)}>
          {header}
          {children}
        </View>
      </ScreenScroll>
    </View>
  );
}

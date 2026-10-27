import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import type { useScreenScroll } from './use-screen-scroll';

export type ScreenRefresh = { refreshing: boolean; onRefresh: () => void };

export type ScreenScrollProps = {
  onScroll?: ReturnType<typeof useScreenScroll>['onScroll'];
  refresh?: ScreenRefresh;
  contentStyle: ViewStyle;
  hug?: boolean;
  children: ReactNode;
};

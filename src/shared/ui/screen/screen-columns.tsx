import { clsx } from 'clsx';
import { Children, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { layout, useWindowLayout } from '@/shared/theme';
import { ColumnGrowProvider, ScreenColumnProvider, usePanes } from './screen-column-context';

export type ScreenColumnsProps = { children: ReactNode };

export type ScreenColumnProps = {
  width?: number;
  max?: number;
  label?: string;
  grows?: number;
  children: ReactNode;
};

const CONTENT = { maxWidth: layout.contentMax };

const FILL = { flexGrow: 1 };

function columnStyle(width: number | undefined, max: number | undefined) {
  if (width !== undefined) return { width, flexGrow: 0, flexShrink: 0 };
  return max === undefined ? undefined : { maxWidth: max };
}

function useDesktop(): boolean {
  const { windowClass } = useWindowLayout();
  const panes = usePanes();
  return (
    windowClass === 'expanded' || windowClass === 'wide' || (panes && windowClass === 'medium')
  );
}

export function ScreenColumns({ children }: ScreenColumnsProps) {
  if (!useDesktop()) return <>{children}</>;
  return (
    <View
      className="gap-screen-column-gap px-screen-column-x min-h-0 w-full flex-1 flex-row self-center"
      style={CONTENT}>
      {children}
    </View>
  );
}

export function ScreenColumn({ width, max, label, grows, children }: ScreenColumnProps) {
  const desktop = useDesktop();
  if (!desktop) return <>{children}</>;
  const items = Children.toArray(children);
  const fixed = columnStyle(width, max);
  const growing = grows ?? items.length - 1;
  return (
    <ScrollView
      aria-label={label}
      className={clsx('web:scroll-column min-w-0', width === undefined && 'flex-1')}
      style={fixed}
      contentContainerStyle={FILL}>
      <View className="px-screen-column-pad-x pb-screen-column-bottom grow">
        <ScreenColumnProvider value>
          {items.map((child, index) => (
            <View key={index} className={index === growing ? 'grow' : undefined}>
              <ColumnGrowProvider value={index === growing}>{child}</ColumnGrowProvider>
            </View>
          ))}
        </ScreenColumnProvider>
      </View>
    </ScrollView>
  );
}

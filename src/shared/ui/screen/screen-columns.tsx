import { clsx } from 'clsx';
import { Children, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { layout, useWindowLayout } from '@/shared/theme';
import { ColumnGrowProvider, ScreenColumnProvider } from './screen-column-context';

export type ScreenColumnsProps = { children: ReactNode };

export type ScreenColumnProps = {
  width?: number;
  label?: string;
  grows?: number | false;
  children: ReactNode;
};

const CONTENT = { maxWidth: layout.contentMax };

const FILL = { flexGrow: 1 };

function useDesktop(): boolean {
  const { windowClass } = useWindowLayout();
  return windowClass === 'expanded' || windowClass === 'wide';
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

export function ScreenColumn({ width, label, grows, children }: ScreenColumnProps) {
  const desktop = useDesktop();
  if (!desktop) return <>{children}</>;
  const items = Children.toArray(children);
  const fixed = width === undefined ? undefined : { width, flexGrow: 0, flexShrink: 0 };
  const growing = grows === false ? -1 : (grows ?? items.length - 1);
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

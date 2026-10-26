import type { ReactNode } from 'react';
import { View } from 'react-native';
import { size, useHeightLayout, useWindowLayout } from '@/shared/theme';
import { ScreenColumn, ScreenColumns } from '@/shared/ui/screen';

export type LiveLayoutProps = {
  main: ReactNode;
  side: ReactNode;
  mainLabel: string;
  sideLabel: string;
};

export function LiveLayout({ main, side, mainLabel, sideLabel }: LiveLayoutProps) {
  const { landscape } = useHeightLayout();
  const { navigation } = useWindowLayout();
  if (landscape && navigation === 'bar')
    return (
      <View className="flex-row items-start gap-6">
        <View className="min-w-0 flex-1">{main}</View>
        <View className="w-column-side" testID="live-side">
          {side}
        </View>
      </View>
    );
  return (
    <ScreenColumns>
      <ScreenColumn label={mainLabel} grows={-1}>
        {main}
      </ScreenColumn>
      <ScreenColumn width={size.columnSide} label={sideLabel}>
        {side}
      </ScreenColumn>
    </ScreenColumns>
  );
}

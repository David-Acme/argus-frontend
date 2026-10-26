import type { ReactNode } from 'react';
import { View } from 'react-native';
import { size, useHeightLayout, useWindowLayout } from '@/shared/theme';
import { ScreenColumn, ScreenColumns } from '@/shared/ui/screen';

export type LiveLayoutProps = {
  stage: ReactNode;
  rows: ReactNode;
  dock: ReactNode;
  mainLabel: string;
  sideLabel: string;
};

const SIDE_ID = 'live-side';

export function LiveLayout({ stage, rows, dock, mainLabel, sideLabel }: LiveLayoutProps) {
  const { landscape } = useHeightLayout();
  const { navigation } = useWindowLayout();
  if (landscape && navigation === 'bar')
    return (
      <View className="flex-row items-start gap-6">
        <View className="min-w-0 flex-1">
          {stage}
          {rows}
        </View>
        <View className="w-dock-side" testID={SIDE_ID}>
          {dock}
        </View>
      </View>
    );
  return (
    <ScreenColumns>
      <ScreenColumn label={mainLabel} grows={-1}>
        {stage}
      </ScreenColumn>
      <ScreenColumn width={size.columnSide} label={sideLabel}>
        {rows}
        {dock}
      </ScreenColumn>
    </ScreenColumns>
  );
}

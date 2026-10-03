import { Children, type ReactNode, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { useWindowClass } from '@/shared/hooks/use-window-class';

type TaskBoardProps = {
  children: ReactNode;
};

const SIDE_BY_SIDE_MIN = 600;
const LANE_GAP = 12;
const LANE_INSET = 24;
const LANE_MAX = 360;
const BLEED = 40;

export function TaskBoard({ children }: TaskBoardProps) {
  const { isCompact } = useWindowClass();
  const [width, setWidth] = useState(0);
  const lanes = Children.toArray(children);
  const sideBySide = width > 0 ? width >= SIDE_BY_SIDE_MIN : !isCompact;
  const laneWidth = Math.min(LANE_MAX, Math.max(240, width - LANE_INSET));

  const measure = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const measureBled = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width - BLEED);

  if (sideBySide) {
    return (
      <View className="min-h-[380px] flex-1 flex-row items-stretch gap-4" onLayout={measure}>
        {lanes.map((lane, index) => (
          <View key={index} className="min-w-0 flex-1 basis-0">
            {lane}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View onLayout={measureBled} className="-mx-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={laneWidth + LANE_GAP}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerClassName="items-stretch px-5 pb-1"
        contentContainerStyle={{ gap: LANE_GAP }}>
        {lanes.map((lane, index) => (
          <View key={index} className="min-h-[340px]" style={{ width: laneWidth }}>
            {lane}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

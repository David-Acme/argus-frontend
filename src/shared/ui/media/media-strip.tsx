import { clsx } from 'clsx';
import { Children, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { inset, size, useWindowLayout } from '@/shared/theme';

export type MediaStripProps = { label: string; item?: 'media' | 'shortcut'; children: ReactNode };

const SNAP = size.mediaStrip + inset.media.gap;

const SHORTCUT = { width: size.rail };

const SHORTCUT_SNAP = size.rail + inset.media.gap;

export function MediaStrip({ label, item = 'media', children }: MediaStripProps) {
  const { windowClass } = useWindowLayout();
  const bleed = windowClass === 'compact';
  return (
    <ScrollView
      horizontal
      aria-label={label}
      showsHorizontalScrollIndicator={false}
      snapToInterval={item === 'media' ? SNAP : SHORTCUT_SNAP}
      decelerationRate="fast"
      disableIntervalMomentum
      className={clsx('web:snap-x web:snap-mandatory', bleed && 'web:scroll-px-4 -mx-4')}
      contentContainerClassName={clsx('gap-media-gap', bleed && 'px-4')}>
      {Children.toArray(children).map((child, index) => (
        <View
          key={index}
          className={clsx('web:snap-start', item === 'media' && 'w-media-strip')}
          style={item === 'shortcut' ? SHORTCUT : undefined}>
          {child}
        </View>
      ))}
    </ScrollView>
  );
}

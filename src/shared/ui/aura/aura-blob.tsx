import { useId } from 'react';
import type { ComponentProps } from 'react';
import Animated from 'react-native-reanimated';
import { RadialGradient, Rect, Stop, Svg } from 'react-native-svg';
import { blobPadding, blobStops, type AuraBlob } from './blob-stops';

export type AuraBlobProps = {
  blob: AuraBlob;
  index: number;
  fill: string;
  drift: ComponentProps<typeof Animated.View>['style'];
};

function frameOf(blob: AuraBlob) {
  const width = blob.width + blobPadding * 2;
  const height = blob.height + blobPadding * 2;
  const edge =
    'right' in blob ? { right: blob.right - blobPadding } : { left: blob.left - blobPadding };
  return { position: 'absolute' as const, width, height, top: blob.top - blobPadding, ...edge };
}

export function AuraBlobView({ blob, index, fill, drift }: AuraBlobProps) {
  const frame = frameOf(blob);
  const id = `aura-${useId().replace(/[^a-zA-Z0-9]/g, '')}-${index}`;
  return (
    <Animated.View style={[frame, drift]}>
      <Svg width={frame.width} height={frame.height}>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          {blobStops(blob).map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={fill}
              stopOpacity={stop.opacity}
            />
          ))}
        </RadialGradient>
        <Rect width={frame.width} height={frame.height} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

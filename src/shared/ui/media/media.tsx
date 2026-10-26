import { clsx } from 'clsx';
import { useState, type ReactNode } from 'react';
import { View, type ImageSourcePropType, type PointerEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { illustration, layout, motion, useWindowLayout } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import { MediaFrame } from './media-frame';
import {
  Controls,
  DormantMark,
  EyeCorner,
  LabelRow,
  LiveChip,
  type MediaControl,
  type MediaDormant,
  type MediaEye,
} from './media-parts';

type MediaContent = {
  name?: string;
  detail?: string;
  live?: string;
  dormant?: MediaDormant;
  frame?: ImageSourcePropType;
  children?: ReactNode;
};

export type MediaTileProps = MediaContent & {
  variant?: 'tile';
  fill?: boolean;
  center?: ReactNode;
  reveal?: ReactNode;
  onPress?: () => void;
};

export type MediaStageProps = MediaContent & {
  variant: 'stage';
  controls?: readonly MediaControl[];
  eye?: MediaEye;
  center?: ReactNode;
};

export type MediaProps = MediaTileProps | MediaStageProps;

type LayersProps = MediaContent & { overlay?: ReactNode; marked?: boolean };

type RevealProps = { shown: boolean; children: ReactNode };

const LIVE_FRAME = { aspectRatio: layout.mediaAspect, backgroundColor: illustration.media };

const DORMANT_FRAME = { aspectRatio: layout.mediaAspect };

const FILL_FRAME = { backgroundColor: illustration.media };

const REVEAL_SHOWN = {
  backgroundColor: illustration.mediaHover,
  opacity: 1,
  pointerEvents: 'box-none',
  transitionProperty: 'opacity',
  transitionDuration: motion.duration.fast,
} as const;

const REVEAL_HIDDEN = { ...REVEAL_SHOWN, opacity: 0, pointerEvents: 'none' } as const;

const PASS_THROUGH = { pointerEvents: 'box-none' } as const;

function Layers({
  name,
  detail,
  live,
  dormant,
  frame,
  children,
  overlay,
  marked = true,
}: LayersProps) {
  return (
    <>
      {frame && !dormant ? <MediaFrame source={frame} /> : null}
      {children && !dormant ? <View className="absolute inset-0">{children}</View> : null}
      {live && !dormant ? <LiveChip label={live} /> : null}
      {dormant && marked ? <DormantMark dormant={dormant} /> : null}
      {overlay}
      <LabelRow name={name} detail={detail} dormant={dormant} />
    </>
  );
}

function Reveal({ shown, children }: RevealProps) {
  return (
    <Animated.View
      className="gap-overlay-reveal-gap absolute inset-0 flex-row items-center justify-center"
      style={shown ? REVEAL_SHOWN : REVEAL_HIDDEN}>
      {children}
    </Animated.View>
  );
}

function accessibleName({ name, live, detail }: MediaContent): string {
  return [name, live, detail].filter(Boolean).join(', ');
}

function tileFrame({ dormant, fill }: Pick<MediaTileProps, 'dormant' | 'fill'>) {
  if (fill) return dormant ? undefined : FILL_FRAME;
  return dormant ? DORMANT_FRAME : LIVE_FRAME;
}

function Tile({ center, reveal, onPress, fill, ...content }: MediaTileProps) {
  const [hovered, setHovered] = useState(false);
  const pointer = (shown: boolean) => (event: PointerEvent) => {
    if (event.nativeEvent.pointerType === 'mouse') setHovered(shown);
  };
  const frame = tileFrame({ dormant: content.dormant, fill });
  const stretch = fill && 'min-h-media-fill flex-1';
  const surface = clsx(content.dormant && 'bg-fill', stretch);
  const body = <Layers {...content} />;
  return (
    <View
      className={clsx('rounded-media web:focus-inset relative overflow-hidden', stretch)}
      onPointerEnter={pointer(true)}
      onPointerLeave={pointer(false)}>
      {onPress ? (
        <PressableSurface
          a11y={{ label: accessibleName(content), role: 'button' }}
          onPress={onPress}
          pressed={{ scale: 'surface', grow: fill }}
          className={surface}
          style={frame}>
          {body}
        </PressableSurface>
      ) : (
        <View className={surface} style={frame}>
          {body}
        </View>
      )}
      {center ? (
        <View className="absolute inset-0 items-center justify-center" style={PASS_THROUGH}>
          {center}
        </View>
      ) : null}
      {reveal && !content.dormant ? <Reveal shown={hovered}>{reveal}</Reveal> : null}
    </View>
  );
}

function Stage({ controls, eye, center, ...content }: MediaStageProps) {
  const { windowClass } = useWindowLayout();
  const overlay = (
    <>
      {center ? (
        <View className="absolute inset-0 items-center justify-center" style={PASS_THROUGH}>
          {center}
        </View>
      ) : null}
      {eye ? <EyeCorner eye={eye} /> : null}
      {controls && controls.length > 0 && !content.dormant ? (
        <Controls controls={controls} />
      ) : null}
    </>
  );
  return (
    <View
      role="region"
      aria-label={accessibleName(content) || undefined}
      className={clsx(
        'web:focus-inset relative overflow-hidden',
        windowClass === 'compact' ? '-mx-4' : 'rounded-media',
        content.dormant && 'bg-fill'
      )}
      style={content.dormant ? DORMANT_FRAME : LIVE_FRAME}>
      <Layers {...content} overlay={overlay} marked={!center} />
    </View>
  );
}

export function Media(props: MediaProps) {
  if (props.variant === 'stage') return <Stage {...props} />;
  return <Tile {...props} />;
}

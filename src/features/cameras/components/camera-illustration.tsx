import { useUniwind } from 'uniwind';
import Svg from 'react-native-svg';
import type { CameraFormFactor } from '@/core/types';
import { colorTokens } from '@/shared/constants';
import {
  Doorbell,
  Dome,
  Ptz,
  Turret,
} from '@/features/cameras/components/camera-illustration-ceiling';
import type { Palette, ShapeProps } from '@/features/cameras/components/camera-illustration-parts';
import {
  Bullet,
  Cube,
  Outdoor,
  Sphere,
} from '@/features/cameras/components/camera-illustration-shapes';
import { cameraLookOf } from '@/features/cameras/model/camera-looks';
import type { LookShape } from '@/features/cameras/model/camera-looks';

type CameraIllustrationProps = {
  formFactor: CameraFormFactor;
  look?: string;
  size?: number;
  label?: string;
};

const VIEW_BOX = '0 0 120 90';

const SHAPES: Record<LookShape, (props: ShapeProps) => React.JSX.Element> = {
  cube: Cube,
  sphere: Sphere,
  bullet: Bullet,
  outdoor: Outdoor,
  turret: Turret,
  dome: Dome,
  ptz: Ptz,
  doorbell: Doorbell,
};

export function CameraIllustration({
  formFactor,
  look = '',
  size = 96,
  label,
}: CameraIllustrationProps) {
  const { theme } = useUniwind();
  const tokens = colorTokens[theme === 'dark' ? 'dark' : 'light'];
  const palette: Palette = {
    line: tokens['foreground-secondary'],
    body: tokens.card,
    shade: tokens['surface-secondary'],
    face: tokens.overlay,
    glass: tokens['muted-foreground'],
    ring: tokens['legacy-accent'],
    shine: tokens['legacy-surface'],
    glow: tokens['accent-soft'],
  };
  const shape = cameraLookOf(look, formFactor);
  const Shape = SHAPES[shape.shape];

  return (
    <Svg
      width={size}
      height={(size * 90) / 120}
      viewBox={VIEW_BOX}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}>
      <Shape palette={palette} look={shape} />
    </Svg>
  );
}

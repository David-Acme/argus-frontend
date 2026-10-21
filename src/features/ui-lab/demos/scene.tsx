import { Ellipse, LinearGradient, Path, RadialGradient, Stop, Svg } from 'react-native-svg';
import { illustration } from '@/shared/theme';

export type SceneName = keyof typeof illustration.scenes;

type SceneProps = { name: SceneName };

const FULL = 100;

export function Scene({ name }: SceneProps) {
  const scene = illustration.scenes[name];
  const across = scene.axis === 'x';
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${FULL} ${FULL}`} preserveAspectRatio="none">
      <LinearGradient id={`${name}-shade`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset={0} stopColor={illustration.sceneShade} stopOpacity={scene.shade.top} />
        <Stop
          offset={scene.shade.from / FULL}
          stopColor={illustration.sceneShade}
          stopOpacity={scene.shade.top}
        />
        <Stop offset={1} stopColor={illustration.sceneShade} stopOpacity={scene.shade.bottom} />
      </LinearGradient>
      {scene.glow ? (
        <RadialGradient id={`${name}-glow`}>
          <Stop offset={0} stopColor={scene.glow.color} stopOpacity={1} />
          <Stop offset={0.7} stopColor={scene.glow.color} stopOpacity={0} />
        </RadialGradient>
      ) : null}
      {scene.bands.map(([fill, start, end]) => (
        <Path
          key={`${fill}-${start}`}
          d={across ? `M${start} 0H${end}V${FULL}H${start}Z` : `M0 ${start}H${FULL}V${end}H0Z`}
          fill={fill}
        />
      ))}
      {scene.glow ? (
        <Ellipse
          cx={scene.glow.cx}
          cy={scene.glow.cy}
          rx={scene.glow.rx}
          ry={scene.glow.ry}
          fill={`url(#${name}-glow)`}
        />
      ) : null}
      <Path d={`M0 0H${FULL}V${FULL}H0Z`} fill={`url(#${name}-shade)`} />
    </Svg>
  );
}

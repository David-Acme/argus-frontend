import { colorTokens, MORPH_ICONS } from '@/shared/constants';
import type { MorphIconName } from '@/core/types';
import type { IconInput, SpringPreset } from 'morphicons';
import { canonicalD, type MorphOptions, type ReducedMotionMode } from 'morphicons/dom';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { createMorphDriver, type MorphDriver } from './morph-icon-driver';

type MorphIconProps = {
  name: MorphIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  spring?: SpringPreset;
  reducedMotion?: ReducedMotionMode;
  label?: string;
};

type MorphHandle = {
  morphTo(icon: IconInput, spring?: SpringPreset | MorphOptions): void;
  set(icon: IconInput): void;
};

export const MorphIcon = forwardRef<MorphHandle, MorphIconProps>(
  (
    {
      name,
      size = 24,
      color = colorTokens.light.foreground,
      strokeWidth = 2,
      spring = 'smooth',
      reducedMotion = 'user',
      label,
    },
    ref,
  ) => {
    const icon = MORPH_ICONS[name];
    const [path, setPath] = useState(() => canonicalD(icon));
    const [mounted] = useState(() => ({ icon, reducedMotion }));
    const driverRef = useRef<MorphDriver | null>(null);
    const previousIconRef = useRef(icon);
    const springRef = useRef(spring);
    springRef.current = spring;

    useImperativeHandle(
      ref,
      () => ({
        morphTo: (nextIcon, nextSpring) => driverRef.current?.morphTo(nextIcon, nextSpring ?? springRef.current),
        set: (nextIcon) => driverRef.current?.set(nextIcon),
      }),
      [],
    );

    useEffect(() => {
      const driver = createMorphDriver({ icon: mounted.icon, reducedMotion: mounted.reducedMotion, onPath: setPath });
      driverRef.current = driver;
      return () => {
        driver.destroy();
        driverRef.current = null;
      };
    }, [mounted]);

    useEffect(() => {
      if (previousIconRef.current === icon) return;
      previousIconRef.current = icon;
      driverRef.current?.morphTo(icon, spring);
    }, [icon, spring]);

    useEffect(() => {
      driverRef.current?.reduceMotion(reducedMotion);
    }, [reducedMotion]);

    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}>
        <Path d={path} />
      </Svg>
    );
  },
);

MorphIcon.displayName = 'MorphIcon';

export type { MorphHandle };
export type { MorphIconProps };

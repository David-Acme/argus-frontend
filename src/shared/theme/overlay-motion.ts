import { Easing, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { IS_WEB } from '@/shared/constants';

const SPRING = { damping: 22, stiffness: 300, mass: 0.9 } as const;

const fadeOut = (duration: number) => FadeOut.duration(duration).easing(Easing.in(Easing.linear));

const springIn = (scale: number) =>
  ZoomIn.withInitialValues({ transform: [{ scale }] })
    .springify()
    .damping(SPRING.damping)
    .stiffness(SPRING.stiffness)
    .mass(SPRING.mass);

const NATIVE_MOTION = {
  scrimIn: FadeIn.duration(200).easing(Easing.out(Easing.cubic)),
  scrimOut: fadeOut(150),
  dialogIn: springIn(0.95),
  dialogOut: fadeOut(150),
  menuIn: springIn(0.96),
  menuOut: fadeOut(120),
};

export const overlayMotion: Partial<typeof NATIVE_MOTION> = IS_WEB ? {} : NATIVE_MOTION;

export const overlayWebIn = IS_WEB
  ? { scrim: 'animate-in fade-in-0', panel: 'animate-in fade-in-0 zoom-in-95' }
  : { scrim: '', panel: '' };

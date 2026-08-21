import {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
} from 'react-native-reanimated';

/** Shared timing easing for soft, natural motion. */
export const easeOutCubic = Easing.out(Easing.cubic);

/** Screen content entrance: gentle rise + fade (respects reduce-motion via consumers). */
export const screenIn = FadeIn.duration(320).easing(easeOutCubic);

export const screenInUp = SlideInDown.duration(320).easing(easeOutCubic);

/** Element entrance used by staggered groups. */
export const itemIn = FadeIn.duration(260).easing(easeOutCubic);

/** Immediate fade for plain content swaps. */
export const fadeIn = FadeIn.duration(180).easing(easeOutCubic);

export const overlayIn = FadeIn.duration(200).easing(Easing.out(Easing.cubic));

export const overlayOut = FadeOut.duration(150).easing(Easing.in(Easing.linear));

export const dialogIn = ZoomIn.withInitialValues({ transform: [{ scale: 0.95 }] })
  .springify()
  .damping(22)
  .stiffness(300)
  .mass(0.9);

export const dialogOut = FadeOut.duration(150).easing(Easing.in(Easing.linear));

export const menuIn = ZoomIn.withInitialValues({ transform: [{ scale: 0.96 }] })
  .springify()
  .damping(22)
  .stiffness(300)
  .mass(0.9);

export const menuOut = FadeOut.duration(120).easing(Easing.in(Easing.linear));

/** Bottom sheet: springs up, slides back down. Transform only, so it stays on the UI thread. */
export const sheetIn = SlideInDown.springify().damping(26).stiffness(320).mass(0.9);

export const sheetOut = SlideOutDown.duration(200).easing(Easing.in(Easing.cubic));

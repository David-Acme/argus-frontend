import {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
} from 'react-native-reanimated';

export const easeOutCubic = Easing.out(Easing.cubic);

export const screenIn = FadeIn.duration(320).easing(easeOutCubic);

export const screenInUp = SlideInDown.duration(320).easing(easeOutCubic);

export const itemIn = FadeIn.duration(260).easing(easeOutCubic);

export const fadeIn = FadeIn.duration(180).easing(easeOutCubic);

export const overlayIn = FadeIn.duration(200).easing(Easing.out(Easing.cubic));

export const overlayOut = FadeOut.duration(150).easing(Easing.in(Easing.linear));

export const dialogIn = ZoomIn.withInitialValues({ transform: [{ scale: 0.95 }] })
  .springify()
  .damping(22)
  .stiffness(300)
  .mass(0.9);

export const dialogOut = FadeOut.duration(150).easing(Easing.in(Easing.linear));

export const sheetIn = SlideInDown.springify().damping(26).stiffness(320).mass(0.9);

export const sheetOut = SlideOutDown.duration(200).easing(Easing.in(Easing.cubic));

import { Easing, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

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

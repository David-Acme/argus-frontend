import {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
} from 'react-native-reanimated';
import { IS_IOS } from '@/shared/constants';
import { contextMenuMotion } from '@/shared/libs/context-menu-motion';

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

export const menuIn = ZoomIn.withInitialValues({ transform: [{ scale: 0.96 }] })
  .springify()
  .damping(22)
  .stiffness(300)
  .mass(0.9);

export const menuOut = FadeOut.duration(120).easing(Easing.in(Easing.linear));

const contextMenu = contextMenuMotion(IS_IOS ? 'ios' : 'android');

export const contextMenuIn = ZoomIn.withInitialValues({
  transform: [{ scale: contextMenu.initialScale }],
})
  .duration(contextMenu.enterDuration)
  .easing(easeOutCubic);

export const contextMenuOut = FadeOut.duration(contextMenu.exitDuration).easing(
  Easing.in(Easing.cubic)
);

export const sheetIn = SlideInDown.springify().damping(26).stiffness(320).mass(0.9);

export const sheetOut = SlideOutDown.duration(200).easing(Easing.in(Easing.cubic));

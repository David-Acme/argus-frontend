import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { Modal, View } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import {
  enterWindowFullscreen,
  exitWindowFullscreen,
  onWindowFullscreenExit,
  releaseWindowOrientation,
} from '../services/window-fullscreen';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import { IS_NATIVE } from '@/shared/constants';

type CameraFullscreenProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

const ORIENTATIONS = ['portrait', 'landscape', 'landscape-left', 'landscape-right'] as const;

export function CameraFullscreen({ open, onClose, children }: CameraFullscreenProps) {
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    void enterWindowFullscreen();
    const stop = onWindowFullscreenExit(() => close());
    return () => {
      stop();
      void exitWindowFullscreen();
    };
  }, [open]);

  useEffect(() => () => void releaseWindowOrientation(), []);

  return (
    <Modal
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={[...ORIENTATIONS]}
      statusBarTranslucent
      navigationBarTranslucent>
      {IS_NATIVE && open ? <SystemBars hidden /> : null}
      <View className="flex-1" style={{ backgroundColor: CAMERA_LIVE_BACKGROUND }}>
        {children}
      </View>
    </Modal>
  );
}

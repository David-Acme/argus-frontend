/* eslint-disable react-hooks/immutability */
import { useQrScanStore } from '@/core/stores';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { IS_WEB } from '@/shared/constants';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function QrScannerScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);

  const cameraReadyRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);
  const navigatingRef = useRef(false);

  const boxX = useSharedValue(width / 2);
  const boxY = useSharedValue(height / 2);
  const boxWidth = useSharedValue(0);
  const boxHeight = useSharedValue(0);
  const boxOpacity = useSharedValue(0);

  const finishScan = useCallback(
    (data: string) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      useQrScanStore.getState().setValue(data);
      router.back();
    },
    [router],
  );

  const handleBarCodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (!cameraReadyRef.current) return;
      const { data, bounds } = result;
      if (!bounds) return;
      if (data === lastScannedRef.current) return;
      lastScannedRef.current = data;
      setScannedData(data);

      boxX.value = withSpring(bounds.origin.x);
      boxY.value = withSpring(bounds.origin.y);
      boxWidth.value = withSpring(bounds.size.width);
      boxHeight.value = withSpring(bounds.size.height);
      boxOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(
          1200,
          withTiming(0, { duration: 300 }, (finished) => {
            if (finished) {
              runOnJS(finishScan)(data);
            }
          }),
        ),
      );
    },
    [boxX, boxY, boxWidth, boxHeight, boxOpacity, finishScan],
  );

  const boxStyle = useAnimatedStyle(() => {
    const extra = 0.1;
    return {
      position: 'absolute',
      left: boxX.value - (boxWidth.value * extra) / 2,
      top: boxY.value - (boxHeight.value * extra) / 2,
      width: boxWidth.value * (1 + extra),
      height: boxHeight.value * (1 + extra),
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: 'rgba(0,0,0,0.9)',
      borderRadius: boxWidth.value / 10,
      opacity: boxOpacity.value,
    };
  });

  if (!permission) {
    return <View className="flex-1 bg-background" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Icon name="scan-barcode" className="text-muted-foreground size-10" />
        <Text variant="muted" className="text-center">
          Para escanear el código QR de vinculación, Argus necesita acceso a la cámara.
        </Text>
        <Button onPress={requestPermission}>
          <Text>Permitir cámara</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center overflow-hidden bg-background">
      <CameraView
        style={StyleSheet.absoluteFill}
        mute
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
        onCameraReady={() => {
          cameraReadyRef.current = true;
        }}
      />
      <Animated.View style={boxStyle} pointerEvents="none">
        {scannedData && (
          <Animated.View
            key={scannedData}
            entering={FadeInDown.springify().delay(200)}
            exiting={FadeOutDown.duration(150)}
            className="absolute top-full mt-2.5 min-w-48 rounded-full bg-overlay px-4 py-1.5">
            <Text className="text-white text-sm" numberOfLines={1} adjustsFontSizeToFit>
              {scannedData}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
      <Button
        size="icon"
        variant="outline"
        className="absolute top-12 right-4"
        onPress={() => {
          navigatingRef.current = true;
          router.back();
        }}>
        <Icon name="x" />
      </Button>
    </View>
  );
}

export default function QrScreen() {
  return IS_WEB ? <Redirect href="/" /> : <QrScannerScreen />;
}

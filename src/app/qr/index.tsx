import { useQrScanStore } from '@/core/stores';
import {
  QrCameraAction,
  QrGuideFrame,
  QrManualEntry,
  QrScanPanel,
  QrScanSheet,
} from '@/shared/components/qr';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import {
  colorTokens,
  IS_WEB,
  QR_SCAN_CONFIRM_MS,
  QR_SCAN_FRAME_MAX,
  QR_SCAN_FRAME_RATIO,
  QR_SCAN_RETRY_MS,
  QR_SCAN_SHEET_PADDING_BOTTOM,
  QR_SCAN_SHEET_RADIUS,
  QR_SCAN_SUPPORTING_PANE_MAX_WIDTH,
  QR_SCAN_SUPPORTING_PANE_MIN_WIDTH,
  QR_SCAN_SUPPORTING_PANE_RATIO,
  QR_SCAN_TYPING_GAP,
  WINDOW_MEDIUM_MIN,
  WINDOW_TALL_MIN,
} from '@/shared/constants';
import { useKeyboardProgress } from '@/shared/hooks/use-keyboard-progress';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { shouldUseQrSupportingPane } from '@/shared/libs/qr-layout';
import { cn } from '@/shared/libs/utils';
import type { QrScanFeedback, TranslationKey } from '@/core/types';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

const BLOCKED_TITLE: TranslationKey = 'screens.qr.blocked-title';
const BLOCKED_DESCRIPTION: TranslationKey = 'screens.qr.blocked-description';
const DETECTED_DESCRIPTION: TranslationKey = 'screens.qr.detected-description';
const FALLBACK_INVALID_DESCRIPTION: TranslationKey = 'screens.qr.invalid-fallback';
const CHROME_FADE_END = 0.33;

function QrScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUniwind();
  const { width, height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const keyboard = useKeyboardProgress();
  const [permission, requestPermission] = useCameraPermissions();
  const config = useQrScanStore((state) => state.config);
  const { t } = useTranslation();
  const [torch, setTorch] = useState(false);
  const [detectedValue, setDetectedValue] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [controlsBottom, setControlsBottom] = useState(0);
  const [asked, setAsked] = useState(false);

  const cameraReadyRef = useRef(false);
  const leavingRef = useRef(false);
  const requestedRef = useRef(false);
  const rejectedRef = useRef<string | null>(null);

  const palette = colorTokens[theme === 'dark' ? 'dark' : 'light'];
  const isSupportingPane = shouldUseQrSupportingPane(width, windowHeight, {
    mediumMin: WINDOW_MEDIUM_MIN,
    tallMin: WINDOW_TALL_MIN,
  });
  const supportingPaneWidth = isSupportingPane
    ? Math.min(
        QR_SCAN_SUPPORTING_PANE_MAX_WIDTH,
        Math.max(QR_SCAN_SUPPORTING_PANE_MIN_WIDTH, width * QR_SCAN_SUPPORTING_PANE_RATIO)
      )
    : 0;
  const previewWidth = width - supportingPaneWidth;
  const frameSize = Math.min(previewWidth * QR_SCAN_FRAME_RATIO, QR_SCAN_FRAME_MAX);
  const granted = permission?.granted === true;
  const canRetryPermission = asked && permission !== null && !permission.granted && permission.canAskAgain;
  const isBlocked = asked && permission !== null && !permission.granted && !permission.canAskAgain;
  const detected = detectedValue !== null;
  const restOffset = Math.max(0, windowHeight - contentHeight);
  const typingOffset = controlsBottom + QR_SCAN_TYPING_GAP;

  const feedback: QrScanFeedback =
    permission === null || (!permission.granted && !isBlocked)
      ? 'requesting'
      : !permission.granted
        ? 'blocked'
        : detected
          ? 'detected'
          : invalid
            ? 'invalid'
            : 'searching';

  const title = feedback === 'blocked' ? t(BLOCKED_TITLE) : t(config.title);

  const description =
    feedback === 'blocked'
      ? t(BLOCKED_DESCRIPTION)
      : feedback === 'detected'
        ? t(DETECTED_DESCRIPTION)
        : feedback === 'invalid'
          ? t(config.invalidMessage ?? FALLBACK_INVALID_DESCRIPTION)
          : config.hint === null
            ? null
            : t(config.hint);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: restOffset * (1 - keyboard.progress.value) }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: typingOffset * keyboard.progress.value }],
  }));

  const chromeStyle = useAnimatedStyle(() => {
    const collapse = Math.max(0, 1 - keyboard.progress.value / CHROME_FADE_END);
    return {
      borderTopLeftRadius: QR_SCAN_SHEET_RADIUS * collapse,
      borderTopRightRadius: QR_SCAN_SHEET_RADIUS * collapse,
      borderTopColor: interpolateColor(collapse, [0, 1], [palette.card, palette.border]),
    };
  });

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const close = useCallback(() => {
    if (leavingRef.current) {
      return;
    }
    leavingRef.current = true;
    useQrScanStore.getState().cancel();
    leave();
  }, [leave]);

  const accept = useCallback(
    (value: string) => {
      if (leavingRef.current) {
        return;
      }
      leavingRef.current = true;
      useQrScanStore.getState().setValue(value);
      leave();
    },
    [leave]
  );

  const isValid = useCallback(
    (value: string) => config.pattern === null || config.pattern.test(value),
    [config.pattern]
  );

  const reject = useCallback((value: string) => {
    rejectedRef.current = value;
    setInvalid(true);
  }, []);

  const handleCameraReady = useCallback(() => {
    cameraReadyRef.current = true;
  }, []);

  const handleTorchToggle = useCallback(() => setTorch((current) => !current), []);

  const handleReturnToCamera = useCallback(() => Keyboard.dismiss(), []);

  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    setContentHeight(event.nativeEvent.layout.height);
  }, []);

  const handleControlsLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setControlsBottom(y + height);
  }, []);

  const askPermission = useCallback(async () => {
    await requestPermission();
    setAsked(true);
  }, [requestPermission]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (!cameraReadyRef.current || leavingRef.current || data.length === 0) {
        return;
      }
      if (isValid(data)) {
        setDetectedValue(data);
        return;
      }
      if (data === rejectedRef.current) {
        return;
      }
      reject(data);
    },
    [isValid, reject]
  );

  const handleManualSubmit = useCallback(
    (value: string) => {
      Keyboard.dismiss();
      if (isValid(value)) {
        accept(value);
        return;
      }
      reject(value);
    },
    [accept, isValid, reject]
  );

  useEffect(() => {
    if (useQrScanStore.getState().status !== 'scanning') {
      useQrScanStore.getState().open();
    }
    return () => {
      if (useQrScanStore.getState().status === 'scanning') {
        useQrScanStore.getState().cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (permission === null || permission.granted || requestedRef.current) {
      return;
    }
    requestedRef.current = true;
    void askPermission();
  }, [permission, askPermission]);

  useEffect(() => {
    if (detectedValue === null) {
      return;
    }
    const timer = setTimeout(() => accept(detectedValue), QR_SCAN_CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [accept, detectedValue]);

  useEffect(() => {
    if (!invalid) {
      return;
    }
    const timer = setTimeout(() => setInvalid(false), QR_SCAN_RETRY_MS);
    return () => clearTimeout(timer);
  }, [invalid]);

  const scanActions = (
    <>
      {isBlocked ? (
        <Button onPress={handleOpenSettings}>
          <Icon name="settings" />
          <Text>{t('common.open-settings')}</Text>
        </Button>
      ) : null}

      {canRetryPermission ? (
        <Button onPress={askPermission}>
          <Icon name="camera" />
          <Text>{t('common.allow-camera')}</Text>
        </Button>
      ) : null}

      {config.manualLabel !== null && config.manualPlaceholder !== null ? (
        <QrManualEntry
          label={config.manualLabel}
          placeholder={config.manualPlaceholder}
          invalid={feedback === 'invalid'}
          onSubmit={handleManualSubmit}
        />
      ) : null}
    </>
  );

  const scanSheet = (
    <QrScanSheet
      feedback={feedback}
      title={title}
      description={description}
      reduceMotion={reduceMotion}>
      {scanActions}
    </QrScanSheet>
  );

  return (
    <View className={cn('bg-background flex-1', isSupportingPane && 'flex-row')}>
      <View
        className={cn(
          'relative flex-1',
          isSupportingPane && 'border-border-subtle m-5 overflow-hidden rounded-[28px] border'
        )}>
        {granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            mute
            active={!keyboard.fullyOpen}
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={detected || keyboard.visible ? undefined : handleBarcodeScanned}
            onCameraReady={handleCameraReady}
          />
        ) : (
          <View className="bg-surface absolute inset-0 items-center justify-center">
            <Icon name="scan-barcode" className="text-placeholder size-10" />
          </View>
        )}

        <View
          className="flex-1 items-center justify-center"
          style={isSupportingPane ? undefined : { paddingBottom: contentHeight }}
          pointerEvents="none">
          <QrGuideFrame size={frameSize} feedback={feedback} reduceMotion={reduceMotion} />
        </View>

        {isSupportingPane ? null : (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                right: 0,
                left: 0,
                height: windowHeight,
                backgroundColor: palette.card,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
              chromeStyle,
              cardStyle,
            ]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleReturnToCamera}
              accessible={false}
            />

            <Animated.View style={contentStyle}>
              <View
                onLayout={handleContentLayout}
                style={{ paddingBottom: insets.bottom + QR_SCAN_SHEET_PADDING_BOTTOM }}>
                {scanSheet}
              </View>
            </Animated.View>
          </Animated.View>
        )}

        <View
          className="absolute right-0 left-0 flex-row items-center justify-between px-4"
          style={{ top: insets.top + 8 }}
          pointerEvents="box-none"
          onLayout={handleControlsLayout}>
          <Button
            size="icon"
            variant="outline"
            onPress={close}
            accessibilityLabel={t('screens.qr.close-scanner')}>
            <Icon name="arrow-left" />
          </Button>

          {granted ? (
            <QrCameraAction
              progress={keyboard.progress}
              torch={torch}
              returnsToCamera={keyboard.visible}
              onToggleTorch={handleTorchToggle}
              onReturnToCamera={handleReturnToCamera}
            />
          ) : null}
        </View>
      </View>

      {isSupportingPane ? (
        <QrScanPanel
          width={supportingPaneWidth}
          topInset={insets.top}
          bottomInset={insets.bottom}
          feedback={feedback}
          title={title}
          description={description}
          reduceMotion={reduceMotion}
        >
          {scanActions}
        </QrScanPanel>
      ) : null}
    </View>
  );
}

export default function QrScreen() {
  return IS_WEB ? <Redirect href="/" /> : <QrScannerScreen />;
}

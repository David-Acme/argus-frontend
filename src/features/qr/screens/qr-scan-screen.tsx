import { useQrScanner } from '@/features/qr/hooks/use-qr-scanner';
import { QrCameraAction } from '@/features/qr/components/qr-camera-action';
import { QrGuideFrame } from '@/features/qr/components/qr-guide-frame';
import { QrManualEntry } from '@/features/qr/components/qr-manual-entry';
import { QrScanPanel } from '@/features/qr/components/qr-scan-panel';
import { QrScanSheet } from '@/features/qr/components/qr-scan-sheet';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { colorTokens, IS_WEB, WINDOW_MEDIUM_MIN, WINDOW_TALL_MIN } from '@/shared/constants';
import { QR_SCAN_FRAME_MAX, QR_SCAN_FRAME_RATIO, QR_SCAN_SHEET_PADDING_BOTTOM, QR_SCAN_SHEET_RADIUS, QR_SCAN_SUPPORTING_PANE_MAX_WIDTH, QR_SCAN_SUPPORTING_PANE_MIN_WIDTH, QR_SCAN_SUPPORTING_PANE_RATIO, QR_SCAN_TYPING_GAP } from '@/features/qr/constants';
import { useKeyboardProgress } from '@/shared/hooks/use-keyboard-progress';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { shouldUseQrSupportingPane } from '@/features/qr/model/qr-layout';
import { cn } from '@/shared/libs/utils';
import { CameraView } from 'expo-camera';
import { Redirect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

const CHROME_FADE_END = 0.33;

function QrScannerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useUniwind();
  const { width, height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const keyboard = useKeyboardProgress();
  const { t } = useTranslation();
  const scanner = useQrScanner();
  const { config, feedback, title, description, granted, detected, torch } = scanner;
  const [contentHeight, setContentHeight] = useState(0);
  const [controlsBottom, setControlsBottom] = useState(0);

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
  const restOffset = Math.max(0, windowHeight - contentHeight);
  const typingOffset = controlsBottom + QR_SCAN_TYPING_GAP;

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

  const handleReturnToCamera = useCallback(() => Keyboard.dismiss(), []);

  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    setContentHeight(event.nativeEvent.layout.height);
  }, []);

  const handleControlsLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setControlsBottom(y + height);
  }, []);

  const scanActions = (
    <>
      {scanner.isBlocked ? (
        <Button onPress={scanner.openSettings}>
          <Icon name="settings" />
          <Text>{t('common.open-settings')}</Text>
        </Button>
      ) : null}

      {scanner.canRetryPermission ? (
        <Button onPress={scanner.askPermission}>
          <Icon name="camera" />
          <Text>{t('common.allow-camera')}</Text>
        </Button>
      ) : null}

      {config.manualLabel !== null && config.manualPlaceholder !== null ? (
        <QrManualEntry
          label={config.manualLabel}
          placeholder={config.manualPlaceholder}
          invalid={feedback === 'invalid'}
          onSubmit={scanner.onManualSubmit}
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
            onBarcodeScanned={detected || keyboard.visible ? undefined : scanner.onBarcodeScanned}
            onCameraReady={scanner.onCameraReady}
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
            onPress={scanner.close}
            accessibilityLabel={t('screens.qr.close-scanner')}>
            <Icon name="arrow-left" />
          </Button>

          {granted ? (
            <QrCameraAction
              progress={keyboard.progress}
              torch={torch}
              returnsToCamera={keyboard.visible}
              onToggleTorch={scanner.toggleTorch}
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

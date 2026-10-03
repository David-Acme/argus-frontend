import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Linking } from 'react-native';
import { useQrScanStore } from '@/core/stores';
import type { QrScanFeedback, TranslationKey } from '@/core/types';
import { QR_SCAN_CONFIRM_MS, QR_SCAN_RETRY_MS } from '@/features/qr/constants';
import { useTranslation } from '@/shared/hooks/use-translation';

const BLOCKED_TITLE: TranslationKey = 'screens.qr.blocked-title';
const BLOCKED_DESCRIPTION: TranslationKey = 'screens.qr.blocked-description';
const DETECTED_DESCRIPTION: TranslationKey = 'screens.qr.detected-description';
const FALLBACK_INVALID_DESCRIPTION: TranslationKey = 'screens.qr.invalid-fallback';

export function useQrScanner() {
  const router = useRouter();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const config = useQrScanStore((state) => state.config);
  const [torch, setTorch] = useState(false);
  const [detectedValue, setDetectedValue] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [asked, setAsked] = useState(false);
  const cameraReadyRef = useRef(false);
  const leavingRef = useRef(false);
  const requestedRef = useRef(false);
  const rejectedRef = useRef<string | null>(null);

  const granted = permission?.granted === true;
  const canRetryPermission = asked && permission !== null && !permission.granted && permission.canAskAgain;
  const isBlocked = asked && permission !== null && !permission.granted && !permission.canAskAgain;
  const detected = detectedValue !== null;

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

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const finish = useCallback(
    (value: string | null) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      if (value === null) useQrScanStore.getState().cancel();
      else useQrScanStore.getState().setValue(value);
      leave();
    },
    [leave]
  );

  const close = useCallback(() => finish(null), [finish]);

  const isValid = useCallback(
    (value: string) => config.pattern === null || config.pattern.test(value),
    [config.pattern]
  );

  const reject = useCallback((value: string) => {
    rejectedRef.current = value;
    setInvalid(true);
  }, []);

  const onCameraReady = useCallback(() => {
    cameraReadyRef.current = true;
  }, []);

  const toggleTorch = useCallback(() => setTorch((current) => !current), []);

  const askPermission = useCallback(async () => {
    await requestPermission();
    setAsked(true);
  }, [requestPermission]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const onBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (!cameraReadyRef.current || leavingRef.current || data.length === 0) return;
      if (isValid(data)) {
        setDetectedValue(data);
        return;
      }
      if (data !== rejectedRef.current) reject(data);
    },
    [isValid, reject]
  );

  const onManualSubmit = useCallback(
    (value: string) => {
      Keyboard.dismiss();
      if (isValid(value)) finish(value);
      else reject(value);
    },
    [finish, isValid, reject]
  );

  useEffect(() => {
    if (useQrScanStore.getState().status !== 'scanning') useQrScanStore.getState().open();
    return () => {
      if (useQrScanStore.getState().status === 'scanning') useQrScanStore.getState().cancel();
    };
  }, []);

  useEffect(() => {
    if (permission === null || permission.granted || requestedRef.current) return;
    requestedRef.current = true;
    void askPermission();
  }, [permission, askPermission]);

  useEffect(() => {
    if (detectedValue === null) return;
    const timer = setTimeout(() => finish(detectedValue), QR_SCAN_CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [finish, detectedValue]);

  useEffect(() => {
    if (!invalid) return;
    const timer = setTimeout(() => setInvalid(false), QR_SCAN_RETRY_MS);
    return () => clearTimeout(timer);
  }, [invalid]);

  return {
    config,
    feedback,
    title,
    description,
    granted,
    canRetryPermission,
    isBlocked,
    detected,
    torch,
    toggleTorch,
    onCameraReady,
    onBarcodeScanned,
    onManualSubmit,
    askPermission,
    openSettings,
    close,
  };
}

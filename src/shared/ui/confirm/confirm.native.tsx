import { useEffect, useEffectEvent } from 'react';
import { Alert } from 'react-native';
import { IS_ANDROID } from '@/shared/constants';
import { useWindowLayout } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ConfirmDialog } from './confirm-dialog';
import { confirmForm } from './confirm-form';
import type { ConfirmProps } from './confirm-types';
import { useConfirmLatch } from './use-confirm-latch';

function NativeAlert({
  open,
  title,
  body,
  confirmLabel,
  variant,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const { t } = useTranslation();
  const latch = useConfirmLatch(open);
  const present = useEffectEvent(() => {
    const destructive = variant === 'destructive';
    const cancel = latch.once(onCancel);
    Alert.alert(
      title,
      body,
      [
        { text: t('common.cancel'), style: 'cancel', onPress: cancel },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: latch.once(onConfirm),
        },
      ],
      { cancelable: !destructive, onDismiss: cancel }
    );
  });
  useEffect(() => {
    if (open) present();
  }, [open]);
  return null;
}

export function Confirm(props: ConfirmProps) {
  const { windowClass } = useWindowLayout();
  const form = confirmForm({
    compact: windowClass === 'compact',
    destructive: props.variant === 'destructive',
    android: IS_ANDROID,
  });
  if (form === 'alert') return <NativeAlert {...props} />;
  return <ConfirmDialog {...props} />;
}

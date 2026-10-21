import { useEffect, useEffectEvent } from 'react';
import { Alert } from 'react-native';
import { useWindowLayout } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ConfirmDialog } from './confirm-dialog';
import type { ConfirmProps } from './confirm-types';

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
  const present = useEffectEvent(() => {
    const destructive = variant === 'destructive';
    Alert.alert(
      title,
      body,
      [
        { text: t('common.cancel'), style: 'cancel', onPress: onCancel },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
      ],
      { cancelable: !destructive, onDismiss: onCancel }
    );
  });
  useEffect(() => {
    if (open) present();
  }, [open]);
  return null;
}

export function Confirm(props: ConfirmProps) {
  const { windowClass } = useWindowLayout();
  if (windowClass === 'compact') return <NativeAlert {...props} />;
  return <ConfirmDialog {...props} />;
}

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/core/stores';
import { CONTENT_MAX_WIDTH, TOAST_MAX_WIDTH } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { useNavOffsets } from '@/shared/hooks/use-bottom-nav-inset';
import { inset, useWindowLayout } from '@/shared/theme';
import { ToastCard } from '@/shared/components/ui/toast-card';

export function Toaster() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { windowClass, isCompact } = useWindowClass();
  const { navigation } = useWindowLayout();
  const { toast: aboveBar } = useNavOffsets();
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);
  const act = useToastStore((state) => state.act);

  if (items.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center px-4"
      style={{ bottom: navigation === 'bar' ? aboveBar : insets.bottom + inset.toast.edge }}>
      <View
        className="w-full gap-2"
        style={{ maxWidth: isCompact ? CONTENT_MAX_WIDTH[windowClass] : TOAST_MAX_WIDTH }}>
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            dismissLabel={t('common.close')}
            onDismiss={dismiss}
            onAct={act}
          />
        ))}
      </View>
    </View>
  );
}

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/core/stores';
import { CONTENT_MAX_WIDTH } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { ToastCard } from './toast-card';

export function Toaster() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { windowClass } = useWindowClass();
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);

  if (items.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center px-4"
      style={{ top: insets.top + 8 }}>
      <View className="w-full gap-2" style={{ maxWidth: CONTENT_MAX_WIDTH[windowClass] }}>
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            dismissLabel={t('common.close')}
            onDismiss={dismiss}
          />
        ))}
      </View>
    </View>
  );
}

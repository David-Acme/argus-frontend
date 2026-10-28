import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useSurfaces } from '@/shared/libs/surfaces';
import { MediaStrip } from '@/shared/ui/media';
import {
  ModuleTile,
  moduleEntry,
  quickModules,
  useAllSheetActions,
  useNavPins,
  type NavEntry,
} from '@/features/navigation';

const ADD: NavEntry = { key: 'add', href: '', icon: 'plus', label: 'screens.navigation.add' };

export function ModuleShortcuts() {
  const { t } = useTranslation();
  const router = useRouter();
  const pins = useNavPins();
  const sheet = useAllSheetActions();
  const modules = quickModules(useSurfaces().modules, pins).map(moduleEntry);
  if (modules.length === 0) return null;
  const open = (entry: NavEntry) =>
    entry.key === ADD.key ? sheet.show(true) : router.navigate(entry.href);
  return (
    <View className="mt-section-top">
      <MediaStrip label={t('screens.navigation.quick-title')} item="shortcut">
        {[...modules, ADD].map((entry) => (
          <ModuleTile key={entry.key} entry={entry} onOpen={open} />
        ))}
      </MediaStrip>
    </View>
  );
}

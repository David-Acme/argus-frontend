import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useSurfaces } from '@/shared/libs/surfaces';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Sheet } from '@/shared/ui/sheet';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
import { useInicioPrefs } from '@/features/home/hooks/use-inicio-prefs';
import {
  moveSection,
  NO_INICIO_PREFS,
  orderedSections,
  toggleHidden,
} from '@/features/home/model/inicio-prefs';

export type CustomizeSheetProps = { open: boolean; onClose: () => void };

export function CustomizeSheet({ open, onClose }: CustomizeSheetProps) {
  const { t } = useTranslation();
  const { prefs, save } = useInicioPrefs();
  const sections = orderedSections(useSurfaces().inicio, prefs);
  const ids = sections.map((surface) => surface.id);
  const move = (id: string, delta: number) =>
    save({ ...prefs, order: moveSection(ids, id, delta) });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('screens.home.inicio.customize')}
      variant="list"
      long>
      <View className="gap-4">
        <Text variant="meta" tone="2">
          {t('screens.home.inicio.customize-hint')}
        </Text>
        <Section>
          {sections.map((surface, index) => {
            const section = t(surface.label);
            return (
              <Row
                key={surface.id}
                title={section}
                trailing={
                  <View className="flex-row items-center gap-1">
                    <Button
                      iconOnly
                      compact
                      variant="ghost"
                      icon="chevu"
                      label={t('screens.home.inicio.customize-up', { section })}
                      disabled={index === 0}
                      onPress={() => move(surface.id, -1)}
                    />
                    <Button
                      iconOnly
                      compact
                      variant="ghost"
                      icon="chevd"
                      label={t('screens.home.inicio.customize-down', { section })}
                      disabled={index === sections.length - 1}
                      onPress={() => move(surface.id, 1)}
                    />
                    <Switch
                      value={!prefs.hidden.includes(surface.id)}
                      label={t('screens.home.inicio.customize-show', { section })}
                      onValueChange={(shown) => save(toggleHidden(prefs, surface.id, shown))}
                    />
                  </View>
                }
              />
            );
          })}
        </Section>
        <Button
          block
          variant="ghost"
          label={t('screens.home.inicio.customize-reset')}
          onPress={() => save(NO_INICIO_PREFS)}
        />
        <Button block label={t('screens.home.inicio.customize-done')} onPress={onClose} />
      </View>
    </Sheet>
  );
}

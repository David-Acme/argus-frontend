import { useTranslation } from '@/shared/hooks/use-translation';
import { attentionByModule, useAttention, useSurfaces } from '@/shared/libs/surfaces';
import { Section } from '@/shared/ui/section';
import { useAllSheetActions } from '@/features/navigation';
import { MODULE_CARDS, rankedModules } from '@/features/home/model/module-cards';

export function ModuleCards() {
  const { t } = useTranslation();
  const sheet = useAllSheetActions();
  const modules = useSurfaces().modules;
  const ranked = rankedModules(modules, attentionByModule(useAttention()));
  const cards = ranked.filter((module) => module.card).slice(0, MODULE_CARDS);
  if (cards.length === 0) return null;
  return (
    <Section
      title={t('screens.home.inicio.sections.modules')}
      action={
        modules.length > MODULE_CARDS
          ? { label: t('screens.home.inicio.all-modules'), onPress: () => sheet.show(true) }
          : undefined
      }>
      {cards.map(({ module, card: Card }) => (Card ? <Card key={module} /> : null))}
    </Section>
  );
}

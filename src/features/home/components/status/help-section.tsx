import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { helpRows, type HelpRow } from '@/features/home/model/inicio-guide';

const ICONS: Readonly<Record<HelpRow, IconGlyph>> = {
  guards: 'shield',
  reminds: 'bell',
  answers: 'mic',
};

const TITLE_KEYS = {
  guards: 'screens.home.inicio.help.guards',
  reminds: 'screens.home.inicio.help.reminds',
  answers: 'screens.home.inicio.help.answers',
} as const;

const BODY_KEYS = {
  guards: 'screens.home.inicio.help.guards-body',
  reminds: 'screens.home.inicio.help.reminds-body',
  answers: 'screens.home.inicio.help.answers-body',
} as const;

export function HelpSection() {
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const rows = helpRows({
    cameras: has(CAPABILITY.cameraView),
    reminders: has(CAPABILITY.remindersRead),
    voice: has(CAPABILITY.assistantVoice),
  });
  if (rows.length === 0) return null;
  return (
    <Section title={t('screens.home.inicio.help.title')}>
      {rows.map((row) => (
        <Row
          key={row}
          leading={<Avatar icon={ICONS[row]} />}
          title={t(TITLE_KEYS[row])}
          meta={t(BODY_KEYS[row])}
        />
      ))}
    </Section>
  );
}

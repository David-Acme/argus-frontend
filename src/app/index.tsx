import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { THEME_OPTIONS, THEME_ICONS, colors } from '@/shared/constants';
import { getThemePreference, setThemePreference } from '@/shared/hooks/use-theme-preference';
import type { IconName, ThemePreference } from '@/core/types';
import { useUniwind } from 'uniwind';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

type SectionProps = {
  title: string;
  children: ReactNode;
};

type StatusTone = 'success' | 'warning' | 'error' | 'info';

type StatusPillProps = {
  tone: StatusTone;
  label: string;
};

const SAMPLE_ICONS: IconName[] = ['camera', 'shield-check', 'sparkles', 'video'];

export default function Screen() {
  const { theme } = useUniwind();
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference());

  const cycleTheme = () => {
    const idx = THEME_OPTIONS.indexOf(preference);
    const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length];
    setPreference(next);
    setThemePreference(next);
  };

  return (
    <ScrollView className="bg-background" contentContainerClassName="p-6 pb-16">
      <View className="gap-8">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 gap-1">
            <Text className="text-2xl font-bold tracking-tight text-foreground">ARGUS</Text>
            <Text variant="muted">Design system · {theme}</Text>
          </View>
          <Button size="icon" variant="ghost" className="rounded-full" onPress={cycleTheme}>
            <Icon name={THEME_ICONS[preference]} className="size-5" />
          </Button>
        </View>

        <Section title="Typography">
          <Text variant="h1">Heading 1</Text>
          <Text variant="h2">Heading 2</Text>
          <Text variant="h3">Heading 3</Text>
          <Text variant="lead">Lead — calm, confident, premium.</Text>
          <Text>
            Body copy. Everything runs on-device: face recognition, speech-to-text,
            text-to-speech and a local LLM. No cloud processing, ever.
          </Text>
          <Text variant="small">Small — labels and metadata.</Text>
          <Text variant="muted">Muted — captions and secondary info.</Text>
          <Text variant="code">npm run dev</Text>
        </Section>

        <Section title="Buttons">
          <View className="gap-2">
            <Button>
              <Text>Primary</Text>
            </Button>
            <Button variant="secondary">
              <Text>Secondary</Text>
            </Button>
            <Button variant="outline">
              <Text>Outline</Text>
            </Button>
            <Button variant="ghost">
              <Text>Ghost</Text>
            </Button>
            <Button variant="destructive">
              <Text>Destructive</Text>
            </Button>
            <Button variant="link">
              <Text>Link</Text>
            </Button>
            <Button disabled>
              <Text>Disabled</Text>
            </Button>
          </View>
        </Section>

        <Section title="Status">
          <View className="flex-row flex-wrap gap-2">
            <StatusPill tone="success" label="Online" />
            <StatusPill tone="warning" label="Motion" />
            <StatusPill tone="error" label="Offline" />
            <StatusPill tone="info" label="Info" />
          </View>
        </Section>

        <Section title="Icons">
          <View className="flex-row gap-4">
            {SAMPLE_ICONS.map((name) => (
              <View
                key={name}
                className="size-12 items-center justify-center rounded-xl bg-surface">
                <Icon name={name} className="size-6 text-foreground-secondary" />
              </View>
            ))}
          </View>
        </Section>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: SectionProps) {
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      {children}
    </View>
  );
}

function StatusPill({ tone, label }: StatusPillProps) {
  const { theme } = useUniwind();
  const color = colors[theme][tone];
  return (
    <View className="flex-row items-center gap-2 rounded-full bg-surface px-3 py-1.5">
      <View className="size-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-sm text-foreground-secondary">{label}</Text>
    </View>
  );
}

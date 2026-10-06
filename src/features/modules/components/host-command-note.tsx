import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { IS_WEB } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';

type HostCommandNoteProps = {
  commands: readonly string[];
};

const clipboardAvailable = (): boolean =>
  IS_WEB && typeof navigator !== 'undefined' && navigator.clipboard != null;

export function HostCommandNote({ commands }: HostCommandNoteProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (command: string) => {
    if (!clipboardAvailable()) return;
    void navigator.clipboard.writeText(command).then(() => setCopied(command));
  };

  return (
    <View className="bg-surface-secondary dark:bg-card-secondary gap-2 rounded-2xl p-3">
      <View className="flex-row items-start gap-2">
        <Icon name="hard-drive" className="text-accent-strong mt-0.5 size-4" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="label">{t('screens.modules.provisioned-title')}</Text>
          <Text variant="caption">{t('screens.modules.provisioned-hint')}</Text>
        </View>
      </View>
      <Text variant="caption" className="text-foreground-secondary">
        {t('screens.modules.host-command')}
      </Text>
      {commands.map((command) => (
        <View key={command} className="bg-card flex-row items-center gap-2 rounded-xl py-1.5 pl-3 pr-1.5">
          <Text variant="caption" selectable className="text-foreground min-w-0 flex-1 font-mono">
            {command}
          </Text>
          {clipboardAvailable() ? (
            <Button size="sm" variant="ghost" onPress={() => copy(command)}>
              <Icon name={copied === command ? 'check' : 'copy'} />
              <Text>{copied === command ? t('screens.modules.copied') : t('screens.modules.copy')}</Text>
            </Button>
          ) : null}
        </View>
      ))}
    </View>
  );
}

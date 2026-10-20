import { useState } from 'react';
import { View } from 'react-native';
import type { MinorMark } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import { usePrivacyDirectory } from '@/features/privacy/hooks/use-privacy-directory';
import { minorMarkOf, minorStandingOf } from '@/features/privacy/model/minor';

type MinorRowProps = {
  userId: number;
  name: string;
};

export function MinorRow({ userId, name }: MinorRowProps) {
  const { t } = useTranslation();
  const { directory, setMinor } = usePrivacyDirectory();
  const [pending, setPending] = useState(false);
  const state = directory?.users.find((user) => user.userId === userId);

  const change = async (mark: MinorMark) => {
    setPending(true);
    try {
      await setMinor({ userId, name, mark });
    } finally {
      setPending(false);
    }
  };

  if (!state) return null;

  const mark = minorMarkOf(state);
  const standing = minorStandingOf(mark);

  return (
    <View className="bg-surface-secondary gap-1 rounded-2xl px-4 py-3">
      <View className="flex-row items-center gap-3">
        <Icon name="baby" className="text-foreground-secondary size-5" />
        <Text variant="label" className="min-w-0 flex-1">
          {t('screens.privacy.minor.title')}
        </Text>
      </View>
      <ToggleRow
        label={t('screens.privacy.minor.switch')}
        hint={t('screens.privacy.minor.switch-hint')}
        value={mark.minor}
        disabled={pending}
        onChange={(minor) => void change({ minor, guardianConsent: false })}
      />
      {mark.minor ? (
        <>
          <ToggleRow
            label={t('screens.privacy.minor.consent')}
            hint={t('screens.privacy.minor.consent-hint')}
            value={mark.guardianConsent}
            disabled={pending}
            onChange={(guardianConsent) => void change({ minor: true, guardianConsent })}
          />
          <Text variant="caption" className="text-foreground-secondary">
            {standing === 'minor-consented'
              ? t('screens.privacy.minor.consented')
              : t('screens.privacy.minor.protected')}
          </Text>
          <Text variant="micro">{t('screens.privacy.minor.camera')}</Text>
        </>
      ) : null}
    </View>
  );
}

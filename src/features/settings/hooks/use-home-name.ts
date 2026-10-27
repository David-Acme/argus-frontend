import { useRef, useState } from 'react';
import type { SettingsOwner, TranslationKey } from '@/core/types';
import { toastServiceError } from '@/shared/libs/service-error';
import { HOME_NAME_KEY, HOUSEHOLD_OWNER } from '@/features/settings/constants/household.constant';
import { checkHomeName, refusedHomeName } from '@/features/settings/model/home-name';
import { settingsService } from '@/features/settings/services/settings.service';

type UseHomeNameInput = {
  onCatalog: (catalogs: readonly SettingsOwner[]) => void;
};

export type HomeNameSave = {
  error: TranslationKey | null;
  busy: boolean;
  clearError: () => void;
  save: (raw: string) => Promise<boolean>;
};

export function useHomeName({ onCatalog }: UseHomeNameInput): HomeNameSave {
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);
  const flying = useRef(false);

  const save = async (raw: string) => {
    const check = checkHomeName(raw);
    setError(check.error);
    if (check.error || flying.current) return false;
    flying.current = true;
    setBusy(true);
    try {
      const result = await settingsService.update(HOUSEHOLD_OWNER, [
        { key: HOME_NAME_KEY, value: check.value },
      ]);
      if (result.ok && result.info) {
        onCatalog([result.info.catalog]);
        return true;
      }
      const refused = refusedHomeName(result.errors);
      setError(refused);
      if (!refused) toastServiceError(result.errors);
      return false;
    } finally {
      flying.current = false;
      setBusy(false);
    }
  };

  const clearError = () => setError(null);

  return { error, busy, clearError, save };
}

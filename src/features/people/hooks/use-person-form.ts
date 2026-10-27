import { useState } from 'react';
import type { IPeopleDirectoryCacheRow, IUserManagementUpdate } from '@/core/interfaces';
import { synchronizeService } from '@/core/services/sync';
import type { UserRole } from '@/core/types';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { offModuleOfRole } from '@/shared/libs/capabilities';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { toast } from '@/shared/libs/toast';
import {
  personDraftOf,
  personDraftChanged,
  personUpdateOf,
} from '@/features/people/model/person-draft';
import type { PersonDraft } from '@/features/people/model/person-draft';
import { userManagementService } from '@/features/people/services/user-management.service';

export function usePersonForm() {
  const { t } = useTranslation();
  const view = useAccessView();
  const [editing, setEditing] = useState<IPeopleDirectoryCacheRow | null>(null);
  const [draft, setDraft] = useState<PersonDraft>({ name: '', lastName: '', role: 'resident' });
  const [tried, setTried] = useState(false);
  const missingName = tried && draft.name.trim().length === 0;
  const offModule = offModuleOfRole(view, draft.role);

  const start = (row: IPeopleDirectoryCacheRow) => {
    setEditing(row);
    setDraft(personDraftOf(row));
    setTried(false);
  };

  const close = () => setEditing(null);

  const submit = async () => {
    setTried(true);
    if (!editing) return;
    const values: IUserManagementUpdate | null = personUpdateOf(draft);
    if (!values) return;
    const user = editing;
    setEditing(null);
    const response = await runOptimistic({
      intents: [{ table: 'user', kind: 'update', recordId: user.id, values }],
      call: () => userManagementService.update(Number(user.id), values),
      success: t('screens.users.user-saved'),
    });
    if (!response) return;
    void synchronizeService.syncOnce();
    if (draft.role !== user.role && offModule !== null)
      toast.info(
        t('screens.users.role-saved-paused', {
          module: view.moduleNames.get(offModule) ?? offModule,
        })
      );
  };

  return {
    open: editing !== null,
    editing,
    draft,
    missingName,
    pausedBy: offModule === null ? null : (view.moduleNames.get(offModule) ?? offModule),
    dirty: editing !== null && personDraftChanged(editing, draft),
    start,
    close,
    change: (patch: Partial<PersonDraft>) => setDraft((previous) => ({ ...previous, ...patch })),
    pickRole: (role: UserRole) => setDraft((previous) => ({ ...previous, role })),
    submit,
  };
}

export type PersonForm = ReturnType<typeof usePersonForm>;

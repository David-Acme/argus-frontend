import type { IPeopleDirectoryCacheRow, IProjectMemberCacheRow } from '@/core/interfaces';
import { projectMemberService } from '@/core/services/project-member.service';
import type { ShareAccess } from '@/core/types';
import {
  ShareMembersDialog,
  type ShareDialogLabels,
} from '@/shared/components/sharing/share-members-dialog';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { personFullName } from '@/shared/libs/sharing';
import { memberCandidates } from '@/features/projects/model/project-access';

type ProjectMembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  ownerId: string;
  members: readonly IProjectMemberCacheRow[];
  isPending: (member: IProjectMemberCacheRow) => boolean;
  people: readonly IPeopleDirectoryCacheRow[];
};

export function ProjectMembersDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  ownerId,
  members,
  isPending,
  people,
}: ProjectMembersDialogProps) {
  const { t } = useTranslation();
  const candidates = memberCandidates({ ownerId, members, people }).map((person) => ({
    id: person.id,
    name: personFullName(person),
  }));
  const labels: ShareDialogLabels = {
    title: t('screens.projects.members-title', { name: projectName }),
    empty: t('screens.projects.members-empty'),
    addTitle: t('screens.projects.member-add'),
    addPlaceholder: t('screens.projects.member-add-placeholder'),
    addConfirm: t('screens.projects.member-add-confirm'),
    noneLeft: t('screens.projects.member-none-left'),
    newAccess: t('screens.projects.member-new-access'),
    accessView: t('screens.projects.access-view'),
    accessEdit: t('screens.projects.access-edit'),
    rowAccess: (name) => t('screens.projects.member-access', { name }),
    removeRow: (name) => t('screens.projects.member-remove', { name }),
    close: t('common.close'),
    search: t('common.search'),
    noResults: t('screens.projects.no-results'),
  };

  const add = (userId: string, access: ShareAccess) => {
    void runOptimistic({
      intents: [
        {
          table: 'project_member',
          kind: 'create',
          values: { projectId: Number(projectId), userId: Number(userId), access },
        },
      ],
      call: () => projectMemberService.add(projectId, userId, access),
      success: t('screens.projects.member-added'),
    });
  };

  const changeAccess = (member: IProjectMemberCacheRow, next: ShareAccess) => {
    void runOptimistic({
      intents: [
        { table: 'project_member', kind: 'update', recordId: member.id, values: { access: next } },
      ],
      call: () => projectMemberService.setAccess(member.id, next),
      success: t('screens.projects.member-saved'),
    });
  };

  const remove = (member: IProjectMemberCacheRow) => {
    void runOptimistic({
      intents: [{ table: 'project_member', kind: 'delete', recordId: member.id }],
      confirm: {
        title: labels.removeRow(member.name),
        description: t('screens.projects.member-remove-body', { project: projectName }),
        confirmLabel: t('common.confirm-delete'),
        intent: 'danger',
      },
      call: () => projectMemberService.remove(member.id),
      success: t('screens.projects.member-removed'),
    });
  };

  return (
    <ShareMembersDialog
      open={open}
      onOpenChange={onOpenChange}
      labels={labels}
      rows={members}
      isPending={isPending}
      candidates={candidates}
      onAdd={add}
      onChangeAccess={changeAccess}
      onRemove={remove}
    />
  );
}

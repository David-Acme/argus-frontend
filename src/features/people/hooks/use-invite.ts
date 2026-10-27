import { useEffect, useState } from 'react';
import type { IInviteCreated } from '@/core/interfaces';
import { inviteService } from '@/core/services/invite';
import { netService } from '@/core/services/net';
import { synchronizeService } from '@/core/services/sync';
import type { InviteRole, NetPairedInstance } from '@/core/types';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { offModuleOfRole } from '@/shared/libs/capabilities';
import { buildInvitationQr } from '@/shared/libs/invitation-qr';
import { roleLabelOf } from '@/shared/libs/role-label';
import { toastServiceError } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import { INVITE_ROLES } from '@/features/people/constants/people.constant';
import { createInvitationFlight } from '@/features/people/model/invitation-flight';
import { offerableRoles } from '@/features/people/model/invitations';
import type { InvitationPreview } from '@/features/people/model/invitations';

type ReadyInvitation = { created: IInviteCreated; instance: NetPairedInstance | null };

type InviteOptions = { startOpen: boolean; onCreated: (preview: InvitationPreview) => void };

type Created = { created: IInviteCreated; instance: NetPairedInstance };

const previewOf = ({ created, instance }: Created): InvitationPreview => ({
  invitationId: created.id,
  role: created.role,
  expiresAt: created.expiresAt,
  value: buildInvitationQr({
    token: created.token,
    host: instance.host,
    ip: instance.ip,
    port: instance.port,
    scheme: 'https',
    instanceId: instance.instanceId,
    caFingerprint: instance.caFingerprint,
  }),
});

function useModuleOff() {
  const view = useAccessView();
  return (role: string) => {
    const moduleId = offModuleOfRole(view, role);
    return moduleId === null ? null : (view.moduleNames.get(moduleId) ?? moduleId);
  };
}

export function useInvite({ startOpen, onCreated }: InviteOptions) {
  const { t } = useTranslation();
  const moduleOff = useModuleOff();
  const roles = offerableRoles((role) => moduleOff(role) !== null);
  const [open, setOpen] = useState(startOpen);
  const [picked, setPicked] = useState<InviteRole>('resident');
  const role = roles.includes(picked) ? picked : (roles[0] ?? picked);
  const [flight] = useState(() =>
    createInvitationFlight<ReadyInvitation>(({ created }) => void inviteService.revoke(created.id))
  );

  const request = async (): Promise<ReadyInvitation | null> => {
    const answer = await inviteService.create({ role });
    if (answer.ok && answer.info)
      return { created: answer.info, instance: await netService.instance() };
    if (answer.errors?.code === 'ROLE_INACTIVE') {
      toast.error(
        t('screens.users.invite-role-off-title'),
        t('screens.users.invite-role-off', {
          role: roleLabelOf(role, t),
          module: moduleOff(role) ?? '',
        })
      );
    } else {
      toastServiceError(answer.errors);
    }
    return null;
  };

  const close = () => {
    flight.abandon();
    setOpen(false);
  };

  const create = async () => {
    const ready = await flight.run(request);
    if (!ready) return;
    const { created, instance } = ready;
    if (!instance) {
      void inviteService.revoke(created.id);
      toast.error(t('common.errors.pairing-required'));
      return;
    }
    setOpen(false);
    onCreated(previewOf({ created, instance }));
    void synchronizeService.syncOnce();
  };

  useEffect(() => () => flight.abandon(), [flight]);

  return {
    open,
    role,
    roles,
    offRoles: roles.length < INVITE_ROLES.length,
    start: () => setOpen(true),
    close,
    pick: setPicked,
    create,
  };
}

export type Invite = ReturnType<typeof useInvite>;

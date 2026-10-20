export type InvitationFlight<T> = {
  run: (create: () => Promise<T | null>) => Promise<T | null>;
  abandon: () => void;
  busy: () => boolean;
};

export function createInvitationFlight<T>(discard: (created: T) => void): InvitationFlight<T> {
  let running = false;
  let abandoned = false;
  return {
    async run(create) {
      if (running) return null;
      running = true;
      abandoned = false;
      try {
        const created = await create();
        if (created !== null && abandoned) {
          discard(created);
          return null;
        }
        return created;
      } finally {
        running = false;
      }
    },
    abandon() {
      if (running) abandoned = true;
    },
    busy: () => running,
  };
}

export function replacedInvitation(
  shown: { invitationId: number } | null,
  next: { invitationId: number } | null,
  isSpent: (invitationId: number) => boolean
): number | null {
  if (!shown || shown.invitationId === next?.invitationId) return null;
  return isSpent(shown.invitationId) ? null : shown.invitationId;
}

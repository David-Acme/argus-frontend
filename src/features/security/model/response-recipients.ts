import type {
  EnvironmentResponseConfig,
  EnvironmentResponseUpdate,
  RecipientMode,
  ResponseContact,
  ResponseRecipient,
} from '@/core/types';

export type RecipientStep = { step: number; recipients: ResponseRecipient[] };

export type MoveDirection = 'earlier' | 'later';

const ROLE_ORDER: Readonly<Record<ResponseRecipient['role'], number>> = {
  owner: 0,
  guard: 1,
  resident: 2,
  guest: 3,
};

function byPlace(left: ResponseRecipient, right: ResponseRecipient): number {
  return left.step - right.step || ROLE_ORDER[left.role] - ROLE_ORDER[right.role] || left.userId - right.userId;
}

export function normalizeSteps(recipients: readonly ResponseRecipient[]): ResponseRecipient[] {
  const active = recipients.filter((recipient) => recipient.mode !== 'off');
  const steps = [...new Set(active.map((recipient) => recipient.step))].sort((left, right) => left - right);
  return recipients
    .map((recipient) =>
      recipient.mode === 'off' ? recipient : { ...recipient, step: steps.indexOf(recipient.step) }
    )
    .sort(byPlace);
}

export function stepsOf(recipients: readonly ResponseRecipient[]): RecipientStep[] {
  const groups = new Map<number, ResponseRecipient[]>();
  for (const recipient of normalizeSteps(recipients)) {
    if (recipient.mode === 'off') continue;
    groups.set(recipient.step, [...(groups.get(recipient.step) ?? []), recipient]);
  }
  return [...groups.entries()].sort(([left], [right]) => left - right).map(([step, list]) => ({ step, recipients: list }));
}

export function silentOf(recipients: readonly ResponseRecipient[]): ResponseRecipient[] {
  return recipients.filter((recipient) => recipient.mode === 'off').sort(byPlace);
}

export function moveRecipient(
  recipients: readonly ResponseRecipient[],
  userId: number,
  direction: MoveDirection
): ResponseRecipient[] {
  const list = normalizeSteps(recipients);
  const target = list.find((recipient) => recipient.userId === userId);
  if (!target || target.mode === 'off') return list;
  const shared = list.filter((recipient) => recipient.mode !== 'off' && recipient.step === target.step).length > 1;
  const last = Math.max(...list.filter((recipient) => recipient.mode !== 'off').map((recipient) => recipient.step));
  let next = target.step;
  if (direction === 'earlier') {
    if (target.step === 0 && !shared) return list;
    next = shared ? target.step - 0.5 : target.step - 1;
  }
  else {
    if (target.step === last && !shared) return list;
    next = shared ? target.step + 0.5 : target.step + 1;
  }
  return normalizeSteps(
    list.map((recipient) =>
      recipient.userId === userId ? { ...recipient, step: next, customized: true } : recipient
    )
  );
}

export function withMode(
  recipients: readonly ResponseRecipient[],
  userId: number,
  mode: RecipientMode
): ResponseRecipient[] {
  const lastStep = Math.max(
    -1,
    ...recipients.filter((recipient) => recipient.mode !== 'off').map((recipient) => recipient.step)
  );
  return normalizeSteps(
    recipients.map((recipient) => {
      if (recipient.userId !== userId) return recipient;
      const wakes = recipient.mode === 'off' && mode !== 'off';
      return { ...recipient, mode, step: wakes ? lastStep + 1 : recipient.step, customized: true };
    })
  );
}

export type DutyChange = { userId: number; onDuty: boolean; staffedNow: boolean };

export function withDuty(recipients: readonly ResponseRecipient[], change: DutyChange): ResponseRecipient[] {
  return recipients.map((recipient) =>
    recipient.userId === change.userId
      ? {
          ...recipient,
          onDuty: change.onDuty,
          mandatory: recipient.role === 'guard' && recipient.mode !== 'off' && (change.onDuty || change.staffedNow),
        }
      : recipient
  );
}

export function toUpdate(
  config: EnvironmentResponseConfig,
  contacts: readonly ResponseContact[] = config.contacts
): EnvironmentResponseUpdate {
  return {
    emergencyNumber: config.emergencyNumber,
    stepSeconds: config.stepSeconds,
    recipients: normalizeSteps(config.recipients).map((recipient) => ({
      userId: recipient.userId,
      mode: recipient.mode,
      step: recipient.step,
      onDuty: recipient.onDuty,
    })),
    contacts: contacts.map((contact) => ({ name: contact.name, phone: contact.phone, note: contact.note })),
  };
}

export function validPhone(phone: string): boolean {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^0-9]/g, '').length;
  return digits >= 3 && /^\+?[0-9][0-9 ()-]{1,22}$/.test(trimmed);
}

export function validEmergency(number: string): boolean {
  return number === '' || /^[0-9+*#]{2,16}$/.test(number);
}

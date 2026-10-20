import { describe, expect, test } from 'bun:test';
import { createInvitationFlight, replacedInvitation } from '@/features/people/model/invitation-flight';

type Created = { id: number };

function deferred() {
  let resolve: (value: Created | null) => void = () => undefined;
  const promise = new Promise<Created | null>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe('creating an invitation', () => {
  test('a second press while the first is in flight creates nothing', async () => {
    const discarded: number[] = [];
    const flight = createInvitationFlight<Created>((created) => discarded.push(created.id));
    const answer = deferred();
    let calls = 0;
    const create = () => {
      calls += 1;
      return answer.promise;
    };
    const first = flight.run(create);
    expect(flight.busy()).toBe(true);
    expect(await flight.run(create)).toBeNull();
    answer.resolve({ id: 7 });
    expect(await first).toEqual({ id: 7 });
    expect(calls).toBe(1);
    expect(discarded).toEqual([]);
    expect(flight.busy()).toBe(false);
  });

  test('an invitation that arrives after the dialog closed is revoked, never left active', async () => {
    const discarded: number[] = [];
    const flight = createInvitationFlight<Created>((created) => discarded.push(created.id));
    const answer = deferred();
    const pending = flight.run(() => answer.promise);
    flight.abandon();
    answer.resolve({ id: 9 });
    expect(await pending).toBeNull();
    expect(discarded).toEqual([9]);
  });

  test('closing an idle dialog does not spoil the next creation', async () => {
    const discarded: number[] = [];
    const flight = createInvitationFlight<Created>((created) => discarded.push(created.id));
    flight.abandon();
    expect(await flight.run(async () => ({ id: 3 }))).toEqual({ id: 3 });
    expect(discarded).toEqual([]);
  });

  test('a refused creation leaves the flight free', async () => {
    const flight = createInvitationFlight<Created>(() => undefined);
    await expect(flight.run(() => Promise.reject(new Error('down')))).rejects.toThrow('down');
    expect(flight.busy()).toBe(false);
  });
});

describe('the invitation QR on screen', () => {
  const never = () => false;

  test('a new QR revokes the one it replaces', () => {
    expect(replacedInvitation({ invitationId: 1 }, { invitationId: 2 }, never)).toBe(1);
  });

  test('the same QR, no QR, or a QR already used revokes nothing', () => {
    expect(replacedInvitation({ invitationId: 1 }, { invitationId: 1 }, never)).toBeNull();
    expect(replacedInvitation(null, { invitationId: 2 }, never)).toBeNull();
    expect(replacedInvitation({ invitationId: 1 }, { invitationId: 2 }, () => true)).toBeNull();
  });
});

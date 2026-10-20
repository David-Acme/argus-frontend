import { beforeEach, describe, expect, test } from 'bun:test';
import { useToastStore } from '@/core/stores/toast.store';

describe('toast store', () => {
  beforeEach(() => {
    useToastStore.setState({ items: [], parked: [] });
  });

  test('an error toast with an action is parked when it is dismissed, so it can be reopened', () => {
    const id = useToastStore.getState().show('error', 'Reintenta', 'No se guardó', { label: 'Reintentar', onPress: () => {} });
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().items).toHaveLength(0);
    expect(useToastStore.getState().parked.map((item) => item.title)).toEqual(['Reintenta']);
  });

  test('an info toast with an action (undo) is not parked: its time limit is its end', () => {
    const id = useToastStore.getState().show('info', 'Borrado', undefined, { label: 'Deshacer', onPress: () => {} });
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().parked).toHaveLength(0);
  });

  test('a warning toast with an action (the offline one) is not parked: its own dot reopens it', () => {
    const id = useToastStore.getState().show('warning', 'Sin conexión', undefined, { label: 'Reintentar', onPress: () => {} });
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().parked).toHaveLength(0);
  });

  test('an error toast without an action is not parked', () => {
    const id = useToastStore.getState().show('error', 'Algo falló');
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().parked).toHaveLength(0);
  });

  test('reopening a parked toast shows it again and removes it from the parked list', () => {
    const id = useToastStore.getState().show('error', 'Reintenta', undefined, { label: 'Reintentar', onPress: () => {} });
    useToastStore.getState().dismiss(id);
    const parkedId = useToastStore.getState().parked.map((item) => item.id)[0] ?? '';
    useToastStore.getState().reopenParked(parkedId);
    expect(useToastStore.getState().parked).toHaveLength(0);
    expect(useToastStore.getState().items.map((item) => item.title)).toEqual(['Reintenta']);
  });

  test('an error toast with an action pushed out by a newer one is parked, not lost', () => {
    const { show } = useToastStore.getState();
    show('error', 'Primero', undefined, { label: 'Reintentar', onPress: () => {} });
    show('info', 'Segundo');
    show('info', 'Tercero');
    show('info', 'Cuarto');
    expect(useToastStore.getState().items).toHaveLength(3);
    expect(useToastStore.getState().parked.map((item) => item.title)).toEqual(['Primero']);
  });

  test('Retry on a parked change runs once and the alert does not come back', () => {
    let retried = 0;
    const id = useToastStore.getState().show('error', 'No se guardó', undefined, {
      label: 'Reintentar',
      onPress: () => {
        retried += 1;
      },
    });
    useToastStore.getState().dismiss(id);
    const parkedId = useToastStore.getState().parked[0]?.id ?? '';
    useToastStore.getState().reopenParked(parkedId);
    const reopened = useToastStore.getState().items[0]?.id ?? '';
    useToastStore.getState().act(reopened);
    expect(retried).toBe(1);
    expect(useToastStore.getState().items).toHaveLength(0);
    expect(useToastStore.getState().parked).toHaveLength(0);
  });

  test('signing out forgets the parked changes', () => {
    const id = useToastStore.getState().show('error', 'No se guardó', undefined, { label: 'Reintentar', onPress: () => {} });
    useToastStore.getState().dismiss(id);
    useToastStore.getState().clearParked();
    expect(useToastStore.getState().parked).toHaveLength(0);
  });
});

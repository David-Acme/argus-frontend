import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Switch } from '@/shared/ui/switch';

describe('Switch', () => {
  test('reports its value and asks for the opposite on press', () => {
    const answers: boolean[] = [];
    render(
      <Switch
        value={false}
        label="Visitantes reconocidos"
        onValueChange={(value) => answers.push(value)}
      />
    );
    const control = screen.getByRole('switch', { name: 'Visitantes reconocidos' });
    expect(control.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(control);
    expect(answers).toEqual([true]);
  });

  test('a disabled switch does not change', () => {
    let changes = 0;
    render(<Switch value label="Llamadas" disabled onValueChange={() => (changes += 1)} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Llamadas' }));
    expect(changes).toBe(0);
  });
});

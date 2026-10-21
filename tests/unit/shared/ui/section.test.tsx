import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Avatar } from '@/shared/ui/avatar/avatar';
import { Row } from '@/shared/ui/row/row';
import { Section } from '@/shared/ui/section/section';

describe('Section and Row', () => {
  test('a grouped section names itself and lays out rows with their meta', () => {
    let opened = '';
    render(
      <Section title="Lo que pasó" action={{ label: 'Ver todo', onPress: () => (opened = 'all') }}>
        <Row
          leading={<Avatar icon="alert" tone="attn" round />}
          title="Persona desconocida"
          meta="Patio trasero · 21:53"
          chevron
          onPress={() => (opened = 'row')}
        />
        <Row title="Luis llegó" meta="Puerta principal · 14:45" />
      </Section>
    );
    expect(screen.getByRole('heading', { name: 'Lo que pasó' })).toBeDefined();
    fireEvent.click(screen.getByRole('link', { name: 'Ver todo' }));
    expect(opened).toBe('all');
    fireEvent.click(
      screen.getByRole('button', { name: 'Persona desconocida, Patio trasero · 21:53' })
    );
    expect(opened).toBe('row');
    expect(screen.getByText('Luis llegó')).toBeDefined();
    expect(screen.queryAllByRole('button')).toHaveLength(1);
  });

  test('a plain section shows its meta when it has no action', () => {
    render(
      <Section title="Lo último" meta="hace 10 min" variant="plain">
        <Row title="Sin alertas hoy" meta="5 cámaras en línea" danger />
      </Section>
    );
    expect(screen.getByText('hace 10 min')).toBeDefined();
  });
});

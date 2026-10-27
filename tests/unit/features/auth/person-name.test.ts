import { describe, expect, test } from 'bun:test';
import {
  checkName,
  knownName,
  nameIsValid,
  refusedFields,
  tidyName,
} from '@/features/auth/model/person-name';

describe('the name the first run asks for', () => {
  test('is trimmed, collapsed and composed the way the server stores it', () => {
    expect(tidyName('  Ana   María ')).toBe('Ana María');
    expect(tidyName('José')).toBe('José');
  });

  test('a name is required, the last name is not', () => {
    const empty = checkName({ name: '  ', lastName: '' });
    expect(empty.errors).toEqual({ name: 'screens.name.errors.required' });
    expect(nameIsValid(empty)).toBe(false);
    const named = checkName({ name: 'David', lastName: '' });
    expect(named).toEqual({ value: { name: 'David', lastName: '' }, errors: {} });
    expect(nameIsValid(named)).toBe(true);
  });

  test('only letters, marks, apostrophes, hyphens and periods pass', () => {
    expect(checkName({ name: "O'Neil-Ruiz Jr.", lastName: 'D’Alessio' }).errors).toEqual({});
    expect(checkName({ name: 'Ana2', lastName: '' }).errors.name).toBe(
      'screens.name.errors.letters'
    );
    expect(checkName({ name: 'Ana', lastName: '🙂' }).errors.lastName).toBe(
      'screens.name.errors.letters'
    );
  });

  test('length is counted in characters', () => {
    expect(checkName({ name: 'á'.repeat(60), lastName: '' }).errors).toEqual({});
    expect(checkName({ name: 'a'.repeat(61), lastName: '' }).errors.name).toBe(
      'screens.name.errors.long'
    );
    expect(checkName({ name: 'Ana', lastName: 'b'.repeat(81) }).errors.lastName).toBe(
      'screens.name.errors.long'
    );
  });

  test('a refusal that names a field shows under that field, never in the server words', () => {
    expect(
      refusedFields({
        code: 'VALIDATION_ERROR',
        message: 'x',
        fields: { name: ['name must be 1 to 60 characters'] },
      })
    ).toEqual({
      name: 'screens.name.errors.letters',
    });
    expect(refusedFields({ code: 'NETWORK_ERROR', message: 'x' })).toEqual({});
    expect(refusedFields(null)).toEqual({});
  });

  test('the server placeholders are not a name it knows', () => {
    expect(knownName('Administrador')).toBe('');
    expect(knownName('Usuario')).toBe('');
    expect(knownName(' Luis ')).toBe('Luis');
    expect(knownName(undefined)).toBe('');
  });
});

import { describe, expect, test } from 'bun:test';
import { BehaviorSubject } from 'rxjs';
import { ModuleSourceGate } from '@/core/services/view-cache/module-source-gate';
import { activeModulesOf, gainedModules } from '@/core/services/context/context-state';
import { accessFor } from './support/access-fixtures';

describe('module source gate', () => {
  test('is open for everything until the context says which modules are on', () => {
    const gate = new ModuleSourceGate();
    const source = new BehaviorSubject(['camera']);
    const seen: string[][] = [];
    gate.of('surveillance', source, []).subscribe((rows) => seen.push(rows));
    expect(seen).toEqual([['camera']]);
  });

  test('a module turned off empties its source and turning it on brings the kept rows back', () => {
    const gate = new ModuleSourceGate();
    const source = new BehaviorSubject(['camera']);
    const seen: string[][] = [];
    gate.of('surveillance', source, []).subscribe((rows) => seen.push(rows));
    gate.set(new Set(['core']));
    source.next(['camera', 'second']);
    gate.set(new Set(['core', 'surveillance']));
    expect(seen).toEqual([['camera'], [], ['camera', 'second']]);
  });

  test('the same set again changes nothing, and other modules stay untouched', () => {
    const gate = new ModuleSourceGate();
    const surveillance: string[][] = [];
    const productivity: string[][] = [];
    gate.of('surveillance', new BehaviorSubject(['camera']), []).subscribe((rows) => surveillance.push(rows));
    gate.of('productivity', new BehaviorSubject(['event']), []).subscribe((rows) => productivity.push(rows));
    gate.set(new Set(['core', 'productivity']));
    gate.set(new Set(['productivity', 'core']));
    expect(surveillance).toEqual([['camera'], []]);
    expect(productivity).toEqual([['event']]);
  });

  test('a core source is never gated away by a restricted set', () => {
    const gate = new ModuleSourceGate();
    const seen: number[] = [];
    gate.of('core', new BehaviorSubject(3), 0).subscribe((value) => seen.push(value));
    gate.set(new Set(['core']));
    expect(seen).toEqual([3]);
  });
});

describe('active modules of the context', () => {
  test('are unknown without a context, and the enabled ones plus the core with one', () => {
    expect(activeModulesOf(null)).toBeNull();
    expect([...(activeModulesOf(accessFor('owner', { modules: ['productivity'] })) ?? [])].sort()).toEqual([
      'core',
      'productivity',
    ]);
  });

  test('says which modules a new context switched on', () => {
    const before = activeModulesOf(accessFor('owner', { modules: ['productivity'] }));
    const after = activeModulesOf(accessFor('owner'));
    expect(gainedModules(before, after)).toEqual(['surveillance']);
    expect(gainedModules(after, before)).toEqual([]);
    expect(gainedModules(null, after).sort()).toEqual(['core', 'productivity', 'surveillance']);
    expect(gainedModules(before, null)).toEqual([]);
  });
});

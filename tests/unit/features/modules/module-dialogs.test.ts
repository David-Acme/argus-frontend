import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localeDictionaries } from '@/core/locales/all';
import { translate } from '@/core/i18n/translate';
import type { ModuleDataOwner, ModuleRecord, TranslateFn } from '@/core/types';
import { dataSummary, purgeReady, uninstallMode } from '@/features/modules/model/module-lifecycle';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const modulesSource = (relative: string) =>
  readFileSync(join(import.meta.dir, '../../../../src/features/modules', relative), 'utf8');

const productivity: ModuleRecord = {
  id: 'productivity',
  name: 'Productivity',
  summary: '',
  texts: null,
  intro: null,
  roles: [],
  kind: 'available',
  lifecycle: 'active',
  enabled: true,
  hasData: true,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 1000,
  installedBytes: 1000,
  hardware: null,
  job: null,
  gettingStarted: [],
  components: [],
  detailed: true,
};

const owners: ModuleDataOwner[] = [
  {
    owner: 'productivity',
    reachable: true,
    reported: true,
    items: [
      { kind: 'project', count: 3 },
      { kind: 'project_task', count: 12 },
    ],
    bytes: 2048,
  },
];

describe('the uninstall dialog the e2e drives', () => {
  test('with data it opens on the choice, keeping the data, and shows what the module holds', () => {
    expect(uninstallMode(productivity, owners)).toBe('choose');
    expect(dataSummary(owners, 'en', en)).toEqual(['15 items', 'about 2 KB in the database']);
    expect(dataSummary(owners, 'es', es)).toEqual([
      '15 elementos',
      'aprox. 2 KB en la base de datos',
    ]);
    expect(en('screens.modules.uninstall.data-title', { name: 'Productivity' })).toBe(
      'Uninstall Productivity'
    );
    expect(en('screens.modules.uninstall.data-description')).toBe(
      'Its files are deleted from the server. What should happen to what it keeps?'
    );
    expect(en('screens.modules.uninstall.keep')).toBe('Keep my data');
    expect(es('screens.modules.uninstall.keep')).toBe('Conservar mis datos');
    expect(en('screens.modules.uninstall.purge')).toBe('Delete my data too');
    expect(es('screens.modules.uninstall.purge')).toBe('Borrar también mis datos');

    const dialog = modulesSource('components/uninstall-dialog.tsx');
    expect(dialog).toContain('const [purge, setPurge] = useState(erase);');
    expect(dialog).toContain('const purging = erase || (!simple && purge);');
    expect(dialog).toMatch(
      /selected=\{!purge\}\s*title=\{t\('screens\.modules\.uninstall\.keep'\)\}/
    );
    expect(dialog).toMatch(
      /selected=\{purge\}\s*danger\s*title=\{t\('screens\.modules\.uninstall\.purge'\)\}/
    );
    expect(dialog).toContain("t('screens.modules.uninstall.data-title', { name })");
    expect(dialog).toContain("t('screens.modules.uninstall.data-description')");
    expect(dialog).toMatch(
      /\{impact \? \(\s*<ImpactSummary\s*impact=\{impact\}\s*moduleName=\{name\}\s*uninstall\s*purging=\{purging\}\s*choices=\{choices\}\s*onChoose=/
    );
    expect(dialog).toContain(
      "{target?.owners ? t('screens.modules.uninstall.holds') : t('screens.modules.uninstall.data-unknown')}"
    );
  });

  test('the warning and the typed name appear only once deleting is chosen, exactly where the e2e reads them', () => {
    expect(en('screens.modules.uninstall.purge-warning')).toBe(
      'This cannot be undone. Nobody can recover this data, not even from the server.'
    );
    expect(es('screens.modules.uninstall.purge-warning')).toContain('Esto no se puede deshacer');
    expect(en('screens.modules.uninstall.type-name', { name: 'Productivity' })).toBe(
      'Type “Productivity” to confirm'
    );

    const dialog = modulesSource('components/uninstall-dialog.tsx');
    expect(dialog).toMatch(/\{purging \? \(\s*<View className="gap-2">[\s\S]{0,400}purge-warning/);
    expect(dialog).toContain(
      "accessibilityLabel={t('screens.modules.uninstall.type-name', { name })}"
    );
    expect(dialog).toContain('placeholder={name}');

    expect(purgeReady({ typed: 'Productivit', name: 'Productivity' })).toBe(false);
    expect(purgeReady({ typed: '  productivity ', name: 'Productivity' })).toBe(true);
    expect(dialog).toContain('const ready = (!purging || purgeReady({ typed, name }))');
    expect(dialog).toContain('disabled={!ready}');
    expect(dialog).toMatch(
      /const finish = \(submit: boolean\) => \{\s*if \(submit && !ready\) return;/
    );
  });

  test('the confirm keeps or deletes what the e2e reads on the wire, and cancelling never submits', () => {
    expect(en('screens.modules.uninstall.confirm')).toBe('Uninstall');
    expect(en('screens.modules.uninstall.confirm-purge')).toBe('Delete for good');
    expect(es('screens.modules.uninstall.confirm-purge')).toBe('Borrar para siempre');

    const dialog = modulesSource('components/uninstall-dialog.tsx');
    expect(dialog).toMatch(
      /\{purging \? t\('screens\.modules\.uninstall\.confirm-purge'\) : t\('screens\.modules\.uninstall\.confirm'\)\}/
    );
    expect(dialog).toMatch(/if \(submit\) onSubmit\(!purging, choices\);/);
    expect(dialog).toMatch(/else onClose\(\);/);
    expect(dialog).toMatch(/<Button variant="ghost" onPress=\{\(\) => finish\(false\)\}>/);
    expect(dialog).toMatch(/onOpenChange=\{\(next\) => \{\s*if \(!next\) finish\(false\);/);
    expect(dialog).toContain('onSubmit={() => finish(true)}');

    const hook = modulesSource('hooks/use-module-uninstall.ts');
    expect(hook).toContain('async (keepData: boolean, choices: ReassignChoices) => {');
    expect(hook).toContain(
      'await send(module, keepData, impact ? reassignBody(impact, choices) : undefined);'
    );
    expect(hook).toMatch(
      /const result = await moduleEngine\.act\(module\.id, 'uninstall', \{\s*keepData,/
    );
  });

  test('a module that already kept its data opens on the erase alone', () => {
    const kept = { ...productivity, lifecycle: 'uninstalled_data_kept' as const };
    expect(uninstallMode(kept, null)).toBe('erase');
    expect(en('screens.modules.uninstall.erase-title', { name: 'Productivity' })).toBe(
      'Delete the data of Productivity?'
    );
    expect(en('screens.modules.uninstall.erase-description')).toBe(
      'The module is already uninstalled; now what it kept is deleted.'
    );

    const dialog = modulesSource('components/uninstall-dialog.tsx');
    expect(dialog).toContain("const erase = target?.mode === 'erase';");
    expect(dialog).toContain("? t('screens.modules.uninstall.erase-title', { name })");
    expect(dialog).toContain("? t('screens.modules.uninstall.erase-description')");
    expect(dialog).toMatch(/\{erase \|\| simple \? null : \(/);
    expect(dialog).toContain("t('screens.modules.uninstall.pin-needed')");
  });
});

describe('the turn-off dialog the e2e confirms', () => {
  test('it asks with the module name and confirms with the one word the e2e clicks', () => {
    expect(en('screens.modules.impact.disable-title', { name: 'Productivity' })).toBe(
      'Turn off Productivity?'
    );
    expect(es('screens.modules.impact.disable-title', { name: 'Productividad' })).toBe(
      '¿Desactivar Productividad?'
    );
    expect(en('screens.modules.impact.disable-description')).toBe(
      'This is what changes. Your data is kept and turning it back on is instant, with no downloads.'
    );
    expect(en('screens.modules.impact.confirm-disable')).toBe('Turn off');
    expect(es('screens.modules.impact.confirm-disable')).toBe('Desactivar');
    expect(en('screens.modules.confirm-disable-title', { name: 'Productivity' })).toBe(
      'Turn off Productivity?'
    );
    expect(en('screens.modules.actions.disable')).toBe(
      en('screens.modules.impact.confirm-disable')
    );
    expect(en('common.cancel')).toBe('Cancel');

    const dialog = modulesSource('components/disable-dialog.tsx');
    expect(dialog).toContain("t('screens.modules.impact.disable-title', { name })");
    expect(dialog).toContain("description={t('screens.modules.impact.disable-description')}");
    expect(dialog).toContain("closeLabel={t('common.cancel')}");
    expect(dialog).toContain('onSubmit={onConfirm}');
    expect(dialog).toMatch(/<Button variant="ghost" disabled=\{busy\} onPress=\{onClose\}>/);
    expect(dialog).toMatch(/<Button loading=\{busy\} onPress=\{onConfirm\}>/);
    expect(dialog).toContain("{t('screens.modules.impact.confirm-disable')}");
    expect(dialog).toContain(
      '<ImpactSummary impact={target.impact} moduleName={name} uninstall={false} choices={{}} onChoose={() => undefined} />'
    );
  });
});

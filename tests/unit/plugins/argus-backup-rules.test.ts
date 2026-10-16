import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExpoConfig } from 'expo/config';
import withArgusBackupRules, {
  BACKED_UP_FILE_PATHS,
  BACKUP_RULES_RESOURCE,
  DATA_EXTRACTION_RULES_RESOURCE,
  INSTANCE_STORE_ID,
  KEYSTORE_KEYED_SHARED_PREFS,
  backupRulesXml,
  dataExtractionRulesXml,
} from '../../../plugins/with-argus-backup-rules';

const ROOT = join(import.meta.dir, '../../..');

const pushKeysSource = readFileSync(
  join(ROOT, 'modules/argus-push/android/src/main/java/com/davidacme/argus/push/PushKeys.kt'),
  'utf8',
);

const instanceStoreSource = readFileSync(
  join(ROOT, 'src/core/services/instance-storage/instance-storage.native.ts'),
  'utf8',
);

const SHARED_STORE_ID = 'argus-storage';

type Application = { $: Record<string, string> };

type ManifestMod = (config: {
  modRequest: { nextMod: (config: unknown) => unknown };
  modResults: { manifest: { application: Application[] } };
}) => Promise<{ modResults: { manifest: { application: Application[] } } }>;

type RegisteredMods = { mods?: { android?: { manifest?: ManifestMod } } };

function manifestMod(): ManifestMod {
  const configured = withArgusBackupRules({
    name: 'argus',
    slug: 'argus',
  } as unknown as ExpoConfig) as unknown as RegisteredMods;
  const mod = configured.mods?.android?.manifest;
  if (typeof mod !== 'function') throw new Error('the backup-rules plugin registers no android manifest mod');
  return mod;
}

async function runManifestMod(application: Application): Promise<Application> {
  const result = await manifestMod()({
    modRequest: { nextMod: (config) => config },
    modResults: { manifest: { application: [application] } },
  });
  const patched = result.modResults.manifest.application[0];
  if (!patched) throw new Error('the manifest mod dropped the application entry');
  return patched;
}

describe('the keystore-keyed stores stay out of Android Auto Backup', () => {
  test('the rules exclude the expo-secure-store preferences and the push keyset preferences', () => {
    for (const store of KEYSTORE_KEYED_SHARED_PREFS) {
      expect(backupRulesXml()).toContain(`<exclude domain="sharedpref" path="${store}"/>`);
      expect(dataExtractionRulesXml()).toContain(`<exclude domain="sharedpref" path="${store}"/>`);
    }
    expect(KEYSTORE_KEYED_SHARED_PREFS).toContain('SecureStore');
    expect(KEYSTORE_KEYED_SHARED_PREFS).toContain('argus_push_keyset_prefs');
  });

  test('the push keyset preferences name is the one the push module writes', () => {
    expect(pushKeysSource).toContain('KEYSET_PREFS = "argus_push_keyset_prefs"');
  });

  test('the secure store preferences name is the one the library writes', () => {
    const module = readFileSync(
      join(ROOT, 'node_modules/expo-secure-store/android/src/main/java/expo/modules/securestore/SecureStoreModule.kt'),
      'utf8',
    );
    expect(module).toContain('SHARED_PREFERENCES_NAME = "SecureStore"');
  });

  test('every other preference is still backed up', () => {
    const rules = backupRulesXml();
    expect(rules).toContain('<include domain="sharedpref" path="."/>');
    const extraction = dataExtractionRulesXml();
    expect(extraction).toContain('<cloud-backup>');
    expect(extraction).toContain('<device-transfer>');
    expect(extraction.match(/<include domain="sharedpref" path="."\/>/g)).toHaveLength(2);
  });

  test('only the dedicated instance store is backed up out of the file domain', () => {
    const rules = backupRulesXml();
    expect([...BACKED_UP_FILE_PATHS].sort()).toEqual([
      `mmkv/${INSTANCE_STORE_ID}`,
      `mmkv/${INSTANCE_STORE_ID}.crc`,
    ]);
    for (const path of BACKED_UP_FILE_PATHS) {
      expect(rules).toContain(`<include domain="file" path="${path}"/>`);
      expect(dataExtractionRulesXml().match(new RegExp(`path="${path}"`, 'g'))).toHaveLength(2);
    }
  });

  test('no other mmkv file, no whole mmkv directory and no shared store is backed up', () => {
    const rules = backupRulesXml();
    expect(rules).not.toContain('<include domain="file" path="mmkv"/>');
    expect(rules).not.toContain('<include domain="file" path="."/>');
    expect(rules).not.toContain('argus-storage');
    const fileIncludes = rules.match(/<include domain="file" path="([^"]+)"\/>/g) ?? [];
    expect(fileIncludes).toHaveLength(BACKED_UP_FILE_PATHS.length);
    for (const include of fileIncludes) {
      const path = include.replace(/.*path="([^"]+)".*/, '$1');
      expect(path.startsWith(`mmkv/${INSTANCE_STORE_ID}`)).toBe(true);
    }
  });

  test('the instance store id is the one the Android store creates', () => {
    const declared = /INSTANCE_STORE_ID = '([^']+)'/.exec(instanceStoreSource);
    expect(declared?.[1]).toBe(INSTANCE_STORE_ID);
    expect(instanceStoreSource).toContain('createMMKV({ id: INSTANCE_STORE_ID })');
    expect(instanceStoreSource).not.toContain(`id: '${SHARED_STORE_ID}'`);
  });

  test('both documents are well-formed and carry a single root', () => {
    const rules = backupRulesXml();
    expect(rules.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    expect(rules).toContain('<full-backup-content>');
    expect(rules).toContain('</full-backup-content>');
    const extraction = dataExtractionRulesXml();
    expect(extraction.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    expect(extraction).toContain('<data-extraction-rules>');
    expect(extraction).toContain('</data-extraction-rules>');
  });

  test('the manifest points at the plugin rules through a mod', async () => {
    const application = await runManifestMod({ $: { 'android:name': '.MainApplication' } });
    expect(application.$['android:fullBackupContent']).toBe(BACKUP_RULES_RESOURCE);
    expect(application.$['android:dataExtractionRules']).toBe(DATA_EXTRACTION_RULES_RESOURCE);
  });

  test('the manifest mod overwrites rules another plugin left behind', async () => {
    const application = await runManifestMod({
      $: {
        'android:name': '.MainApplication',
        'android:fullBackupContent': '@xml/secure_store_backup_rules',
        'android:dataExtractionRules': '@xml/secure_store_data_extraction_rules',
      },
    });
    expect(application.$['android:fullBackupContent']).toBe(BACKUP_RULES_RESOURCE);
    expect(application.$['android:dataExtractionRules']).toBe(DATA_EXTRACTION_RULES_RESOURCE);
  });
});

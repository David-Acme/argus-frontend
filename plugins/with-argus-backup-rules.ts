import {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
  type ConfigPlugin,
} from 'expo/config-plugins';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PLUGIN_NAME = 'argus-backup-rules';
const PLUGIN_VERSION = '1';

const BACKUP_RULES_NAME = 'argus_backup_rules';
const DATA_EXTRACTION_RULES_NAME = 'argus_data_extraction_rules';

export const BACKUP_RULES_RESOURCE = `@xml/${BACKUP_RULES_NAME}`;
export const DATA_EXTRACTION_RULES_RESOURCE = `@xml/${DATA_EXTRACTION_RULES_NAME}`;

export const BACKUP_RULES_FILE = `${BACKUP_RULES_NAME}.xml`;
export const DATA_EXTRACTION_RULES_FILE = `${DATA_EXTRACTION_RULES_NAME}.xml`;

export const KEYSTORE_KEYED_SHARED_PREFS: readonly string[] = ['SecureStore', 'argus_push_keyset_prefs'];

export const INSTANCE_STORE_ID = 'argus-instance';
export const BACKED_UP_FILE_PATHS: readonly string[] = [
  `mmkv/${INSTANCE_STORE_ID}`,
  `mmkv/${INSTANCE_STORE_ID}.crc`,
];

const XML_DECLARATION = '<?xml version="1.0" encoding="utf-8"?>';

const RULE_BODY: readonly string[] = [
  '<include domain="sharedpref" path="."/>',
  ...BACKED_UP_FILE_PATHS.map((path) => `<include domain="file" path="${path}"/>`),
  ...KEYSTORE_KEYED_SHARED_PREFS.map((path) => `<exclude domain="sharedpref" path="${path}"/>`),
];

function indented(lines: readonly string[], indent: string): string[] {
  return lines.map((line) => `${indent}${line}`);
}

function section(name: string, indent: string): string[] {
  return [`${indent}<${name}>`, ...indented(RULE_BODY, `${indent}  `), `${indent}</${name}>`];
}

export function backupRulesXml(): string {
  return [
    XML_DECLARATION,
    '<full-backup-content>',
    ...indented(RULE_BODY, '  '),
    '</full-backup-content>',
    '',
  ].join('\n');
}

export function dataExtractionRulesXml(): string {
  return [
    XML_DECLARATION,
    '<data-extraction-rules>',
    ...section('cloud-backup', '  '),
    ...section('device-transfer', '  '),
    '</data-extraction-rules>',
    '',
  ].join('\n');
}

const withArgusBackupRules: ConfigPlugin = (config) => {
  const withManifest = withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:fullBackupContent'] = BACKUP_RULES_RESOURCE;
    application.$['android:dataExtractionRules'] = DATA_EXTRACTION_RULES_RESOURCE;
    return config;
  });

  return withDangerousMod(withManifest, [
    'android',
    (config) => {
      const xmlDir = join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      mkdirSync(xmlDir, { recursive: true });
      writeFileSync(join(xmlDir, BACKUP_RULES_FILE), backupRulesXml());
      writeFileSync(join(xmlDir, DATA_EXTRACTION_RULES_FILE), dataExtractionRulesXml());
      return config;
    },
  ]);
};

export default createRunOncePlugin(withArgusBackupRules, PLUGIN_NAME, PLUGIN_VERSION);

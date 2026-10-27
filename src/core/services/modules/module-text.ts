import { localeDictionaries } from '@/core/i18n/locales';
import type { LanguageCode, LocalizedText, ModuleCatalog, ModuleJob, ModuleRecord } from '@/core/types';

type KnownModuleText = { name: string; summary: string };

const pick = (text: LocalizedText, language: LanguageCode, fallback: string): string =>
  text[language] ?? text.es ?? text.en ?? fallback;

export function knownModuleText(id: string, language: LanguageCode): KnownModuleText | null {
  const catalog: Readonly<Record<string, KnownModuleText | undefined>> = localeDictionaries[language].screens.modules.catalog;
  return catalog[id] ?? null;
}

export function localizedModule(module: ModuleRecord, language: LanguageCode): ModuleRecord {
  const known = module.texts ? null : knownModuleText(module.id, language);
  const name = module.texts ? pick(module.texts.name, language, module.name) : (known?.name ?? module.name);
  const summary = module.texts ? pick(module.texts.summary, language, module.summary) : (known?.summary ?? module.summary);
  return name === module.name && summary === module.summary ? module : { ...module, name, summary };
}

export function localizedCatalog(catalog: ModuleCatalog | null, language: LanguageCode): ModuleCatalog | null {
  if (!catalog) return catalog;
  const modules = catalog.modules.map((module) => localizedModule(module, language));
  return modules.every((module, index) => module === catalog.modules[index]) ? catalog : { ...catalog, modules };
}

export function roleMovesNoteOf(
  job: Pick<ModuleJob, 'state' | 'roleMovesNote'> | null | undefined,
  language: LanguageCode
): string | null {
  if (!job || !job.roleMovesNote || (job.state !== 'failed' && job.state !== 'cancelled')) return null;
  return job.roleMovesNote[language] || job.roleMovesNote.es || job.roleMovesNote.en || null;
}

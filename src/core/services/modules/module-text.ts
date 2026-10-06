import type { LanguageCode, LocalizedText, ModuleCatalog, ModuleIntro, ModuleRecord } from '@/core/types';

const pick = (text: LocalizedText, language: LanguageCode, fallback: string): string =>
  text[language] ?? text.es ?? text.en ?? fallback;

export function localizedModule(module: ModuleRecord, language: LanguageCode): ModuleRecord {
  if (!module.texts) return module;
  const name = pick(module.texts.name, language, module.name);
  const summary = pick(module.texts.summary, language, module.summary);
  return name === module.name && summary === module.summary ? module : { ...module, name, summary };
}

export function localizedCatalog(catalog: ModuleCatalog | null, language: LanguageCode): ModuleCatalog | null {
  if (!catalog) return catalog;
  const modules = catalog.modules.map((module) => localizedModule(module, language));
  return modules.every((module, index) => module === catalog.modules[index]) ? catalog : { ...catalog, modules };
}

export function introFor(module: Pick<ModuleRecord, 'intro'>, language: LanguageCode): ModuleIntro | null {
  const intro = module.intro;
  if (!intro) return null;
  return intro[language] ?? intro.any ?? intro.es ?? intro.en ?? null;
}

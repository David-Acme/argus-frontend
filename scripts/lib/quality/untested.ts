import { importsOf, readSource, resolveImports } from '../source-files';

export function isComponentOrScreen(path: string): boolean {
  return /^src\/(features|shared)\/.+\.tsx$/.test(path);
}

export function untestedComponents(sources: readonly string[], tests: readonly string[]): string[] {
  const imported = new Set<string>();
  for (const test of tests) {
    const { text } = readSource(test);
    for (const specifier of importsOf(text)) {
      for (const target of resolveImports(test, specifier)) imported.add(target);
    }
  }
  return sources.filter((path) => isComponentOrScreen(path) && !imported.has(path));
}

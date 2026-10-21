import { edgesOf } from '../boundaries/graph';

export function isComponentOrScreen(path: string): boolean {
  return /^src\/(features|shared)\/.+\.tsx$/.test(path);
}

export function untestedComponents(sources: readonly string[], tests: readonly string[]): string[] {
  const imported = new Set(
    tests
      .flatMap(edgesOf)
      .filter((edge) => !edge.typeOnly)
      .map((edge) => edge.to)
  );
  return sources.filter((path) => isComponentOrScreen(path) && !imported.has(path));
}

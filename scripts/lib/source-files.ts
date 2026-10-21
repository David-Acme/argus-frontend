import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import ts from 'typescript';

export const ROOT = process.cwd();

export const PLATFORM_SUFFIX = '(\\.(native|web|ios|android))?';
const PLATFORMS = ['', '.native', '.web', '.ios', '.android'];
const VARIANTS = PLATFORMS.flatMap((platform) => [`${platform}.ts`, `${platform}.tsx`]);

export type SourceFile = { path: string; text: string; source: ts.SourceFile };

export function listFiles(...prefixes: string[]): string[] {
  const listed = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', ...prefixes],
    {
      cwd: ROOT,
      encoding: 'utf8',
    }
  );
  return listed
    .split('\n')
    .filter(
      (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.d.ts') && existsSync(join(ROOT, file))
    )
    .sort();
}

export function readSource(path: string): SourceFile {
  const text = readFileSync(join(ROOT, path), 'utf8');
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return {
    path,
    text,
    source: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind),
  };
}

const existing = (base: string): string[] =>
  VARIANTS.map((variant) => base + variant).filter((candidate) =>
    existsSync(join(ROOT, candidate))
  );

export function resolveImports(from: string, specifier: string): string[] {
  let base: string;
  if (specifier.startsWith('@/')) base = join('src', specifier.slice(2));
  else if (specifier.startsWith('@tests/')) base = join('tests', specifier.slice(7));
  else if (specifier.startsWith('.')) base = normalize(join(dirname(from), specifier));
  else return [];
  if (/\.(ts|tsx)$/.test(base) && existsSync(join(ROOT, base))) return [base];
  const files = existing(base);
  return files.length > 0 ? files : existing(join(base, 'index'));
}

export function importsOf(text: string): string[] {
  return ts.preProcessFile(text, true, true).importedFiles.map((entry) => entry.fileName);
}

export function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
}

export function countNodes(file: SourceFile, matches: (node: ts.Node) => boolean): number {
  let count = 0;
  walk(file.source, (node) => {
    if (matches(node)) count += 1;
  });
  return count;
}

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import ts from 'typescript';

export const ROOT = process.cwd();

const EXTENSIONS = [
  '',
  '.ts',
  '.tsx',
  '.native.ts',
  '.native.tsx',
  '.web.ts',
  '.web.tsx',
  '/index.ts',
  '/index.tsx',
];

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

export function resolveImport(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('@/')) base = join('src', specifier.slice(2));
  else if (specifier.startsWith('@tests/')) base = join('tests', specifier.slice(7));
  else if (specifier.startsWith('.')) base = normalize(join(dirname(from), specifier));
  else return null;
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (/\.(ts|tsx)$/.test(candidate) && existsSync(join(ROOT, candidate))) return candidate;
  }
  return null;
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

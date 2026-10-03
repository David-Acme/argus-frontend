import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import ts from 'typescript';

const ROOT = join(import.meta.dir, '..');
const EXTENSIONS = ['', '.ts', '.tsx', '.native.ts', '.native.tsx', '.web.ts', '.web.tsx', '/index.ts', '/index.tsx'];
const DESIGN_SYSTEM = new Set(['shared/components/ui', 'shared/components/layout']);

function usage(): never {
  console.log(`usage: bun scripts/check-boundaries.ts

Checks the import boundaries of src/:
  app     imports features only through features/<name>/index and never core/database or core/services
  feature imports another feature only through its index
  core    never imports features or shared/components
  shared  never imports features
  shared  modules outside ui/ and layout/ need two or more consumers`);
  process.exit(0);
}

function sourceFiles(): string[] {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src'], { cwd: ROOT, encoding: 'utf8' });
  return listed.split('\n').filter((file) => /\.(ts|tsx)$/.test(file) && existsSync(join(ROOT, file)));
}

function resolveImport(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('@/')) base = join('src', specifier.slice(2));
  else if (specifier.startsWith('.')) base = normalize(join(dirname(from), specifier));
  else return null;
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(join(ROOT, candidate)) && /\.(ts|tsx)$/.test(candidate)) return candidate;
  }
  return null;
}

function moduleOf(file: string): string {
  const parts = relative('src', file).split('/');
  if (parts[0] === 'app') return 'app';
  if (parts[0] === 'core') return 'core';
  if (parts[0] === 'features') return `features/${parts[1]}`;
  if (parts[0] === 'shared' && parts[1] === 'components') return `shared/components/${parts[2]}`;
  if (parts[0] === 'shared') return `shared/${parts[1]}/${parts[2].replace(/(\.native|\.web)?\.tsx?$/, '')}`;
  return parts[0];
}

function isFeatureIndex(file: string): boolean {
  return /^src\/features\/[^/]+\/index\.tsx?$/.test(file);
}

function importsOf(file: string): string[] {
  const info = ts.preProcessFile(readFileSync(join(ROOT, file), 'utf8'), true, true);
  return info.importedFiles.map((entry) => entry.fileName);
}

if (process.argv.includes('--help')) usage();

const files = sourceFiles();
const violations = new Set<string>();
const consumers = new Map<string, Set<string>>();

for (const file of files) {
  const from = moduleOf(file);
  for (const specifier of importsOf(file)) {
    const target = resolveImport(file, specifier);
    if (!target) continue;
    const to = moduleOf(target);
    if (to !== from) {
      const set = consumers.get(to) ?? new Set<string>();
      set.add(from);
      consumers.set(to, set);
    }
    const edge = `${file} -> ${target}`;
    if (from === 'app') {
      if (to.startsWith('features/') && !isFeatureIndex(target)) violations.add(`app-feature-internal | ${edge}`);
      if (target.startsWith('src/core/database') || target.startsWith('src/core/services/')) violations.add(`app-core-data | ${edge}`);
    }
    if (from.startsWith('features/') && to.startsWith('features/') && to !== from && !isFeatureIndex(target)) {
      violations.add(`feature-internal | ${edge}`);
    }
    if (from === 'core' && (to.startsWith('features/') || to.startsWith('shared/components/'))) violations.add(`core-upward | ${edge}`);
    if (from.startsWith('shared/') && to.startsWith('features/')) violations.add(`shared-upward | ${edge}`);
  }
}

for (const file of files) {
  const module = moduleOf(file);
  if (!module.startsWith('shared/') || module.startsWith('shared/constants/') || DESIGN_SYSTEM.has(module)) continue;
  const count = consumers.get(module)?.size ?? 0;
  if (count < 2) violations.add(`shared-single-consumer | ${module} (${count})`);
}

const current = [...violations].sort();
for (const violation of current) console.log(`violation: ${violation}`);
console.log(`check-boundaries: ${files.length} files, ${current.length} violations`);
process.exit(current.length > 0 ? 1 : 0);

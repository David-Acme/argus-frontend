import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { readSource, ROOT } from '../source-files';
import type { Edge } from './graph';

const DESIGN_SYSTEM = new Set(['shared/components/ui', 'shared/components/layout']);
const DESIGN_SYSTEM_ROOTS = ['shared/ui/', 'shared/theme/'];
const SLICE_ROOT = /^src\/(features|widgets|entities|platform|core\/services)\/[^/]+(?=\/)/;
const NOT_ROUTES = /(^|\/)(_layout|\+html|\+native-intent)(\.native|\.web)?\.tsx?$/;

export function moduleOf(file: string): string {
  const parts = relative('src', file).split('/');
  const [first, second = '', third = ''] = parts;
  if (first === 'features' || first === 'widgets' || first === 'entities' || first === 'platform')
    return `${first}/${second}`;
  if (first === 'shared' && second === 'components') return `shared/components/${third}`;
  if (first === 'shared')
    return `shared/${second}/${third.replace(/(\.native|\.web)?\.tsx?$/, '')}`;
  return first ?? '';
}

export function sliceOf(file: string): string {
  const parts = relative('src', file).split('/');
  const [first, second = '', third = ''] = parts;
  if (first === 'core' && second === 'services')
    return `core/services/${third.replace(/(\.native|\.web)?\.tsx?$/, '')}`;
  if (first === 'core') return `core/${second.replace(/(\.native|\.web)?\.tsx?$/, '')}`;
  return moduleOf(file);
}

function hasIndex(directory: string): boolean {
  return (
    existsSync(join(ROOT, directory, 'index.ts')) || existsSync(join(ROOT, directory, 'index.tsx'))
  );
}

function isIndexOf(directory: string, file: string): boolean {
  return /^index(\.native|\.web)?\.tsx?$/.test(file.slice(directory.length + 1));
}

export function isDeepImport(edge: Edge): boolean {
  const root = SLICE_ROOT.exec(edge.to)?.[0];
  if (!root || edge.from.startsWith(`${root}/`) || !hasIndex(root)) return false;
  return !isIndexOf(root, edge.to);
}

function isFeatureIndex(file: string): boolean {
  return /^src\/features\/[^/]+\/index\.tsx?$/.test(file);
}

type LayerRule = { name: string; breaks: (edge: Edge, from: string, to: string) => boolean };

const LAYER_RULES: readonly LayerRule[] = [
  {
    name: 'app-feature-internal',
    breaks: (edge, from, to) =>
      from === 'app' && to.startsWith('features/') && !isFeatureIndex(edge.to),
  },
  {
    name: 'app-core-data',
    breaks: (edge, from) =>
      from === 'app' &&
      (edge.to.startsWith('src/core/database') || edge.to.startsWith('src/core/services/')),
  },
  {
    name: 'feature-internal',
    breaks: (edge, from, to) =>
      from.startsWith('features/') &&
      to.startsWith('features/') &&
      to !== from &&
      !isFeatureIndex(edge.to),
  },
  {
    name: 'core-upward',
    breaks: (_edge, from, to) =>
      from === 'core' && (to.startsWith('features/') || to.startsWith('shared/components/')),
  },
  {
    name: 'shared-upward',
    breaks: (_edge, from, to) => from.startsWith('shared/') && to.startsWith('features/'),
  },
];

export function layerViolations(edge: Edge): string[] {
  const from = moduleOf(edge.from);
  const to = moduleOf(edge.to);
  return LAYER_RULES.filter((rule) => rule.breaks(edge, from, to)).map(
    (rule) => `${rule.name} | ${edge.from} -> ${edge.to}`
  );
}

export function singleConsumerViolations(
  files: readonly string[],
  edges: readonly Edge[]
): string[] {
  const consumers = new Map<string, Set<string>>();
  for (const edge of edges) {
    const from = moduleOf(edge.from);
    const to = moduleOf(edge.to);
    if (from !== to) consumers.set(to, (consumers.get(to) ?? new Set<string>()).add(from));
  }
  const modules = new Set(files.map(moduleOf));
  return [...modules]
    .filter((module) => module.startsWith('shared/') && !module.startsWith('shared/constants/'))
    .filter(
      (module) =>
        !DESIGN_SYSTEM.has(module) && !DESIGN_SYSTEM_ROOTS.some((root) => module.startsWith(root))
    )
    .filter((module) => (consumers.get(module)?.size ?? 0) < 2)
    .map((module) => `shared-single-consumer | ${module} (${consumers.get(module)?.size ?? 0})`);
}

function isReExportOfDefault(statement: ts.Statement): boolean {
  if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !statement.exportClause)
    return false;
  const clause = statement.exportClause;
  return (
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.some((element) => element.name.text === 'default')
  );
}

export function isRouteShapeViolation(file: string): boolean {
  if (!file.startsWith('src/app/') || NOT_ROUTES.test(file)) return false;
  const statements = readSource(file).source.statements;
  return !(
    statements.length === 1 &&
    statements[0] !== undefined &&
    isReExportOfDefault(statements[0])
  );
}

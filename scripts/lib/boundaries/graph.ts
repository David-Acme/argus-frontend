import ts from 'typescript';
import { importsOf, readSource, resolveImport } from '../source-files';

export type Edge = { from: string; to: string; runtime: boolean };

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  const bindings = clause.namedBindings;
  if (clause.name || !bindings || !ts.isNamedImports(bindings)) return false;
  return bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
}

function isTypeOnlyExport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true;
  const clause = node.exportClause;
  return (
    clause !== undefined &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly)
  );
}

function specifierOf(statement: ts.Statement): { specifier: string; runtime: boolean } | null {
  if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
    return { specifier: statement.moduleSpecifier.text, runtime: !isTypeOnlyImport(statement) };
  }
  if (
    ts.isExportDeclaration(statement) &&
    statement.moduleSpecifier &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return { specifier: statement.moduleSpecifier.text, runtime: !isTypeOnlyExport(statement) };
  }
  return null;
}

function staticRuntime(source: ts.SourceFile): Map<string, boolean> {
  const runtime = new Map<string, boolean>();
  for (const statement of source.statements) {
    const found = specifierOf(statement);
    if (found)
      runtime.set(found.specifier, (runtime.get(found.specifier) ?? false) || found.runtime);
  }
  return runtime;
}

export function edgesOf(file: string): Edge[] {
  const { text, source } = readSource(file);
  const runtime = staticRuntime(source);
  const edges: Edge[] = [];
  for (const specifier of new Set(importsOf(text))) {
    const target = resolveImport(file, specifier);
    if (target) edges.push({ from: file, to: target, runtime: runtime.get(specifier) ?? false });
  }
  return edges;
}

type Tarjan = {
  index: Map<string, number>;
  low: Map<string, number>;
  stack: string[];
  onStack: Set<string>;
  found: string[][];
};

function connect(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  node: string,
  state: Tarjan
): void {
  state.index.set(node, state.index.size);
  state.low.set(node, state.index.get(node) ?? 0);
  state.stack.push(node);
  state.onStack.add(node);
  for (const next of graph.get(node) ?? []) {
    if (!state.index.has(next)) connect(graph, next, state);
    if (state.onStack.has(next))
      state.low.set(
        node,
        Math.min(state.low.get(node) ?? 0, state.low.get(next) ?? state.index.get(next) ?? 0)
      );
  }
  if (state.low.get(node) !== state.index.get(node)) return;
  const component: string[] = [];
  let member: string | undefined;
  do {
    member = state.stack.pop();
    if (member === undefined) break;
    state.onStack.delete(member);
    component.push(member);
  } while (member !== node);
  state.found.push(component);
}

export function cycles(graph: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
  const state: Tarjan = {
    index: new Map(),
    low: new Map(),
    stack: [],
    onStack: new Set(),
    found: [],
  };
  for (const node of graph.keys()) if (!state.index.has(node)) connect(graph, node, state);
  return state.found
    .filter(
      (component) => component.length > 1 || graph.get(component[0] ?? '')?.has(component[0] ?? '')
    )
    .map((component) => component.sort());
}

export function graphOf(
  edges: readonly Edge[],
  key: (file: string) => string
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!edge.runtime) continue;
    const from = key(edge.from);
    const to = key(edge.to);
    if (from === to && edge.from !== edge.to) continue;
    const targets = graph.get(from) ?? new Set<string>();
    targets.add(to);
    graph.set(from, targets);
    if (!graph.has(to)) graph.set(to, new Set());
  }
  return graph;
}

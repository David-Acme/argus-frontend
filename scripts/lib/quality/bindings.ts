import ts from 'typescript';
import { walk, type SourceFile } from '../source-files';

export type ModuleBindings = { named: Map<string, string>; namespaces: Set<string> };

function requiredModule(node: ts.Expression | undefined): string | null {
  if (
    node &&
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'require' &&
    node.arguments[0] &&
    ts.isStringLiteralLike(node.arguments[0])
  )
    return node.arguments[0].text;
  return null;
}

function addImport(node: ts.ImportDeclaration, bindings: ModuleBindings): void {
  const clause = node.importClause;
  if (!clause || clause.isTypeOnly) return;
  if (clause.name) bindings.namespaces.add(clause.name.text);
  const named = clause.namedBindings;
  if (named && ts.isNamespaceImport(named)) bindings.namespaces.add(named.name.text);
  if (named && ts.isNamedImports(named))
    for (const element of named.elements)
      if (!element.isTypeOnly)
        bindings.named.set(element.name.text, (element.propertyName ?? element.name).text);
}

function addDestructured(pattern: ts.ObjectBindingPattern, bindings: ModuleBindings): void {
  for (const element of pattern.elements) {
    const property = element.propertyName ?? element.name;
    if (ts.isIdentifier(element.name) && ts.isIdentifier(property))
      bindings.named.set(element.name.text, property.text);
  }
}

function fromNamespace(node: ts.Expression | undefined, bindings: ModuleBindings): boolean {
  return node !== undefined && ts.isIdentifier(node) && bindings.namespaces.has(node.text);
}

function addDeclaration(
  node: ts.VariableDeclaration,
  module: string,
  bindings: ModuleBindings
): void {
  const source = requiredModule(node.initializer) === module;
  if (!source && !fromNamespace(node.initializer, bindings)) return;
  if (ts.isIdentifier(node.name)) bindings.namespaces.add(node.name.text);
  else if (ts.isObjectBindingPattern(node.name)) addDestructured(node.name, bindings);
}

export function moduleBindings(file: SourceFile, module: string): ModuleBindings {
  const bindings: ModuleBindings = { named: new Map(), namespaces: new Set() };
  for (const statement of file.source.statements)
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === module
    )
      addImport(statement, bindings);
  walk(file.source, (node) => {
    if (ts.isVariableDeclaration(node)) addDeclaration(node, module, bindings);
  });
  return bindings;
}

export function memberName(node: ts.Node): { object: ts.Expression; name: string } | null {
  if (ts.isPropertyAccessExpression(node)) return { object: node.expression, name: node.name.text };
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression))
    return { object: node.expression, name: node.argumentExpression.text };
  return null;
}

export function isNotReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    ts.isImportSpecifier(parent) ||
    ts.isImportClause(parent) ||
    ts.isNamespaceImport(parent) ||
    (ts.isBindingElement(parent) && parent.name === node) ||
    (ts.isBindingElement(parent) && parent.propertyName === node) ||
    (ts.isVariableDeclaration(parent) && parent.name === node) ||
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isPropertySignature(parent) && parent.name === node) ||
    ts.isJsxAttribute(parent)
  );
}

export function isReferenceTo(node: ts.Node, bindings: ModuleBindings, name: string): boolean {
  if (ts.isIdentifier(node)) return bindings.named.get(node.text) === name;
  const member = memberName(node);
  return member !== null && member.name === name && fromNamespace(member.object, bindings);
}

export function importedNames(
  file: SourceFile,
  bindings: ModuleBindings,
  names: ReadonlySet<string>
): number {
  const viaNamespace = new Set<string>();
  walk(file.source, (node) => {
    const member = memberName(node);
    if (member && names.has(member.name) && fromNamespace(member.object, bindings))
      viaNamespace.add(member.name);
  });
  const direct = [...bindings.named.values()].filter((name) => names.has(name)).length;
  return direct + viaNamespace.size;
}

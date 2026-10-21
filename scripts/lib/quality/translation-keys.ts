import ts from 'typescript';
import { walk, type SourceFile } from '../source-files';

const TRANSLATORS = new Set(['t', 'tk']);
const JOINERS = new Set(['concat', 'join']);

function calleeName(node: ts.CallExpression): string | null {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return null;
}

function isBuilder(node: ts.Node): boolean {
  if (ts.isTemplateExpression(node)) return true;
  if (ts.isBinaryExpression(node)) return node.operatorToken.kind === ts.SyntaxKind.PlusToken;
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    JOINERS.has(node.expression.name.text)
  );
}

function buildsKey(argument: ts.Node): boolean {
  let found = false;
  walk(argument, (node) => {
    if (!found) found = isBuilder(node);
  });
  return found;
}

function isKeyCast(node: ts.Node): boolean {
  if (!ts.isAsExpression(node) && !ts.isTypeAssertionExpression(node)) return false;
  return (
    ts.isTypeReferenceNode(node.type) &&
    ts.isIdentifier(node.type.typeName) &&
    node.type.typeName.text === 'TranslationKey'
  );
}

function aliasOf(node: ts.Node, translators: ReadonlySet<string>): string | null {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.initializer &&
    ts.isIdentifier(node.initializer) &&
    translators.has(node.initializer.text)
  )
    return node.name.text;
  if (
    ts.isBindingElement(node) &&
    node.propertyName &&
    ts.isIdentifier(node.propertyName) &&
    TRANSLATORS.has(node.propertyName.text) &&
    ts.isIdentifier(node.name)
  )
    return node.name.text;
  return null;
}

export function translatorNames(file: SourceFile): Set<string> {
  const names = new Set(TRANSLATORS);
  walk(file.source, (node) => {
    const alias = aliasOf(node, names);
    if (alias) names.add(alias);
  });
  return names;
}

export function builtKeys(file: SourceFile): number {
  const translators = translatorNames(file);
  let count = 0;
  walk(file.source, (node) => {
    if (isKeyCast(node)) count += 1;
    if (!ts.isCallExpression(node) || !translators.has(calleeName(node) ?? '')) return;
    const first = node.arguments[0];
    if (first && buildsKey(first)) count += 1;
  });
  return count;
}

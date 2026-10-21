import ts from 'typescript';
import { countNodes, type SourceFile } from '../source-files';

export type Counter = {
  name: string;
  applies: (path: string) => boolean;
  count: (file: SourceFile) => number;
};

const inSource = (path: string) => path.startsWith('src/');
const inFeatures = (path: string) => path.startsWith('src/features/');
const outsideTheme = (path: string) => inSource(path) && !path.startsWith('src/shared/theme/');

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch)\(/g;
const ARBITRARY = /(?:^|[\s:'"`])!?-?[a-z][a-z0-9-]*-\[[^\]\s]+\]/g;
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'postMultipart']);
const MEMO_CALLS = new Set(['useCallback', 'useMemo', 'memo']);

function stringText(node: ts.Node): string | null {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))
    return node.text;
  return null;
}

function countInStrings(file: SourceFile, pattern: RegExp): number {
  let count = 0;
  const visit = (node: ts.Node) => {
    const text = stringText(node);
    if (text !== null) count += text.match(pattern)?.length ?? 0;
    node.forEachChild(visit);
  };
  visit(file.source);
  return count;
}

function calleeName(node: ts.CallExpression): string | null {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return null;
}

function importsNamed(file: SourceFile, module: string, names: ReadonlySet<string>): number {
  return countNodes(
    file,
    (node) =>
      ts.isImportSpecifier(node) &&
      names.has((node.propertyName ?? node.name).text) &&
      ts.isStringLiteral(node.parent.parent.parent.moduleSpecifier) &&
      node.parent.parent.parent.moduleSpecifier.text === module
  );
}

function isStyleObject(node: ts.Node): boolean {
  return (
    ts.isJsxAttribute(node) &&
    node.name.getText() === 'style' &&
    node.initializer !== undefined &&
    ts.isJsxExpression(node.initializer) &&
    node.initializer.expression !== undefined &&
    ts.isObjectLiteralExpression(node.initializer.expression)
  );
}

function isTemplateKey(node: ts.Node): boolean {
  if (!ts.isCallExpression(node) || calleeName(node) !== 't') return false;
  const first = node.arguments[0];
  return first !== undefined && ts.isTemplateExpression(first);
}

function unwrapAwait(node: ts.Node): ts.Node {
  let current = node;
  while (ts.isAwaitExpression(current.parent) || ts.isParenthesizedExpression(current.parent))
    current = current.parent;
  return current;
}

function isUncheckedHttp(node: ts.Node): boolean {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return false;
  const target = node.expression.expression;
  if (!ts.isIdentifier(target) || target.text !== 'httpService') return false;
  if (!HTTP_METHODS.has(node.expression.name.text)) return false;
  const outer = unwrapAwait(node).parent;
  const passedOn = ts.isCallExpression(outer) && outer.expression !== unwrapAwait(node);
  const opaque = node.typeArguments?.[0]?.kind === ts.SyntaxKind.UnknownKeyword;
  return !passedOn && !opaque;
}

function isIsFlag(node: ts.Node): boolean {
  return (
    ts.isIdentifier(node) && /^IS_[A-Z_]+$/.test(node.text) && !ts.isImportSpecifier(node.parent)
  );
}

function isPlatformSelect(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.getText() === 'Platform.select'
  );
}

export function memoSymbol(node: ts.Node): string {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name))
      return current.name.text;
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
  }
  return '<module>';
}

export function memoCalls(file: SourceFile): ts.CallExpression[] {
  const found: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && MEMO_CALLS.has(calleeName(node) ?? '')) found.push(node);
    node.forEachChild(visit);
  };
  visit(file.source);
  return found;
}

function animatedStyleObject(node: ts.Node): ts.ObjectLiteralExpression[] {
  if (!ts.isCallExpression(node) || calleeName(node) !== 'useAnimatedStyle') return [];
  const callback = node.arguments[0];
  if (!callback || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) return [];
  const results: ts.ObjectLiteralExpression[] = [];
  const body = ts.isParenthesizedExpression(callback.body)
    ? callback.body.expression
    : callback.body;
  if (ts.isObjectLiteralExpression(body)) results.push(body);
  const visit = (inner: ts.Node) => {
    if (ts.isFunctionLike(inner) && inner !== callback) return;
    if (
      ts.isReturnStatement(inner) &&
      inner.expression &&
      ts.isObjectLiteralExpression(inner.expression)
    ) {
      results.push(inner.expression);
    }
    inner.forEachChild(visit);
  };
  visit(callback.body);
  return results;
}

function animatedLayoutProps(file: SourceFile): number {
  let count = 0;
  const visit = (node: ts.Node) => {
    for (const object of animatedStyleObject(node)) {
      count += object.properties.filter(
        (property) =>
          property.name !== undefined && !['transform', 'opacity'].includes(property.name.getText())
      ).length;
    }
    node.forEachChild(visit);
  };
  visit(file.source);
  return count;
}

function membersOver(node: ts.Node, limit: number): boolean {
  if (ts.isInterfaceDeclaration(node))
    return /Props$/.test(node.name.text) && node.members.length > limit;
  if (!ts.isTypeAliasDeclaration(node) || !/Props$/.test(node.name.text)) return false;
  return ts.isTypeLiteralNode(node.type) && node.type.members.length > limit;
}

export const syntaxCounters: readonly Counter[] = [
  { name: 'hex-literal', applies: outsideTheme, count: (file) => countInStrings(file, COLOR) },
  { name: 'arbitrary-value', applies: inSource, count: (file) => countInStrings(file, ARBITRARY) },
  { name: 'style-object', applies: inSource, count: (file) => countNodes(file, isStyleObject) },
  {
    name: 'raw-pressable-in-features',
    applies: inFeatures,
    count: (file) => importsNamed(file, 'react-native', new Set(['Pressable'])),
  },
  {
    name: 'window-dimensions-in-features',
    applies: inFeatures,
    count: (file) =>
      importsNamed(file, 'react-native', new Set(['useWindowDimensions', 'Dimensions'])),
  },
  { name: 'template-key', applies: inSource, count: (file) => countNodes(file, isTemplateKey) },
  { name: 'http-unchecked', applies: inSource, count: (file) => countNodes(file, isUncheckedHttp) },
  { name: 'is-flag-in-features', applies: inFeatures, count: (file) => countNodes(file, isIsFlag) },
  {
    name: 'platform-select',
    applies: inSource,
    count: (file) => countNodes(file, isPlatformSelect),
  },
  { name: 'animated-layout-prop', applies: inSource, count: animatedLayoutProps },
  {
    name: 'props-over-10',
    applies: inSource,
    count: (file) => countNodes(file, (node) => membersOver(node, 10)),
  },
];

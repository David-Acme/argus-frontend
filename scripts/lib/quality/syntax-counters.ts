import ts from 'typescript';
import { countNodes, type SourceFile } from '../source-files';
import {
  flagReads,
  inlineStyleObjects,
  platformSelects,
  reactNativeImports,
  uncheckedHttp,
} from './binding-counters';
import { builtKeys } from './translation-keys';

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
  { name: 'style-object', applies: inSource, count: inlineStyleObjects },
  {
    name: 'raw-pressable-in-features',
    applies: inFeatures,
    count: (file) => reactNativeImports(file, new Set(['Pressable'])),
  },
  {
    name: 'window-dimensions-in-features',
    applies: inFeatures,
    count: (file) => reactNativeImports(file, new Set(['useWindowDimensions', 'Dimensions'])),
  },
  { name: 'template-key', applies: inSource, count: builtKeys },
  { name: 'http-unchecked', applies: inSource, count: uncheckedHttp },
  { name: 'is-flag-in-features', applies: inFeatures, count: flagReads },
  {
    name: 'platform-select',
    applies: inSource,
    count: platformSelects,
  },
  { name: 'animated-layout-prop', applies: inSource, count: animatedLayoutProps },
  {
    name: 'props-over-10',
    applies: inSource,
    count: (file) => countNodes(file, (node) => membersOver(node, 10)),
  },
];

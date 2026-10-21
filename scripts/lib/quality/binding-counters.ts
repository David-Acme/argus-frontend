import ts from 'typescript';
import { walk, type SourceFile } from '../source-files';
import {
  importedNames,
  isNotReference,
  isReferenceTo,
  memberName,
  moduleBindings,
  type ModuleBindings,
} from './bindings';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'postMultipart']);
const CHECKER =
  /^(parsed|checked|parse|safeParse|parseAsync|safeParseAsync)$|^(parse|check|read|validate)[A-Z]|[a-z]Of$/;
const IS_FLAG = /^IS_[A-Z_]+$/;

export function reactNativeImports(file: SourceFile, names: ReadonlySet<string>): number {
  return importedNames(file, moduleBindings(file, 'react-native'), names);
}

function styleObjects(expression: ts.Node): number {
  if (ts.isObjectLiteralExpression(expression)) return 1;
  let count = 0;
  expression.forEachChild((child) => {
    count += styleObjects(child);
  });
  return count;
}

export function inlineStyleObjects(file: SourceFile): number {
  let count = 0;
  walk(file.source, (node) => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText() === 'style' &&
      node.initializer !== undefined &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression !== undefined
    )
      count += styleObjects(node.initializer.expression);
  });
  return count;
}

function isPlatform(node: ts.Expression, bindings: ModuleBindings): boolean {
  return isReferenceTo(node, bindings, 'Platform');
}

export function platformSelects(file: SourceFile): number {
  const bindings = moduleBindings(file, 'react-native');
  let count = 0;
  walk(file.source, (node) => {
    if (!ts.isCallExpression(node)) return;
    const member = memberName(node.expression);
    if (member?.name === 'select' && isPlatform(member.object, bindings)) count += 1;
  });
  return count;
}

function flagAliases(file: SourceFile): Set<string> {
  const aliases = new Set<string>();
  walk(file.source, (node) => {
    if (ts.isImportSpecifier(node) && node.propertyName && IS_FLAG.test(node.propertyName.text))
      aliases.add(node.name.text);
  });
  return aliases;
}

export function flagReads(file: SourceFile): number {
  const aliases = flagAliases(file);
  let count = 0;
  walk(file.source, (node) => {
    if (!ts.isIdentifier(node) || ts.isImportSpecifier(node.parent)) return;
    if (IS_FLAG.test(node.text) || (aliases.has(node.text) && !isNotReference(node))) count += 1;
  });
  return count;
}

function unwrapAwait(node: ts.Node): ts.Node {
  let current = node;
  while (ts.isAwaitExpression(current.parent) || ts.isParenthesizedExpression(current.parent))
    current = current.parent;
  return current;
}

function calleeName(node: ts.CallExpression): string {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  return memberName(node.expression)?.name ?? '';
}

function isChecked(call: ts.CallExpression): boolean {
  if (call.typeArguments?.[0]?.kind === ts.SyntaxKind.UnknownKeyword) return true;
  const outer = unwrapAwait(call).parent;
  return (
    ts.isCallExpression(outer) &&
    outer.expression !== unwrapAwait(call) &&
    CHECKER.test(calleeName(outer))
  );
}

function addServiceAlias(node: ts.VariableDeclaration, http: ModuleBindings): void {
  if (!node.initializer || !ts.isIdentifier(node.initializer)) return;
  if (!http.namespaces.has(node.initializer.text)) return;
  if (ts.isIdentifier(node.name)) http.namespaces.add(node.name.text);
  if (!ts.isObjectBindingPattern(node.name)) return;
  for (const element of node.name.elements) {
    const property = element.propertyName ?? element.name;
    if (ts.isIdentifier(element.name) && ts.isIdentifier(property))
      http.named.set(element.name.text, property.text);
  }
}

function httpBindings(file: SourceFile): ModuleBindings {
  const http: ModuleBindings = { named: new Map(), namespaces: new Set(['httpService']) };
  walk(file.source, (node) => {
    if (ts.isImportSpecifier(node) && (node.propertyName ?? node.name).text === 'httpService')
      http.namespaces.add(node.name.text);
    if (ts.isVariableDeclaration(node)) addServiceAlias(node, http);
  });
  return http;
}

function isHttpCall(node: ts.CallExpression, http: ModuleBindings): boolean {
  if (ts.isIdentifier(node.expression))
    return HTTP_METHODS.has(http.named.get(node.expression.text) ?? '');
  const member = memberName(node.expression);
  return (
    member !== null &&
    HTTP_METHODS.has(member.name) &&
    ts.isIdentifier(member.object) &&
    http.namespaces.has(member.object.text)
  );
}

export function uncheckedHttp(file: SourceFile): number {
  const http = httpBindings(file);
  let count = 0;
  walk(file.source, (node) => {
    if (ts.isCallExpression(node) && isHttpCall(node, http) && !isChecked(node)) count += 1;
  });
  return count;
}

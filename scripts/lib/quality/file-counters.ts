import ts from 'typescript';
import { walk, type SourceFile } from '../source-files';
import type { Counter } from './syntax-counters';

const REDUCE_MOTION =
  /^(useReduceMotion|useReducedMotion|ReduceMotion|reduceMotion|reducedMotion)$/;
const VISUAL_TIMERS = /^(setInterval|requestAnimationFrame)$/;
const FILE_READS = /^(readFileSync|readFile|file)$/;
const SOURCE_PATH = /(^|\/)src\/.+\.tsx?$/;

const LEGACY_ROLES = [
  'background',
  'foreground-on-interactive',
  'foreground-on-success',
  'foreground-on-error',
  'foreground-secondary',
  'foreground',
  'muted-foreground',
  'muted',
  'card-foreground',
  'card-secondary',
  'card',
  'surface-secondary',
  'border-subtle',
  'border',
  'divider',
  'interactive-pressed',
  'interactive-hover',
  'interactive',
  'success',
  'warning-strong',
  'warning',
  'error-strong',
  'error',
  'info',
  'primary-foreground',
  'primary',
  'secondary-foreground',
  'secondary',
  'destructive-foreground',
  'destructive',
  'popover-foreground',
  'popover',
  'accent-foreground',
  'accent-hover',
  'accent-strong',
  'chart-[1-5]',
  'disabled',
  'input',
  'overlay',
  'placeholder',
  'ring',
  'legacy-[a-z0-9-]+',
];

const COLOR_UTILITIES =
  '(?:bg|text|border(?:-[trblxy])?|ring|ring-offset|outline|fill|stroke|divide|placeholder|shadow|from|via|to|decoration|caret|tint)';

const LEGACY_CLASS = new RegExp(
  `(?<![\\w-])${COLOR_UTILITIES}-(?:${LEGACY_ROLES.join('|')})(?:\\/\\d+)?(?![\\w-])|var\\(--color-(?:${LEGACY_ROLES.join('|')})\\)`,
  'g'
);

function callsMatching(file: SourceFile, names: RegExp): boolean {
  let found = false;
  walk(file.source, (node) => {
    if (found || !ts.isCallExpression(node)) return;
    const callee = node.expression;
    const name = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : '';
    found = names.test(name);
  });
  return found;
}

function inTypePosition(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isTypeNode(current)) return true;
    if (ts.isExpression(current) || ts.isStatement(current)) return false;
  }
  return false;
}

function isTimerReference(node: ts.Node): boolean {
  if (ts.isIdentifier(node)) return VISUAL_TIMERS.test(node.text) && !inTypePosition(node);
  return (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression) &&
    VISUAL_TIMERS.test(node.argumentExpression.text)
  );
}

function referencesTimer(file: SourceFile): boolean {
  let found = false;
  walk(file.source, (node) => {
    if (!found) found = isTimerReference(node);
  });
  return found;
}

function readsIdentifier(file: SourceFile, names: RegExp): boolean {
  let found = false;
  walk(file.source, (node) => {
    if (!found && ts.isIdentifier(node)) found = names.test(node.text);
  });
  return found;
}

function startsLoop(file: SourceFile): boolean {
  return (
    callsMatching(file, /^withRepeat$/) ||
    /animationIterationCount['"]?\s*:\s*['"]infinite['"]/.test(file.text)
  );
}

function readsSourceAsText(file: SourceFile): boolean {
  if (!callsMatching(file, FILE_READS)) return false;
  let found = false;
  walk(file.source, (node) => {
    if (!found && ts.isStringLiteralLike(node)) found = SOURCE_PATH.test(node.text);
  });
  return found;
}

function legacyClasses(file: SourceFile): number {
  let count = 0;
  walk(file.source, (node) => {
    if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node))
      count += node.text.match(LEGACY_CLASS)?.length ?? 0;
  });
  return count;
}

const component = (path: string) => path.startsWith('src/') && path.endsWith('.tsx');

export const fileCounters: readonly Counter[] = [
  {
    name: 'loop-without-reduce-motion',
    applies: (path) => path.startsWith('src/'),
    count: (file) => (startsLoop(file) && !readsIdentifier(file, REDUCE_MOTION) ? 1 : 0),
  },
  {
    name: 'timer-in-component',
    applies: (path) => component(path) && !path.startsWith('src/shared/ui/'),
    count: (file) => (referencesTimer(file) ? 1 : 0),
  },
  {
    name: 'source-text-test',
    applies: (path) => path.startsWith('tests/unit/'),
    count: (file) => (readsSourceAsText(file) ? 1 : 0),
  },
  {
    name: 'legacy-token-class',
    applies: (path) => path.startsWith('src/') && !path.startsWith('src/shared/theme/'),
    count: legacyClasses,
  },
];

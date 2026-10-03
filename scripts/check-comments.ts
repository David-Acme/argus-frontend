import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import ts from 'typescript';

type Range = { start: number; end: number };

type Dialect = {
  lineComment: boolean;
  nestedBlocks: boolean;
  rustChars: boolean;
  rawStrings: 'rust' | 'swift' | null;
  tripleQuotes: boolean;
  singleQuotedStrings: boolean;
};

const C_FAMILY: Record<string, Dialect> = {
  '.kt': { lineComment: true, nestedBlocks: true, rustChars: false, rawStrings: null, tripleQuotes: true, singleQuotedStrings: true },
  '.gradle': { lineComment: true, nestedBlocks: false, rustChars: false, rawStrings: null, tripleQuotes: true, singleQuotedStrings: true },
  '.swift': { lineComment: true, nestedBlocks: true, rustChars: false, rawStrings: 'swift', tripleQuotes: true, singleQuotedStrings: false },
  '.rs': { lineComment: true, nestedBlocks: true, rustChars: true, rawStrings: 'rust', tripleQuotes: false, singleQuotedStrings: false },
  '.h': { lineComment: true, nestedBlocks: false, rustChars: false, rawStrings: null, tripleQuotes: false, singleQuotedStrings: true },
  '.cpp': { lineComment: true, nestedBlocks: false, rustChars: false, rawStrings: null, tripleQuotes: false, singleQuotedStrings: true },
  '.css': { lineComment: false, nestedBlocks: false, rustChars: false, rawStrings: null, tripleQuotes: false, singleQuotedStrings: true },
};

const SCRIPT_KINDS: Record<string, ts.ScriptKind> = {
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.js': ts.ScriptKind.JS,
  '.mjs': ts.ScriptKind.JS,
  '.cjs': ts.ScriptKind.JS,
};

const HASH_FILES = new Set(['.gitignore', '.npmrc', 'CMakeLists.txt']);
const HASH_EXTENSIONS = new Set(['.properties', '.toml', '.podspec']);
const SILENT_EXTENSIONS = new Set(['.json', '.md', '.png', '.lock', '.txt']);
const SILENT_FILES = new Set(['LICENSE', '.prettierrc']);
const GENERATED_FILES = new Set(['uniwind-types.d.ts']);
const TRIPLE_SLASH_DIRECTIVE = /^\/\/\/\s*<(reference|amd-module|amd-dependency)\b/;

function scriptComments(path: string, text: string, kind: ts.ScriptKind): Range[] {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const found = new Map<number, Range>();
  const collect = (position: number) => {
    const ranges = [
      ...(ts.getLeadingCommentRanges(text, position) ?? []),
      ...(ts.getTrailingCommentRanges(text, position) ?? []),
    ];
    for (const comment of ranges) {
      if (TRIPLE_SLASH_DIRECTIVE.test(text.slice(comment.pos, comment.end))) continue;
      found.set(comment.pos, { start: comment.pos, end: comment.end });
    }
  };
  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.JsxText || node.kind === ts.SyntaxKind.JsxTextAllWhiteSpaces) return;
    if (ts.isJsxExpression(node) && !node.expression && node.parent && !ts.isJsxAttribute(node.parent)) {
      const start = node.getStart(source);
      if (ts.getTrailingCommentRanges(text, start + 1)?.length) found.set(start, { start, end: node.end });
      return;
    }
    collect(node.pos);
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
  collect(source.endOfFileToken.pos);
  return [...found.values()].sort((left, right) => left.start - right.start);
}

function rawStringEnd(text: string, at: number, dialect: Dialect): number | null {
  if (dialect.rawStrings === 'rust' && text[at] === 'r' && !/[A-Za-z0-9_]/.test(text[at - 1] ?? '')) {
    let cursor = at + 1;
    while (text[cursor] === '#') cursor += 1;
    if (text[cursor] !== '"') return null;
    const closing = '"' + '#'.repeat(cursor - at - 1);
    const end = text.indexOf(closing, cursor + 1);
    return end === -1 ? text.length : end + closing.length;
  }
  if (dialect.rawStrings === 'swift' && text[at] === '#') {
    let cursor = at;
    while (text[cursor] === '#') cursor += 1;
    if (text[cursor] !== '"') return null;
    const hashes = '#'.repeat(cursor - at);
    const triple = text.startsWith('"""', cursor);
    const closing = (triple ? '"""' : '"') + hashes;
    const end = text.indexOf(closing, cursor + (triple ? 3 : 1));
    return end === -1 ? text.length : end + closing.length;
  }
  return null;
}

function quotedEnd(text: string, at: number, quote: string): number {
  let cursor = at + 1;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === '\\') {
      cursor += 2;
      continue;
    }
    if (char === quote || char === '\n') return cursor + 1;
    cursor += 1;
  }
  return text.length;
}

function cFamilyComments(text: string, dialect: Dialect): Range[] {
  const ranges: Range[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const char = text[cursor];
    const next = text[cursor + 1];
    const raw = rawStringEnd(text, cursor, dialect);
    if (raw != null) {
      cursor = raw;
      continue;
    }
    if (dialect.tripleQuotes && text.startsWith('"""', cursor)) {
      const end = text.indexOf('"""', cursor + 3);
      cursor = end === -1 ? text.length : end + 3;
      continue;
    }
    if (char === '"') {
      cursor = quotedEnd(text, cursor, '"');
      continue;
    }
    if (char === "'") {
      if (dialect.rustChars) {
        const literal = /^'(\\(u\{[0-9a-fA-F]+\}|x[0-9a-fA-F]{2}|.)|[^\\'\n])'/.exec(text.slice(cursor, cursor + 12));
        cursor += literal ? literal[0].length : 1;
        continue;
      }
      if (dialect.singleQuotedStrings) {
        cursor = quotedEnd(text, cursor, "'");
        continue;
      }
    }
    if (dialect.lineComment && char === '/' && next === '/') {
      const end = text.indexOf('\n', cursor);
      const stop = end === -1 ? text.length : end;
      ranges.push({ start: cursor, end: stop });
      cursor = stop;
      continue;
    }
    if (char === '/' && next === '*') {
      let depth = 1;
      let scan = cursor + 2;
      while (scan < text.length && depth > 0) {
        if (dialect.nestedBlocks && text[scan] === '/' && text[scan + 1] === '*') {
          depth += 1;
          scan += 2;
        } else if (text[scan] === '*' && text[scan + 1] === '/') {
          depth -= 1;
          scan += 2;
        } else {
          scan += 1;
        }
      }
      ranges.push({ start: cursor, end: scan });
      cursor = scan;
      continue;
    }
    cursor += 1;
  }
  return ranges;
}

function hashComments(text: string, lineStartOnly: boolean): Range[] {
  const ranges: Range[] = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    let quote: string | null = null;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (quote) {
        if (char === '\\') index += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        if (lineStartOnly) break;
        quote = char;
        continue;
      }
      if (char === '#') {
        if (!lineStartOnly || line.slice(0, index).trim() === '') {
          ranges.push({ start: offset + index, end: offset + line.length });
        }
        break;
      }
      if (lineStartOnly && char.trim() !== '') break;
    }
    offset += line.length + 1;
  }
  return ranges;
}

function xmlComments(text: string): Range[] {
  const ranges: Range[] = [];
  let cursor = text.indexOf('<!--');
  while (cursor !== -1) {
    const end = text.indexOf('-->', cursor + 4);
    const stop = end === -1 ? text.length : end + 3;
    ranges.push({ start: cursor, end: stop });
    cursor = text.indexOf('<!--', stop);
  }
  return ranges;
}

function commentsOf(path: string, text: string): Range[] | null {
  const extension = extname(path);
  const name = basename(path);
  if (SILENT_FILES.has(name) || (SILENT_EXTENSIONS.has(extension) && name !== 'CMakeLists.txt')) return [];
  if (extension in SCRIPT_KINDS) return scriptComments(path, text, SCRIPT_KINDS[extension]);
  if (extension in C_FAMILY) return cFamilyComments(text, C_FAMILY[extension]);
  if (HASH_FILES.has(name)) return hashComments(text, name !== 'CMakeLists.txt');
  if (HASH_EXTENSIONS.has(extension)) return hashComments(text, extension === '.properties');
  if (extension === '.xml') return xmlComments(text);
  return null;
}

function withoutRanges(text: string, ranges: Range[]): string {
  let result = text;
  for (const range of [...ranges].sort((left, right) => right.start - left.start)) {
    const lineStart = result.lastIndexOf('\n', range.start - 1) + 1;
    const newline = result.indexOf('\n', range.end);
    const lineEnd = newline === -1 ? result.length : newline;
    const before = result.slice(lineStart, range.start);
    const after = result.slice(range.end, lineEnd);
    if (before.trim() === '' && after.trim() === '') {
      result = result.slice(0, lineStart) + result.slice(newline === -1 ? lineEnd : lineEnd + 1);
    } else {
      result = result.slice(0, lineStart) + before.trimEnd() + (after.trim() === '' ? '' : ' ' + after.trimStart()) + result.slice(lineEnd);
    }
  }
  return result;
}

function lineOf(text: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (text[index] === '\n') line += 1;
  return line;
}

function usage(): never {
  process.stdout.write(`usage: bun scripts/check-comments.ts [--fix]

Scans every file git tracks or would track in this project and fails on any
comment: TypeScript and JavaScript through the TypeScript parser, Kotlin,
Swift, Rust, Gradle, C++ and CSS through a C-family lexer, XML, and the
hash-comment formats. A file type it cannot classify fails the scan too.
--fix removes the comments it finds.
`);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes('--help')) usage();
const fix = args.includes('--fix');

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((path) => !path.startsWith('docs/') && !GENERATED_FILES.has(path));

let total = 0;
let unknown = 0;
let filesWithComments = 0;
for (const path of files) {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    continue;
  }
  const ranges = commentsOf(path, text);
  if (ranges == null) {
    unknown += 1;
    process.stdout.write(`${path}: file type not classified\n`);
    continue;
  }
  if (ranges.length === 0) continue;
  filesWithComments += 1;
  total += ranges.length;
  if (fix) {
    writeFileSync(path, withoutRanges(text, ranges).replace(/\n{3,}/g, '\n\n').replace(/^\n+/, ''));
    continue;
  }
  for (const range of ranges) {
    const snippet = text.slice(range.start, Math.min(range.end, range.start + 60)).split('\n')[0];
    process.stdout.write(`${path}:${lineOf(text, range.start)}: ${snippet}\n`);
  }
}

process.stdout.write(
  `check-comments: ${files.length} files, ${total} comments in ${filesWithComments} files${fix ? ' removed' : ''}, ${unknown} unclassified\n`
);
process.exit(!fix && (total > 0 || unknown > 0) ? 1 : 0);

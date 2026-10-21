const FENCE = /```[\s\S]*?```/g;
const CODE = /`[^`\n]*`/g;
const CITATION = /(?<![!\]\w])\[([a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:-\*)?)\](?![(:\w])/g;
const ROW = /^\|\s*\[([^\]]+)\]\s*\|(.*)$/;

export type ReferenceRow = { key: string; hasUrl: boolean };

export function referenceRows(markdown: string): ReferenceRow[] {
  return markdown
    .split('\n')
    .map((line) => ROW.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ key: match[1] ?? '', hasUrl: /https?:\/\/\S+/.test(match[2] ?? '') }));
}

export function citations(markdown: string): string[] {
  const prose = markdown.replace(FENCE, '').replace(CODE, '');
  return [...prose.matchAll(CITATION)].map((match) => match[1] ?? '').filter((key) => key !== 'x');
}

function citationFailure(key: string, keys: ReadonlySet<string>): boolean {
  if (!key.endsWith('-*')) return !keys.has(key);
  const family = key.slice(0, -1);
  return ![...keys].some((known) => known.startsWith(family));
}

export function referenceFailures(
  references: string,
  documents: ReadonlyMap<string, string>
): string[] {
  const rows = referenceRows(references);
  const keys = new Set(rows.map((row) => row.key));
  const missingUrl = rows
    .filter((row) => !row.hasUrl)
    .map((row) => `docs/references.md: [${row.key}] has no URL`);
  const unknown = [...documents].flatMap(([path, text]) =>
    [...new Set(citations(text))]
      .filter((key) => citationFailure(key, keys))
      .map((key) => `${path}: [${key}] is not in docs/references.md`)
  );
  return [...missingUrl, ...unknown];
}

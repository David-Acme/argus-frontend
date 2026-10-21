import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type BundleBaseline = { entryBytes: number; distBytes: number; lazy: string[] };
export type BundleSizes = { entryBytes: number; distBytes: number; chunks: string[] };

export function parseBundleBaseline(text: string): BundleBaseline {
  const baseline: BundleBaseline = { entryBytes: Number.NaN, distBytes: Number.NaN, lazy: [] };
  for (const line of text
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)) {
    const [key, value = ''] = line.split(/\s+/);
    if (key === 'entry-chunk-bytes') baseline.entryBytes = Number(value);
    else if (key === 'dist-bytes') baseline.distBytes = Number(value);
    else if (key === 'lazy') baseline.lazy.push(value);
    else throw new Error(`bundle baseline: unknown line "${line}"`);
  }
  if (!Number.isFinite(baseline.entryBytes) || !Number.isFinite(baseline.distBytes))
    throw new Error('bundle baseline: missing byte counts');
  return baseline;
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .map((entry) => join(directory, entry))
    .filter((path) => statSync(path).isFile());
}

export function measureBundle(dist: string): BundleSizes {
  const entries = [
    ...readFileSync(join(dist, 'index.html'), 'utf8').matchAll(
      /<script[^>]*\ssrc="\/?([^"]+\.js)"/g
    ),
  ].map((match) => match[1] ?? '');
  if (entries.length === 0) throw new Error('dist/index.html loads no script');
  const files = filesUnder(dist);
  return {
    entryBytes: entries.reduce((sum, entry) => sum + statSync(join(dist, entry)).size, 0),
    distBytes: files.reduce((sum, path) => sum + statSync(path).size, 0),
    chunks: files
      .filter((path) => path.endsWith('.js'))
      .map((path) => path.slice(path.lastIndexOf('/') + 1)),
  };
}

export const BELOW_TOLERANCE = 0.001;

function sizeFailures(label: string, size: number, recorded: number): string[] {
  if (size > recorded) return [`${label} is ${size} B, above its baseline ${recorded} B`];
  if (size < recorded * (1 - BELOW_TOLERANCE))
    return [
      `${label} is ${size} B, more than ${BELOW_TOLERANCE * 100}% below its baseline ${recorded} B; lower the baseline in this change`,
    ];
  return [];
}

export function budgetFailures(baseline: BundleBaseline, sizes: BundleSizes): string[] {
  const failures = [
    ...sizeFailures('the entry chunk', sizes.entryBytes, baseline.entryBytes),
    ...sizeFailures('dist/', sizes.distBytes, baseline.distBytes),
  ];
  for (const name of baseline.lazy) {
    const chunk = new RegExp(
      `^${name.replace(/[^a-z0-9]/gi, (char) => `\\${char}`)}-[0-9a-f]+\\.js$`
    );
    if (!sizes.chunks.some((file) => chunk.test(file)))
      failures.push(`${name} has no chunk of its own: it was pulled into the entry chunk`);
  }
  return failures;
}

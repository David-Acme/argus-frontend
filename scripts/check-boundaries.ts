import { join } from 'node:path';
import { cycles, edgesOf, graphOf } from './lib/boundaries/graph';
import {
  isDeepImport,
  isRouteShapeViolation,
  layerViolations,
  singleConsumerViolations,
  sliceOf,
} from './lib/boundaries/rules';
import {
  compareCounts,
  compareLists,
  formatCounts,
  readCounts,
  readLines,
  report,
  type Counts,
} from './lib/ratchet';
import { listFiles, ROOT } from './lib/source-files';

const BASELINE = 'scripts/lib/boundaries-baseline.txt';
const CYCLES = 'scripts/lib/cycle-baseline.txt';
const CYCLE_METRICS = ['file-cycle', 'slice-cycle'];

function usage(): never {
  console.log(`usage: bun scripts/check-boundaries.ts [--print | --print-cycles | --list]

Checks the import boundaries of src/, each of these at 0:
  app     imports features only through features/<name>/index and never core/database or core/services
  feature imports another feature only through its index
  core    never imports features or shared/components
  shared  never imports features
  shared  modules outside the design system (components/ui, components/layout, ui/, theme/) need two or more consumers
and these against ${BASELINE} (a count above or below its baseline fails):
  deep-import   an import into another slice's internals instead of its index
  file-cycle    a strongly connected component of runtime imports between files
  slice-cycle   a strongly connected component of runtime imports between slices
  route-shape   a route file under src/app that is not a one-line re-export
The members of every cycle are compared one by one with ${CYCLES}: a file or slice that
joins a cycle fails, and one that leaves it must leave the list in the same change.
Type-only imports and lazy import() calls are not cycle edges; require() is.
  --print         print the current counts in the baseline's format
  --print-cycles  print the current cycle members in ${CYCLES}'s format
  --list   print every counted finding`);
  process.exit(0);
}

function findings(files: readonly string[]): { layers: string[]; counted: Map<string, string[]> } {
  const edges = files.flatMap(edgesOf);
  const layers = [
    ...new Set([...edges.flatMap(layerViolations), ...singleConsumerViolations(files, edges)]),
  ].sort();
  const counted = new Map<string, string[]>([
    ['deep-import', edges.filter(isDeepImport).map((edge) => `${edge.from} -> ${edge.to}`)],
    ['file-cycle', cycles(graphOf(edges, (file) => file)).map((component) => component.join(' '))],
    ['slice-cycle', cycles(graphOf(edges, sliceOf)).map((component) => component.join(' '))],
    ['route-shape', files.filter(isRouteShapeViolation)],
  ]);
  return { layers, counted };
}

function cycleMembers(counted: ReadonlyMap<string, string[]>): string[] {
  return CYCLE_METRICS.flatMap((metric) =>
    (counted.get(metric) ?? []).flatMap((component) =>
      component.split(' ').map((member) => `${metric} ${member}`)
    )
  ).sort();
}

function main(): void {
  if (process.argv.includes('--help')) usage();
  const files = listFiles('src');
  const { layers, counted } = findings(files);
  const counts: Counts = new Map([...counted].map(([metric, list]) => [metric, list.length]));
  if (process.argv.includes('--print')) return void process.stdout.write(formatCounts(counts));
  if (process.argv.includes('--print-cycles'))
    return void console.log(cycleMembers(counted).join('\n'));
  if (process.argv.includes('--list')) {
    for (const [metric, list] of counted)
      for (const entry of list) console.log(`${metric} | ${entry}`);
  }
  const failures = [
    ...layers.map((violation) => `violation: ${violation}`),
    ...compareCounts(readCounts(join(ROOT, BASELINE)), counts),
    ...compareLists('cycle', readLines(join(ROOT, CYCLES)), cycleMembers(counted)),
  ];
  report('check-boundaries', failures, `${files.length} files, ${layers.length} layer violations`);
}

main();

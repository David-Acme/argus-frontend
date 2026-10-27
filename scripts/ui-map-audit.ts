import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  heightFindings,
  isPhoneWindow,
  type HeightEntry,
} from '../tests/e2e/support/ui-map/height-audit';

function usage(): never {
  console.log(`usage: bun scripts/ui-map-audit.ts [manifest.json] [--table]

Reads the UI map's manifest (default: $ARGUS_UI_MAP_DIR/web/manifest.json) and fails when a
phone-sized capture breaks the height rules: fixed chrome over 22 % of the window, the first
content below 40 %, a sheet with an empty band over 25 %, an interactive element under the tab
bar or outside the window that no scroll can bring out.
  --table  print chrome, first content and sheet numbers per capture as well`);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes('--help')) usage();
const table = args.includes('--table');
const manifest =
  args.find((arg) => !arg.startsWith('--')) ??
  join(process.env.ARGUS_UI_MAP_DIR ?? '../uiux-map', 'web', 'manifest.json');

if (!existsSync(manifest)) {
  console.error(
    `no manifest at ${manifest}: run ARGUS_UI_MAP_VIEWPORTS=height bun run ui-map first`
  );
  process.exit(2);
}

const entries = (JSON.parse(readFileSync(manifest, 'utf8')) as HeightEntry[]).filter(
  (entry) => entry.height && !entry.fullPage && isPhoneWindow(entry.viewport)
);

if (table) {
  for (const entry of entries.toSorted((a, b) => a.file.localeCompare(b.file))) {
    const { h } = entry.viewport;
    const audit = entry.height;
    if (!audit) continue;
    const first =
      audit.firstContent === null
        ? '-'
        : `${audit.firstContent} (${Math.round((audit.firstContent / h) * 100)}%)`;
    const sheet = audit.sheet ? `${audit.sheet.height}/${audit.sheet.emptyBand}` : '-';
    console.log(
      [
        entry.file,
        `chrome ${audit.chrome} (${Math.round((audit.chrome / h) * 100)}%)`,
        `first ${first}`,
        `sheet ${sheet}`,
      ].join('\t')
    );
  }
}

const findings = entries.flatMap(heightFindings);
for (const finding of findings) console.log(`${finding.rule}\t${finding.file}\t${finding.detail}`);
console.log(`${entries.length} phone captures, ${findings.length} height findings`);
process.exit(findings.length > 0 ? 1 : 0);

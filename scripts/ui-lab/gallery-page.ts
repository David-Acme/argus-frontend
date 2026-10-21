import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type CaseResult = {
  component: string;
  shot: string;
  caseId: string;
  mismatch: number | null;
  file: string;
};

export type StageShot = { component: string; shot: string; file: string };

export type GalleryRun = {
  out: string;
  only: readonly string[] | undefined;
  stages: readonly StageShot[];
  results: readonly CaseResult[];
};

function earlier<T extends { component: string }>(file: string, only: readonly string[]): T[] {
  if (!existsSync(file)) return [];
  const rows = JSON.parse(readFileSync(file, 'utf8')) as T[];
  return rows.filter((row) => !only.includes(row.component));
}

export function mergeRun({ out, only, stages, results }: GalleryRun) {
  if (!only) return { stages, results };
  return {
    stages: [...earlier<StageShot>(join(out, 'stages.json'), only), ...stages],
    results: [...earlier<CaseResult>(join(out, 'results.json'), only), ...results],
  };
}

const COLUMNS = ['360-light', '360-dark', '768-light', '768-dark', '1280-light', '1280-dark'];

function cell(results: readonly CaseResult[], component: string, column: string): string {
  const values = results
    .filter((row) => row.component === component && row.shot === `${column}-default`)
    .flatMap((row) => (row.mismatch === null ? [] : [row.mismatch]));
  if (values.length === 0) return '—';
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `${mean.toFixed(2)} (${Math.max(...values).toFixed(2)})`;
}

function summary(components: readonly string[], results: readonly CaseResult[]): string {
  const head = COLUMNS.map((column) => `<th>${column}</th>`).join('');
  const rows = components
    .map(
      (component) =>
        `<tr><th><a href="#${escape(component)}">${escape(component)}</a></th>${COLUMNS.map((column) => `<td>${cell(results, component, column)}</td>`).join('')}</tr>`
    )
    .join('\n');
  return `<table><caption>Mismatch %, default mode: mean (max) over the cases with a prototype counterpart</caption><tr><th>component</th>${head}</tr>${rows}</table>`;
}

const escape = (text: string): string =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c
  );

function caseRows(results: readonly CaseResult[]): string {
  return results
    .map(
      (result) =>
        `<figure><figcaption>${escape(result.caseId)} · ${escape(result.shot)} · ${
          result.mismatch === null ? 'no prototype element' : `${result.mismatch}% mismatch`
        }</figcaption><img src="${escape(result.file)}" alt="${escape(result.caseId)}"></figure>`
    )
    .join('\n');
}

function stageRows(stages: readonly StageShot[]): string {
  return stages
    .map(
      (stage) =>
        `<figure><figcaption>${escape(stage.shot)}</figcaption><img src="${escape(stage.file)}" alt="${escape(stage.shot)}"></figure>`
    )
    .join('\n');
}

export function galleryPage(stages: readonly StageShot[], results: readonly CaseResult[]): string {
  const components = [...new Set(stages.map((stage) => stage.component))];
  const sections = components
    .map(
      (component) => `<section id="${escape(component)}"><h2>${escape(component)}</h2>
<h3>Ours | prototype | diff</h3>${caseRows(results.filter((result) => result.component === component))}
<h3>Stage captures</h3>${stageRows(stages.filter((stage) => stage.component === component))}</section>`
    )
    .join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ui-lab gallery</title>
<style>body{font:14px system-ui;margin:16px;background:#f4f1ed}table{border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ccc;padding:4px 8px;text-align:right}figure{display:inline-block;margin:8px;vertical-align:top}img{display:block;border:1px solid #ccc;max-width:100%}</style></head>
<body><h1>ui-lab gallery</h1>${summary(components, results)}${sections}</body></html>`;
}

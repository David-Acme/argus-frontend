export type CaseResult = {
  component: string;
  shot: string;
  caseId: string;
  mismatch: number | null;
  file: string;
};

export type StageShot = { component: string; shot: string; file: string };

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
<style>body{font:14px system-ui;margin:16px;background:#f4f1ed}figure{display:inline-block;margin:8px;vertical-align:top}img{display:block;border:1px solid #ccc;max-width:100%}</style></head>
<body><h1>ui-lab gallery</h1><nav>${components.map((c) => `<a href="#${escape(c)}">${escape(c)}</a>`).join(' · ')}</nav>${sections}</body></html>`;
}

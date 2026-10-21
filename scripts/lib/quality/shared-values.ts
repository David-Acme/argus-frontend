import { existsSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { ROOT, walk } from '../source-files';

const SHARED_VALUE_MEMBERS = ['value', 'modify', 'addListener'];

function compilerOptions(): ts.CompilerOptions {
  const path = join(ROOT, 'tsconfig.json');
  if (!existsSync(path)) return { strict: true, jsx: ts.JsxEmit.ReactJSX, noEmit: true };
  const config = ts.readConfigFile(path, ts.sys.readFile);
  return { ...ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT).options, noEmit: true };
}

function isSharedValue(checker: ts.TypeChecker, node: ts.Expression): boolean {
  const type = checker.getApparentType(checker.getTypeAtLocation(node));
  const members = type.isUnion() ? type.types : [type];
  return members.some((member) =>
    SHARED_VALUE_MEMBERS.every((name) => member.getProperty(name) !== undefined)
  );
}

export function sharedValueReads(files: readonly string[]): Map<string, number> {
  const candidates = files.filter((file) => ts.sys.readFile(join(ROOT, file))?.includes('.value'));
  const program = ts.createProgram(
    candidates.map((file) => join(ROOT, file)),
    compilerOptions()
  );
  const checker = program.getTypeChecker();
  const counts = new Map<string, number>();
  for (const file of candidates) {
    const source = program.getSourceFile(join(ROOT, file));
    if (!source) continue;
    let count = 0;
    walk(source, (node) => {
      if (
        ts.isPropertyAccessExpression(node) &&
        node.name.text === 'value' &&
        isSharedValue(checker, node.expression)
      ) {
        count += 1;
      }
    });
    counts.set(file, count);
  }
  return counts;
}

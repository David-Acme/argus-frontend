const LAB_FLAG = '__ARGUS_UI_LAB__';

export function labAllowed(dev: boolean): boolean {
  return dev || (LAB_FLAG in globalThis && Reflect.get(globalThis, LAB_FLAG) === true);
}

export const log = {
  error(scope: string, message: string, detail?: unknown): void {
    if (detail === undefined) console.error(`[${scope}] ${message}`);
    else console.error(`[${scope}] ${message}`, detail);
  },
  debug(scope: string, ...details: unknown[]): void {
    if (__DEV__) console.log(`[${scope}]`, ...details);
  },
};

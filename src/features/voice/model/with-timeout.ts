export function withTimeout<T>(pending: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('RTC_TOKEN_TIMEOUT')), ms);
  });
  return Promise.race([pending, expired]).finally(() => clearTimeout(timer));
}

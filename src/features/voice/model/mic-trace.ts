export function micTraceReason(publishing: boolean): string {
  return publishing ? 'mic-publishing' : 'mic-stopped';
}

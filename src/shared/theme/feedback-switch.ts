let enabled = true;

export function setFeedbackEnabled(next: boolean): void {
  enabled = next;
}

export function feedbackEnabled(): boolean {
  return enabled;
}

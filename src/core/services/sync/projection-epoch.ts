export class ProjectionEpoch {
  private value = 0;

  get current(): number {
    return this.value;
  }

  advance(): void {
    this.value += 1;
  }

  isCurrent(epoch: number): boolean {
    return epoch === this.value;
  }

  assert(epoch: number): void {
    if (epoch !== this.value) throw new Error('Synchronization cancelled');
  }
}

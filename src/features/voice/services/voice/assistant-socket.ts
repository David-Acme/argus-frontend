export type AssistantSocketOwner = 'voice' | 'chat';

type ClaimListener = (owner: AssistantSocketOwner) => void;

export class AssistantSocket {
  private current: AssistantSocketOwner | null = null;
  private listeners = new Set<ClaimListener>();

  get owner(): AssistantSocketOwner | null {
    return this.current;
  }

  claim(owner: AssistantSocketOwner): void {
    const previous = this.current;
    this.current = owner;
    if (previous === owner) return;
    for (const listener of this.listeners) listener(owner);
  }

  onClaim(listener: ClaimListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const assistantSocket = new AssistantSocket();

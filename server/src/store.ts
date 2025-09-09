import { ClientId, ClientState } from './types';

export class InMemoryStore {
  private clients = new Map<ClientId, ClientState>();

  get(clientId: ClientId): ClientState {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, {
        selected: new Set<number>(),
        rank: new Map<number, number>()
      });
    }
    return this.clients.get(clientId)!;
  }

  reset(clientId: ClientId): void {
    this.clients.set(clientId, {
      selected: new Set<number>(),
      rank: new Map<number, number>()
    });
  }

  // For testing purposes
  clear(): void {
    this.clients.clear();
  }
}

export const store = new InMemoryStore();


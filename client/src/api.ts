export interface ItemDTO {
  id: number;
  label: string;
  selected: boolean;
}

export interface ItemsResponse {
  items: ItemDTO[];
  offset: number;
  limit: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  code?: number;
  message?: string;
  data?: T;
}

export interface SelectionPayload {
  ids: number[];
  selected: boolean;
}

export interface ReorderPayload {
  movedId: number;
  targetId: number;
  position: 'before' | 'after';
}

export interface StateResponse {
  selectedCount: number;
  rankCount: number;
  selectedItems: number[];
}

class ApiClient {
  private baseUrl = '/api';
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.clientId,
        ...options.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data.data as T;
  }

  async getItems(
    params: { q?: string; offset?: number; limit?: number },
    signal?: AbortSignal
  ): Promise<ItemsResponse> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.offset) searchParams.set('offset', params.offset.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const endpoint = `/items?${searchParams.toString()}`;
    return this.request<ItemsResponse>(endpoint, { signal: signal || null });
  }

  async toggleSelection(payload: SelectionPayload): Promise<{ selectedCount: number }> {
    return this.request<{ selectedCount: number }>('/selection/toggle', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async postOrder(payload: ReorderPayload): Promise<void> {
    return this.request<void>('/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getState(): Promise<StateResponse> {
    return this.request<StateResponse>('/state');
  }

  async reset(): Promise<void> {
    return this.request<void>('/reset', {
      method: 'POST',
    });
  }

  async setOrder(itemIds: number[]): Promise<void> {
    console.log('🌐 API: setOrder called with itemIds:', itemIds);
    console.log('🌐 API: Sending POST to /order/set');
    
    const result = await this.request<void>('/order/set', {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    });
    
    console.log('🌐 API: setOrder completed successfully');
    return result;
  }

  async setItemPosition(payload: {
    movedId: number;
    newPosition: number;
    beforeItemId?: number | null;
    afterItemId?: number | null;
  }): Promise<void> {
    return this.request<void>('/order/position', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export function createApiClient(clientId: string): ApiClient {
  return new ApiClient(clientId);
}

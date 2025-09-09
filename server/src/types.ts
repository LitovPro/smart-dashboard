export type ClientId = string;

export interface ItemDTO {
  id: number;
  label: string;
  selected: boolean;
}

export interface QueryParams {
  q?: string;
  offset?: number;
  limit?: number;
}

export interface ClientState {
  selected: Set<number>;
  rank: Map<number, number>;
}

export type InsertPosition = 'before' | 'after';

export interface ReorderPayload {
  movedId: number;
  targetId: number;
  position: InsertPosition;
  beforeId?: number | null;
  afterId?: number | null;
}

export interface SelectionPayload {
  ids: number[];
  selected: boolean;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  code?: number;
  message?: string;
  data?: T;
}

export interface ItemsResponse {
  items: ItemDTO[];
  offset: number;
  limit: number;
}

export interface StateResponse {
  selectedCount: number;
  rankCount: number;
}


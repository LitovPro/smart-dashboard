import { ClientId, ClientState, ItemDTO, ReorderPayload } from './types';
import { store } from './store';
import { HttpError } from './errors';

const MAX_ID = 1_000_000;
const EPS = 1e-12;

/**
 * Check if an ID matches the search query
 */
export function matchesQuery(id: number, q?: string): boolean {
  if (!q) return true;
  return String(id).includes(q);
}

/**
 * Get the rank for an ID, defaulting to the ID itself
 */
export function getRank(state: ClientState, id: number): number {
  return state.rank.get(id) ?? id;
}

/**
 * Choose a rank between two bounds
 */
export function chooseBetween(lower?: number, upper?: number): number {
  if (lower !== undefined && upper !== undefined) {
    return (lower + upper) / 2;
  }
  if (upper !== undefined) {
    return upper - 1;
  }
  if (lower !== undefined) {
    return lower + 1;
  }
  return 0;
}

/**
 * Renormalize ranks in a window to prevent rank collisions
 */
export function renormalizeWindow(
  state: ClientState,
  idsInOrder: number[],
  lower?: number,
  upper?: number
): void {
  if (idsInOrder.length === 0) return;

  const hasBounds = lower !== undefined && upper !== undefined;
  const gap = hasBounds ? upper - lower : Infinity;

  if (hasBounds && gap > EPS) {
    // Use fractional spacing within the gap
    const step = gap / (idsInOrder.length + 1);
    idsInOrder.forEach((id, index) => {
      state.rank.set(id, lower! + step * (index + 1));
    });
  } else {
    // Use integer spacing
    let baseRank: number;
    if (upper !== undefined) {
      baseRank = upper - idsInOrder.length;
    } else if (lower !== undefined) {
      baseRank = lower + 1;
    } else {
      baseRank = 0;
    }

    idsInOrder.forEach((id, index) => {
      state.rank.set(id, baseRank + index);
    });
  }
}

/**
 * Apply INSERT-style drag and drop reordering
 */
export function applyReorderInsert(clientId: ClientId, payload: ReorderPayload): void {
  const { movedId, targetId, position, beforeId, afterId } = payload;

  // Validation
  if (movedId < 1 || movedId > MAX_ID || targetId < 1 || targetId > MAX_ID) {
    throw new HttpError(400, 'Invalid ID: must be between 1 and 1,000,000');
  }
  if (movedId === targetId) {
    throw new HttpError(400, 'Cannot move item to itself');
  }

  const state = store.get(clientId);

  // Calculate bounds based on position
  let lower: number | undefined;
  let upper: number | undefined;

  if (position === 'before') {
    lower = beforeId && beforeId !== movedId ? getRank(state, beforeId) : undefined;
    upper = getRank(state, targetId);
  } else {
    lower = getRank(state, targetId);
    upper = afterId && afterId !== movedId ? getRank(state, afterId) : undefined;
  }

  // Check if we need to renormalize
  const hasBothBounds = lower !== undefined && upper !== undefined;
  const needsRenormalization = hasBothBounds && (upper! - lower!) < EPS;

  if (needsRenormalization) {
    // Collect IDs in the affected window
    const idsInOrder: number[] = [];
    
    // Add beforeId if it exists and is not the moved item
    if (beforeId && beforeId !== movedId) {
      idsInOrder.push(beforeId);
    }
    
    // Add moved and target items in the correct order
    if (position === 'before') {
      idsInOrder.push(movedId, targetId);
    } else {
      idsInOrder.push(targetId, movedId);
    }
    
    // Add afterId if it exists and is not the moved item
    if (afterId && afterId !== movedId) {
      idsInOrder.push(afterId);
    }

    renormalizeWindow(state, idsInOrder, lower, upper);
  } else {
    // Simple case: assign new rank
    const newRank = chooseBetween(lower, upper);
    state.rank.set(movedId, newRank);
    
    // Also ensure target has a rank if it doesn't have one
    if (!state.rank.has(targetId)) {
      state.rank.set(targetId, targetId);
    }
  }
}

/**
 * List items with pagination, filtering, and sorting
 * This function efficiently handles 1M items without allocating large arrays
 */
export function listPage(
  clientId: ClientId,
  q: string | undefined,
  offset: number,
  limit: number
): ItemDTO[] {
  const state = store.get(clientId);
  const items: ItemDTO[] = [];
  let seen = 0;

  // Stream A: Override items (items with custom ranks)
  const overrides: Array<{ id: number; rank: number }> = [];
  for (const [id, rank] of state.rank.entries()) {
    if (rank !== id && matchesQuery(id, q)) {
      overrides.push({ id, rank });
    }
  }
  overrides.sort((a, b) => a.rank - b.rank || a.id - b.id);

  // Stream B: Default items (items without custom ranks)
  let defaultPointer = 1;
  const overridesSet = new Set(overrides.map(o => o.id));

  // Merge streams
  let overrideIndex = 0;
  
  while (items.length < limit) {
    let nextItem: { id: number; rank: number } | null = null;

    // Check override stream
    if (overrideIndex < overrides.length) {
      const override = overrides[overrideIndex];
      nextItem = override || null;
    }

    // Check default stream
    while (defaultPointer <= MAX_ID) {
      if (!overridesSet.has(defaultPointer) && matchesQuery(defaultPointer, q)) {
        const defaultItem = { id: defaultPointer, rank: defaultPointer };
        
        if (!nextItem || defaultItem.rank < nextItem.rank || 
            (defaultItem.rank === nextItem.rank && defaultItem.id < nextItem.id)) {
          nextItem = defaultItem;
        }
        break;
      }
      defaultPointer++;
    }

    if (!nextItem) break;

    // Skip items until we reach the offset
    if (seen < offset) {
      seen++;
      if (nextItem.id === overrides[overrideIndex]?.id) {
        overrideIndex++;
      } else {
        defaultPointer++;
      }
      continue;
    }

    // Add item to results
    items.push({
      id: nextItem.id,
      label: `Item ${nextItem.id}`,
      selected: state.selected.has(nextItem.id)
    });

    // Advance the appropriate stream
    if (nextItem.id === overrides[overrideIndex]?.id) {
      overrideIndex++;
    } else {
      defaultPointer++;
    }
  }

  return items;
}

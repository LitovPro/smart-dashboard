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
 * Get predecessor item by rank (among overrides, or default neighbor)
 */
export function getPredByRank(state: ClientState, targetRank: number, excludeId?: number): {id: number, rank: number} | null {
  let pred: {id: number, rank: number} | null = null;

  // Find max rank < targetRank among overrides
  for (const [id, rank] of state.rank.entries()) {
    if (id !== excludeId && rank !== id && rank < targetRank) {
      if (!pred || rank > pred.rank) {
        pred = { id, rank };
      }
    }
  }

  // If no override pred found, use default pred (targetId - 1)
  if (!pred && targetRank > 1) {
    const defaultPredId = Math.floor(targetRank) - 1;
    if (defaultPredId >= 1 && defaultPredId <= MAX_ID) {
      pred = { id: defaultPredId, rank: defaultPredId };
    }
  }

  // Special case: if targetRank is 1 and no pred found, we need to handle first position
  if (!pred && targetRank === 1) {
    return null; // Explicitly return null to indicate no predecessor
  }

  return pred;
}

/**
 * Get successor item by rank (among overrides, or default neighbor)
 */
export function getSuccByRank(state: ClientState, targetRank: number, excludeId?: number): {id: number, rank: number} | null {
  let succ: {id: number, rank: number} | null = null;

  // Find min rank > targetRank among overrides
  for (const [id, rank] of state.rank.entries()) {
    if (id !== excludeId && rank !== id && rank > targetRank) {
      if (!succ || rank < succ.rank) {
        succ = { id, rank };
      }
    }
  }

  // If no override succ found, use default succ (targetId + 1)
  if (!succ && targetRank < MAX_ID) {
    const defaultSuccId = Math.floor(targetRank) + 1;
    if (defaultSuccId >= 1 && defaultSuccId <= MAX_ID) {
      succ = { id: defaultSuccId, rank: defaultSuccId };
    }
  }

  return succ;
}

/**
 * Choose a rank between two bounds, handling dense intervals
 */
export function chooseBetween(lower?: number, upper?: number): number {
  if (lower !== undefined && upper !== undefined) {
    if (upper - lower >= EPS) {
      return (lower + upper) / 2;
    } else {
      // Very small interval - place very close to the bounds
      // For before: place just below upper, for after: place just above lower
      return (lower + upper) / 2;
    }
  }
  if (upper !== undefined) {
    return upper - 0.0001;
  }
  if (lower !== undefined) {
    return lower + 0.0001;
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
 * Apply INSERT-style drag and drop reordering with global rank calculation
 */
export function applyReorderInsert(clientId: ClientId, payload: ReorderPayload): void {
  const { movedId, targetId, position } = payload;

  console.log('🖥️ SERVER: === APPLY REORDER INSERT ===');
  console.log('🖥️ SERVER: movedId:', movedId, 'targetId:', targetId, 'position:', position);

  // Validation
  if (movedId < 1 || movedId > MAX_ID || targetId < 1 || targetId > MAX_ID) {
    throw new HttpError(400, 'Invalid ID: must be between 1 and 1,000,000');
  }
  if (movedId === targetId) {
    throw new HttpError(400, 'Cannot move item to itself');
  }

  const state = store.get(clientId);
  const targetRank = getRank(state, targetId);

  console.log('🖥️ SERVER: targetRank:', targetRank);
  console.log('🖥️ SERVER: existing ranks before:', Array.from(state.rank.entries()));

  // Calculate bounds based on position and target rank
  let lower: number | undefined;
  let upper: number | undefined;

  if (position === 'before') {
    // For 'before': we want to place movedId right before target
    // upper = targetRank
    // lower = rank of the element that should be right before target
    upper = targetRank;

    // Find what should be the predecessor of target (excluding movedId if it's currently there)
    const pred = getPredByRank(state, targetRank, movedId);

    if (pred && pred.id !== movedId) {
      // If predecessor has a custom rank (not equal to its id), use it
      if (pred.rank !== pred.id) {
        lower = pred.rank;
      } else {
        // Predecessor has default rank, use a value very close to target rank
        // This ensures moved element stays very close to target
        lower = targetRank - 0.001;
      }
    } else {
      // No predecessor found, or predecessor is movedId itself
      // Use a value very close to target rank from below
      lower = targetRank - 0.001;
    }

    console.log('🖥️ SERVER: position=before, targetRank:', targetRank, 'pred:', pred, 'lower:', lower, 'upper:', upper);
  } else {
    // For 'after': we want to place movedId right after target
    // lower = targetRank
    // upper = rank of the element that should be right after target
    lower = targetRank;

    // Find what should be the successor of target (excluding movedId if it's currently there)
    const succ = getSuccByRank(state, targetRank, movedId);

    if (succ && succ.id !== movedId) {
      // If successor has a custom rank (not equal to its id), use it
      if (succ.rank !== succ.id) {
        upper = succ.rank;
      } else {
        // Successor has default rank, use a value very close to target rank
        // This ensures moved element stays very close to target
        upper = targetRank + 0.001;
      }
    } else {
      // No successor found, or successor is movedId itself
      // Use a value very close to target rank from above
      upper = targetRank + 0.001;
    }

    console.log('🖥️ SERVER: position=after, targetRank:', targetRank, 'succ:', succ, 'lower:', lower, 'upper:', upper);
  }

  // Check if we need to renormalize (dense interval)
  const hasBothBounds = lower !== undefined && upper !== undefined;
  const needsRenormalization = hasBothBounds && (upper! - lower!) < EPS;

  console.log('🖥️ SERVER: hasBothBounds:', hasBothBounds, 'needsRenormalization:', needsRenormalization);

  if (needsRenormalization) {
    // Collect IDs in the affected window and renormalize
    const idsInOrder: number[] = [];

    if (position === 'before') {
      // Window: [pred?, moved, target, succ?]
      const pred = getPredByRank(state, targetRank, movedId);
      if (pred) idsInOrder.push(pred.id);
      idsInOrder.push(movedId, targetId);
      const succ = getSuccByRank(state, targetRank, movedId);
      if (succ) idsInOrder.push(succ.id);
    } else {
      // Window: [pred?, target, moved, succ?]
      const pred = getPredByRank(state, targetRank, movedId);
      if (pred) idsInOrder.push(pred.id);
      idsInOrder.push(targetId, movedId);
      const succ = getSuccByRank(state, targetRank, movedId);
      if (succ) idsInOrder.push(succ.id);
    }

    console.log('🖥️ SERVER: renormalizing window, idsInOrder:', idsInOrder, 'lower:', lower, 'upper:', upper);
    renormalizeWindow(state, idsInOrder, lower, upper);
  } else {
    // Simple case: assign new rank
    const newRank = chooseBetween(lower, upper);
    console.log('🖥️ SERVER: simple case, newRank:', newRank);
    state.rank.set(movedId, newRank);

    // Ensure target has a rank if it doesn't have one
    if (!state.rank.has(targetId)) {
      state.rank.set(targetId, targetId);
    }
  }

  console.log('🖥️ SERVER: existing ranks after:', Array.from(state.rank.entries()));
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

  console.log('🖥️ SERVER: listPage called with q:', q, 'offset:', offset, 'limit:', limit);
  console.log('🖥️ SERVER: current ranks:', Array.from(state.rank.entries()));

  // Stream A: Override items (items with custom ranks)
  const overrides: Array<{ id: number; rank: number }> = [];
  for (const [id, rank] of state.rank.entries()) {
    if (rank !== id && matchesQuery(id, q)) {
      overrides.push({ id, rank });
    }
  }
  overrides.sort((a, b) => a.rank - b.rank || a.id - b.id);

  console.log('🖥️ SERVER: overrides:', overrides);

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

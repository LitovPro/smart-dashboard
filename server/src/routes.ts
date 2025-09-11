import { Router, Request, Response } from 'express';
import { requireClientId, parsePagination } from './util/http';
import { listPage, applyReorderInsert } from './ordering';
import { store } from './store';
import { HttpError } from './errors';
import { ApiResponse, ItemsResponse, StateResponse, SelectionPayload, ReorderPayload } from './types';

const router = Router();

// Middleware to require client ID for all API routes
router.use('/api', (req: Request, _res: Response, next) => {
  try {
    requireClientId(req);
    next();
  } catch (error) {
    next(error);
  }
});

// GET /api/items - List items with pagination and filtering
router.get('/api/items', (req: Request, res: Response, next) => {
  try {
    const clientId = requireClientId(req);
    const { q, offset, limit } = parsePagination(req);
    
    console.log('🖥️ SERVER: /api/items called');
    console.log('🖥️ SERVER: Client ID:', clientId);
    console.log('🖥️ SERVER: Query:', q);
    console.log('🖥️ SERVER: Offset:', offset);
    console.log('🖥️ SERVER: Limit:', limit);
    
    const items = listPage(clientId, q, offset!, limit!);
    
    console.log('🖥️ SERVER: Returning items count:', items.length);
    console.log('🖥️ SERVER: Items IDs:', items.map(item => item.id));
    
    const response: ApiResponse<ItemsResponse> = {
      ok: true,
      data: {
        items,
        offset: offset!,
        limit: limit!
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('🖥️ SERVER: Error in /api/items:', error);
    next(error);
  }
});

// POST /api/selection/toggle - Toggle selection for multiple items
router.post('/api/selection/toggle', (req: Request, res: Response, next) => {
  try {
    const clientId = requireClientId(req);
    const { ids, selected }: SelectionPayload = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new HttpError(400, 'ids must be a non-empty array');
    }
    
    if (ids.length > 1000) {
      throw new HttpError(400, 'Too many ids: maximum 1000 allowed');
    }
    
    if (typeof selected !== 'boolean') {
      throw new HttpError(400, 'selected must be a boolean');
    }
    
    // Validate all IDs
    for (const id of ids) {
      if (typeof id !== 'number' || id < 1 || id > 1_000_000) {
        throw new HttpError(400, `Invalid ID: ${id} must be between 1 and 1,000,000`);
      }
    }
    
    const state = store.get(clientId);
    
    if (selected) {
      ids.forEach(id => state.selected.add(id));
    } else {
      ids.forEach(id => state.selected.delete(id));
    }
    
    const response: ApiResponse<{ selectedCount: number }> = {
      ok: true,
      data: {
        selectedCount: state.selected.size
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/order - Apply drag and drop reordering
router.post('/api/order', (req: Request, res: Response, next) => {
  try {
    const clientId = requireClientId(req);
    const payload: ReorderPayload = req.body;

    const { movedId, targetId, position } = payload;

    if (typeof movedId !== 'number' || typeof targetId !== 'number') {
      throw new HttpError(400, 'movedId and targetId must be numbers');
    }

    if (position !== 'before' && position !== 'after') {
      throw new HttpError(400, 'position must be "before" or "after"');
    }

    // Validate IDs are in valid range
    if (movedId < 1 || movedId > 1_000_000 || targetId < 1 || targetId > 1_000_000) {
      throw new HttpError(400, 'IDs must be between 1 and 1,000,000');
    }

    applyReorderInsert(clientId, payload);

    const response: ApiResponse = {
      ok: true
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/state - Get current client state summary
router.get('/api/state', (req: Request, res: Response, next) => {
  try {
    const clientId = requireClientId(req);
    const state = store.get(clientId);
    
    const response: ApiResponse<StateResponse> = {
      ok: true,
      data: {
        selectedCount: state.selected.size,
        rankCount: state.rank.size,
        selectedItems: Array.from(state.selected)
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/reset - Reset client state
router.post('/api/reset', (req: Request, res: Response, next) => {
  try {
    const clientId = requireClientId(req);
    store.reset(clientId);
    
    const response: ApiResponse = {
      ok: true
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/order/set - Set the entire order of items
router.post('/api/order/set', (req: Request, res: Response, next) => {
  try {
    const clientId = requireClientId(req);
    const { itemIds }: { itemIds: number[] } = req.body;
    
    console.log('🖥️ SERVER: /api/order/set called');
    console.log('🖥️ SERVER: Client ID:', clientId);
    console.log('🖥️ SERVER: Received itemIds:', itemIds);
    console.log('🖥️ SERVER: ItemIds count:', itemIds?.length);
    
    if (!Array.isArray(itemIds)) {
      throw new HttpError(400, 'itemIds must be an array');
    }
    
    if (itemIds.length === 0) {
      throw new HttpError(400, 'itemIds cannot be empty');
    }
    
    // Validate all IDs
    for (const id of itemIds) {
      if (typeof id !== 'number' || id < 1 || id > 1_000_000) {
        throw new HttpError(400, `Invalid ID: ${id} must be between 1 and 1,000,000`);
      }
    }
    
    const state = store.get(clientId);
    
    console.log('🖥️ SERVER: Current ranks before update:', Array.from(state.rank.entries()));
    
    // Clear existing ranks
    state.rank.clear();
    
    // Set new ranks based on the order
    itemIds.forEach((id, index) => {
      state.rank.set(id, index + 1);
    });
    
    console.log('🖥️ SERVER: New ranks after update:', Array.from(state.rank.entries()));
    console.log('🖥️ SERVER: Order set successfully for client:', clientId);
    
    const response: ApiResponse = {
      ok: true
    };
    
    res.json(response);
  } catch (error) {
    console.error('🖥️ SERVER: Error in /api/order/set:', error);
    next(error);
  }
});

// POST /api/order/position - Set exact position for a single item
router.post('/api/order/position', (req: Request, res: Response, next) => {
  try {
    const clientId = requireClientId(req);
    const { movedId, newPosition, beforeItemId, afterItemId } = req.body;
    
    console.log('🖥️ SERVER: /api/order/position called');
    console.log('🖥️ SERVER: Client ID:', clientId);
    console.log('🖥️ SERVER: movedId:', movedId);
    console.log('🖥️ SERVER: newPosition:', newPosition);
    console.log('🖥️ SERVER: beforeItemId:', beforeItemId);
    console.log('🖥️ SERVER: afterItemId:', afterItemId);
    
    if (typeof movedId !== 'number' || movedId < 1 || movedId > 1_000_000) {
      throw new HttpError(400, 'movedId must be a number between 1 and 1,000,000');
    }
    
    if (typeof newPosition !== 'number' || newPosition < 0) {
      throw new HttpError(400, 'newPosition must be a non-negative number');
    }
    
    if (beforeItemId !== null && beforeItemId !== undefined && (typeof beforeItemId !== 'number' || beforeItemId < 1 || beforeItemId > 1_000_000)) {
      throw new HttpError(400, 'beforeItemId must be null, undefined, or a number between 1 and 1,000,000');
    }
    
    if (afterItemId !== null && afterItemId !== undefined && (typeof afterItemId !== 'number' || afterItemId < 1 || afterItemId > 1_000_000)) {
      throw new HttpError(400, 'afterItemId must be null, undefined, or a number between 1 and 1,000,000');
    }
    
    const state = store.get(clientId);
    
    console.log('🖥️ SERVER: Current ranks before update:', Array.from(state.rank.entries()));
    
    // SMART POSITIONING: Use context to determine the best rank
    let newRank: number;
    
    if (beforeItemId && afterItemId) {
      // Position between two items - use their global ranks
      const beforeRank = state.rank.get(beforeItemId) || beforeItemId;
      const afterRank = state.rank.get(afterItemId) || afterItemId;
      
      console.log('🖥️ SERVER: Positioning between items - beforeRank:', beforeRank, 'afterRank:', afterRank);
      
      // Position the moved item right after the beforeItem
      newRank = beforeRank + 1;
      console.log('🖥️ SERVER: Positioning after beforeItem - newRank:', newRank);
      
      // Shift all items with rank >= newRank to make room
      const itemsToShift = Array.from(state.rank.entries())
        .filter(([itemId, rank]) => itemId !== movedId && rank >= newRank)
        .sort((a, b) => a[1] - b[1]);
      
      console.log('🖥️ SERVER: Items to shift:', itemsToShift);
      
      // Shift items to make room
      for (const [itemId, rank] of itemsToShift) {
        state.rank.set(itemId, rank + 1);
      }
    } else if (beforeItemId) {
      // Position after an item
      const beforeRank = state.rank.get(beforeItemId) || beforeItemId;
      newRank = beforeRank + 0.5;
      console.log('🖥️ SERVER: Positioning after item - beforeRank:', beforeRank, 'newRank:', newRank);
    } else if (afterItemId) {
      // Position before an item
      const afterRank = state.rank.get(afterItemId) || afterItemId;
      newRank = afterRank - 0.5;
      console.log('🖥️ SERVER: Positioning before item - afterRank:', afterRank, 'newRank:', newRank);
    } else {
      // Fallback: use position-based ranking
      newRank = newPosition + 1;
      console.log('🖥️ SERVER: Using position-based ranking - newRank:', newRank);
    }
    
    // Ensure the new rank doesn't conflict with existing ranks
    // If it's too close to existing ranks, adjust it
    const existingRanks = Array.from(state.rank.values()).sort((a, b) => a - b);
    let adjusted = false;
    
    for (const existingRank of existingRanks) {
      if (Math.abs(newRank - existingRank) < 0.01) {
        // Find a safe position
        if (existingRank < newRank) {
          newRank = existingRank + 0.01;
        } else {
          newRank = existingRank - 0.01;
        }
        adjusted = true;
        console.log('🖥️ SERVER: Adjusted rank to avoid conflict - newRank:', newRank);
        break;
      }
    }
    
    // If still too close, use a more aggressive adjustment
    if (!adjusted) {
      for (const existingRank of existingRanks) {
        if (Math.abs(newRank - existingRank) < 0.1) {
          newRank = existingRank + 0.1;
          console.log('🖥️ SERVER: Final adjustment to avoid conflict - newRank:', newRank);
          break;
        }
      }
    }
    
    // Set the rank for the moved item
    state.rank.set(movedId, newRank);
    
    console.log('🖥️ SERVER: New ranks after update:', Array.from(state.rank.entries()));
    console.log('🖥️ SERVER: Position set successfully for item', movedId, 'to rank', newRank);
    
    const response: ApiResponse = {
      ok: true
    };
    
    res.json(response);
  } catch (error) {
    console.error('🖥️ SERVER: Error in /api/order/position:', error);
    next(error);
  }
});

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

export default router;

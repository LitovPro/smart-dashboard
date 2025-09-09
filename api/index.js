// Main Vercel serverless function
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory store for 1,000,000 items
let items = [];
let selectedItems = new Set();
let itemRanks = new Map();
let isInitialized = false;

// Initialize items (1 to 1,000,000)
function initializeItems() {
  if (!isInitialized) {
    console.log('Initializing 1,000,000 items...');
    items = [];
    itemRanks.clear();
    
    for (let i = 1; i <= 1000000; i++) {
      items.push({
        id: i,
        label: `Item ${i}`,
        selected: false,
        rank: i
      });
      itemRanks.set(i, i);
    }
    
    isInitialized = true;
    console.log('Items initialized successfully');
  }
}

// Helper function to get items with current selection state
function getItemsWithSelection(items) {
  return items.map(item => ({
    id: item.id,
    label: item.label,
    selected: selectedItems.has(item.id)
  }));
}

// Routes

// GET /api/items - Get paginated items with search
app.get('/api/items', (req, res) => {
  try {
    initializeItems();
    
    const { q, offset = 0, limit = 20 } = req.query;
    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    
    let filteredItems = [...items];
    
    // Apply search filter
    if (q && q.trim()) {
      const searchTerm = q.toLowerCase().trim();
      filteredItems = items.filter(item => 
        item.label.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort by rank (drag & drop order)
    filteredItems.sort((a, b) => {
      const rankA = itemRanks.get(a.id) || a.id;
      const rankB = itemRanks.get(b.id) || b.id;
      return rankA - rankB;
    });
    
    // Apply pagination
    const startIndex = offsetNum;
    const endIndex = startIndex + limitNum;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    
    res.json({
      ok: true,
      data: {
        items: getItemsWithSelection(paginatedItems),
        offset: startIndex,
        limit: limitNum,
        total: filteredItems.length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/items:', error);
    res.status(500).json({
      ok: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/selection/toggle - Toggle item selection
app.post('/api/selection/toggle', (req, res) => {
  try {
    const { ids, selected } = req.body;
    
    if (!Array.isArray(ids)) {
      return res.status(400).json({
        ok: false,
        message: 'ids must be an array'
      });
    }
    
    ids.forEach(id => {
      if (selected) {
        selectedItems.add(id);
      } else {
        selectedItems.delete(id);
      }
    });
    
    res.json({
      ok: true,
      data: {
        selectedCount: selectedItems.size
      }
    });
  } catch (error) {
    console.error('Error in POST /api/selection/toggle:', error);
    res.status(500).json({
      ok: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/order/position - Update item position (drag & drop)
app.post('/api/order/position', (req, res) => {
  try {
    const { movedId, newPosition, beforeItemId, afterItemId } = req.body;
    
    if (!movedId || newPosition === undefined) {
      return res.status(400).json({
        ok: false,
        message: 'movedId and newPosition are required'
      });
    }
    
    // Update rank for the moved item
    itemRanks.set(movedId, newPosition);
    
    res.json({
      ok: true,
      data: {
        movedId,
        newPosition
      }
    });
  } catch (error) {
    console.error('Error in POST /api/order/position:', error);
    res.status(500).json({
      ok: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/state - Get current state
app.get('/api/state', (req, res) => {
  try {
    res.json({
      ok: true,
      data: {
        selectedCount: selectedItems.size,
        rankCount: itemRanks.size,
        totalItems: items.length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/state:', error);
    res.status(500).json({
      ok: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/reset - Reset all data
app.post('/api/reset', (req, res) => {
  try {
    selectedItems.clear();
    itemRanks.clear();
    
    // Reset ranks to original order
    for (let i = 1; i <= 1000000; i++) {
      itemRanks.set(i, i);
    }
    
    res.json({
      ok: true,
      data: {
        message: 'Data reset successfully'
      }
    });
  } catch (error) {
    console.error('Error in POST /api/reset:', error);
    res.status(500).json({
      ok: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      itemsInitialized: isInitialized,
      selectedCount: selectedItems.size
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    ok: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: 'Not found'
  });
});

module.exports = app;

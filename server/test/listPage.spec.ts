import { describe, it, expect, beforeEach } from 'vitest';
import { listPage, applyReorderInsert } from '../src/ordering';
import { store } from '../src/store';

describe('listPage integration tests', () => {
  beforeEach(() => {
    store.clear();
  });

  it('should maintain stable ordering after multiple reorders', () => {
    const clientId = 'test-client';
    
    // Apply several reorders
    applyReorderInsert(clientId, {
      movedId: 10,
      targetId: 5,
      position: 'before',
    });
    
    applyReorderInsert(clientId, {
      movedId: 15,
      targetId: 3,
      position: 'after',
    });
    
    applyReorderInsert(clientId, {
      movedId: 20,
      targetId: 1,
      position: 'before',
    });
    
    const result = listPage(clientId, undefined, 0, 25);
    const ids = result.map(item => item.id);
    
    // Verify deterministic ordering
    const result2 = listPage(clientId, undefined, 0, 25);
    const ids2 = result2.map(item => item.id);
    
    expect(ids).toEqual(ids2);
    
    // Verify logical ordering - items should be in some consistent order
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).toContain(3);
    expect(ids).toContain(4);
    expect(ids).toContain(5);
    expect(ids).toContain(10);
    expect(ids).toContain(15);
    expect(ids).toContain(20);
  });

  it('should handle filtering with custom ranks', () => {
    const clientId = 'test-client';
    
    // Apply reordering
    applyReorderInsert(clientId, {
      movedId: 12,
      targetId: 5,
      position: 'before',
    });
    
    // Search for items containing '1'
    const result = listPage(clientId, '1', 0, 20);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(item => String(item.id).includes('1'))).toBe(true);
    
    // Verify that reordered item appears in correct position
    const ids = result.map(item => item.id);
    const index12 = ids.indexOf(12);
    const index5 = ids.indexOf(5);
    
    if (index12 !== -1 && index5 !== -1) {
      expect(index12).toBeLessThan(index5);
    }
  });

  it('should handle edge case pagination with reordered items', () => {
    const clientId = 'test-client';
    
    // Move item 1000 to the beginning
    applyReorderInsert(clientId, {
      movedId: 1000,
      targetId: 1,
      position: 'before',
    });
    
    // Get first page
    const page1 = listPage(clientId, undefined, 0, 20);
    expect(page1[0]?.id).toBe(1000);
    
    // Get second page - should continue from where first page left off
    const page2 = listPage(clientId, undefined, 20, 20);
    expect(page2.length).toBeGreaterThan(0);
    // The exact order depends on the reordering, but should be consistent
  });

  it('should maintain selection state across reorders', () => {
    const clientId = 'test-client';
    const state = store.get(clientId);
    
    // Select some items
    state.selected.add(5);
    state.selected.add(10);
    state.selected.add(15);
    
    // Apply reordering
    applyReorderInsert(clientId, {
      movedId: 10,
      targetId: 2,
      position: 'before',
    });
    
    const result = listPage(clientId, undefined, 0, 20);
    
    // Find the reordered items
    const item5 = result.find(item => item.id === 5);
    const item10 = result.find(item => item.id === 10);
    const item15 = result.find(item => item.id === 15);
    
    expect(item5?.selected).toBe(true);
    expect(item10?.selected).toBe(true);
    expect(item15?.selected).toBe(true);
  });

  it('should handle complex renormalization scenario', () => {
    const clientId = 'test-client';
    
    // Create a scenario that will trigger renormalization
    // by inserting multiple items in a very narrow gap
    applyReorderInsert(clientId, {
      movedId: 100,
      targetId: 50,
      position: 'before',
      beforeId: 49,
      afterId: 51,
    });
    
    applyReorderInsert(clientId, {
      movedId: 101,
      targetId: 50,
      position: 'before',
      beforeId: 49,
      afterId: 51,
    });
    
    applyReorderInsert(clientId, {
      movedId: 102,
      targetId: 50,
      position: 'before',
      beforeId: 49,
      afterId: 51,
    });
    
    const result = listPage(clientId, undefined, 45, 10);
    const ids = result.map(item => item.id);
    
    // Verify all items are present and in correct order
    expect(ids).toContain(49);
    expect(ids).toContain(100);
    expect(ids).toContain(101);
    expect(ids).toContain(102);
    expect(ids).toContain(50);
    expect(ids).toContain(51);
    
    // Verify ordering
    const index49 = ids.indexOf(49);
    const index100 = ids.indexOf(100);
    const index101 = ids.indexOf(101);
    const index102 = ids.indexOf(102);
    const index50 = ids.indexOf(50);
    const index51 = ids.indexOf(51);
    
    expect(index49).toBeLessThan(index100);
    expect(index100).toBeLessThan(index101);
    expect(index101).toBeLessThan(index102);
    expect(index102).toBeLessThan(index50);
    expect(index50).toBeLessThan(index51);
  });

  it('should handle search with reordered items at boundaries', () => {
    const clientId = 'test-client';
    
    // Move some items to create interesting search results
    applyReorderInsert(clientId, {
      movedId: 999,
      targetId: 1,
      position: 'before',
    });
    
    applyReorderInsert(clientId, {
      movedId: 1000,
      targetId: 2,
      position: 'before',
    });
    
    // Search for items containing '99'
    const result = listPage(clientId, '99', 0, 10);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(item => String(item.id).includes('99'))).toBe(true);
    
    // Verify that 999 appears before other items due to reordering
    const ids = result.map(item => item.id);
    const index999 = ids.indexOf(999);
    const index99 = ids.indexOf(99);
    
    if (index999 !== -1 && index99 !== -1) {
      expect(index999).toBeLessThan(index99);
    }
  });

  it('should handle empty search results', () => {
    const clientId = 'test-client';
    
    // Search for something that doesn't exist
    const result = listPage(clientId, 'nonexistent', 0, 10);
    
    expect(result).toHaveLength(0);
  });

  it('should handle limit larger than available items', () => {
    const clientId = 'test-client';
    
    // Search for items containing '999' (should be few results)
    const result = listPage(clientId, '999', 0, 100);
    
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.every(item => String(item.id).includes('999'))).toBe(true);
  });
});

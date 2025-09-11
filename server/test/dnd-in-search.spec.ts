import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../src/store';
import { applyReorderInsert, listPage, getRank, getPredByRank, getSuccByRank } from '../src/ordering';

// Mock store
vi.mock('../src/store', () => ({
  store: {
    get: vi.fn(),
    reset: vi.fn(),
    getAll: vi.fn(),
  }
}));

describe('DnD in search - global rank ordering', () => {
  const clientId = 'test-client';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store before each test
    store.reset(clientId);
  });

  it('insert in search is global', () => {
    // Create mock state
    const mockState = {
      selected: new Set<number>(),
      rank: new Map<number, number>()
    };

    // Mock store.get to return our test state
    vi.mocked(store.get).mockReturnValue(mockState);

    // Simulate the scenario from the bug report:
    // 1. q="30" - but we don't need search logic for insert, just the global rank behavior
    // 2. insert(130 before 30)
    // 3. insert(230 before 130)

    // Initial state: all items have default ranks (id === rank)
    expect(getRank(mockState, 30)).toBe(30);
    expect(getRank(mockState, 130)).toBe(130);
    expect(getRank(mockState, 230)).toBe(230);

    // Insert 130 before 30
    applyReorderInsert(clientId, { movedId: 130, targetId: 30, position: 'before' });

    // After insert, 130 should have a rank between pred and 30
    const rank130 = getRank(mockState, 130);
    expect(rank130).toBeLessThan(30);
    expect(rank130).toBeGreaterThan(29); // Since 29 is the default pred for 30

    // Insert 230 before 130
    applyReorderInsert(clientId, { movedId: 230, targetId: 130, position: 'before' });

    // After insert, 230 should have a rank between pred and 130's new rank
    const rank230 = getRank(mockState, 230);
    const newRank130 = getRank(mockState, 130);
    expect(rank230).toBeLessThan(newRank130);

    // Check that relative order is preserved: 230 -> 130 -> 30
    expect(rank230).toBeLessThan(newRank130);
    expect(newRank130).toBeLessThan(30);

    // Verify the order persists in listing
    const items = listPage(clientId, undefined, 0, 50);
    const relevantItems = items.filter(item => [230, 130, 30].includes(item.id));
    const ids = relevantItems.map(item => item.id);

    // Should find all three items in the correct relative order
    expect(ids).toContain(230);
    expect(ids).toContain(130);
    expect(ids).toContain(30);

    // Check relative positions
    const pos230 = ids.indexOf(230);
    const pos130 = ids.indexOf(130);
    const pos30 = ids.indexOf(30);

    expect(pos230).toBeLessThan(pos130);
    expect(pos130).toBeLessThan(pos30);
  });

  it('dense interval renormalizes', () => {
    const mockState = {
      selected: new Set<number>(),
      rank: new Map<number, number>()
    };

    vi.mocked(store.get).mockReturnValue(mockState);

    // Create a dense interval scenario
    // Set up ranks that create a very narrow gap
    mockState.rank.set(100, 30.0001);
    mockState.rank.set(101, 30.0002);

    // Try to insert 102 before 101 - this should trigger renormalization
    applyReorderInsert(clientId, { movedId: 102, targetId: 101, position: 'before' });

    // After renormalization, all three should have distinct ranks
    const rank100 = getRank(mockState, 100);
    const rank101 = getRank(mockState, 101);
    const rank102 = getRank(mockState, 102);

    expect(rank100).toBeLessThan(rank102);
    expect(rank102).toBeLessThan(rank101);

    // Verify the order persists
    const items = listPage(clientId, undefined, 0, 50);
    const relevantItems = items.filter(item => [100, 101, 102].includes(item.id));
    const ids = relevantItems.map(item => item.id);

    expect(ids).toEqual([100, 102, 101]);
  });

  it('move to first position works correctly', () => {
    const mockState = {
      selected: new Set<number>(),
      rank: new Map<number, number>()
    };

    vi.mocked(store.get).mockReturnValue(mockState);

    // Move item 100 to be before item 1 (first position)
    applyReorderInsert(clientId, { movedId: 100, targetId: 1, position: 'before' });

    // Item 100 should get rank < 1 (probably 0 or 0.5)
    const rank100 = getRank(mockState, 100);
    expect(rank100).toBeLessThan(1);

    // Verify in listing that 100 comes first
    const items = listPage(clientId, undefined, 0, 5);
    expect(items[0]?.id).toBe(100);
  });

  it('move item 2 before item 1 makes it first', () => {
    const mockState = {
      selected: new Set<number>(),
      rank: new Map<number, number>()
    };

    vi.mocked(store.get).mockReturnValue(mockState);

    // Simulate moving item 2 before item 1 (to make item 2 first)
    applyReorderInsert(clientId, { movedId: 2, targetId: 1, position: 'before' });

    // Item 2 should get rank < 1
    const rank2 = getRank(mockState, 2);
    expect(rank2).toBeLessThan(1);

    // Item 1 should keep its rank = 1
    const rank1 = getRank(mockState, 1);
    expect(rank1).toBe(1);

    // Verify in listing that 2 comes before 1
    const items = listPage(clientId, undefined, 0, 5);
    expect(items[0]?.id).toBe(2);
    expect(items[1]?.id).toBe(1);
  });

  it('move 130 before 30 in search places 130 near 30 in global list', () => {
    const mockState = {
      selected: new Set<number>(),
      rank: new Map<number, number>()
    };

    vi.mocked(store.get).mockReturnValue(mockState);

    // Initial state: elements have default ranks (id === rank)
    // So 30 has rank 30, 130 has rank 130, etc.

    // Move 130 before 30
    applyReorderInsert(clientId, { movedId: 130, targetId: 30, position: 'before' });

    // 130 should get a rank very close to 30
    const rank130 = getRank(mockState, 130);
    const rank30 = getRank(mockState, 30);

    // 130 should be extremely close to 30 (within 0.01)
    expect(Math.abs(rank130 - rank30)).toBeLessThan(0.01);

    // Specifically, 130 should have rank slightly less than 30
    expect(rank130).toBeLessThan(rank30);

    // In global list, 130 should appear immediately before 30
    const items = listPage(clientId, undefined, 25, 10); // Get items around position 25-35
    const itemIds = items.map(item => item.id);

    // 130 should be in this range and close to 30
    expect(itemIds).toContain(130);
    expect(itemIds).toContain(30);

    // Find positions
    const pos130 = itemIds.indexOf(130);
    const pos30 = itemIds.indexOf(30);

    expect(pos130).toBeLessThan(pos30);
    expect(pos30 - pos130).toBeLessThanOrEqual(2); // Should be immediately adjacent
  });

  it('move 230 before 130 keeps them adjacent', () => {
    const mockState = {
      selected: new Set<number>(),
      rank: new Map<number, number>([
        [130, 29.5], // 130 is already moved to rank 29.5
        [30, 30]
      ])
    };

    vi.mocked(store.get).mockReturnValue(mockState);

    // Move 230 before 130 (which has rank 29.5)
    applyReorderInsert(clientId, { movedId: 230, targetId: 130, position: 'before' });

    // 230 should get a rank very close to 130's rank (29.5)
    const rank230 = getRank(mockState, 230);
    const rank130 = getRank(mockState, 130);

    // 230 should be extremely close to 130
    expect(Math.abs(rank230 - rank130)).toBeLessThan(0.01);

    // Specifically, 230 should have rank slightly less than 130
    expect(rank230).toBeLessThan(rank130);

    // In global list, they should be adjacent
    const items = listPage(clientId, undefined, 25, 10);
    const itemIds = items.map(item => item.id);

    expect(itemIds).toContain(230);
    expect(itemIds).toContain(130);

    const pos230 = itemIds.indexOf(230);
    const pos130 = itemIds.indexOf(130);

    expect(pos230).toBeLessThan(pos130);
    expect(pos130 - pos230).toBe(1); // Should be immediately adjacent
  });

  it('complete user scenario: 130 before 30, then 230 before 130', () => {
    const mockState = {
      selected: new Set<number>(),
      rank: new Map<number, number>()
    };

    vi.mocked(store.get).mockReturnValue(mockState);

    // Step 1: Move 130 before 30
    applyReorderInsert(clientId, { movedId: 130, targetId: 30, position: 'before' });

    // Step 2: Move 230 before 130
    applyReorderInsert(clientId, { movedId: 230, targetId: 130, position: 'before' });

    // Check final ranks
    const rank230 = getRank(mockState, 230);
    const rank130 = getRank(mockState, 130);
    const rank30 = getRank(mockState, 30);

    // All three should be very close to each other
    expect(Math.abs(rank230 - rank130)).toBeLessThan(0.01);
    expect(Math.abs(rank130 - rank30)).toBeLessThan(0.01);

    // Order should be: 230 < 130 < 30
    expect(rank230).toBeLessThan(rank130);
    expect(rank130).toBeLessThan(rank30);

    // In global list, they should appear as 230, 130, 30 without gaps
    const items = listPage(clientId, undefined, 25, 10);
    const itemIds = items.map(item => item.id);

    const pos230 = itemIds.indexOf(230);
    const pos130 = itemIds.indexOf(130);
    const pos30 = itemIds.indexOf(30);

    // All three should be present and in correct order
    expect(pos230).toBeGreaterThan(-1);
    expect(pos130).toBeGreaterThan(-1);
    expect(pos30).toBeGreaterThan(-1);

    expect(pos230).toBeLessThan(pos130);
    expect(pos130).toBeLessThan(pos30);

    // They should be very close to each other (no more than 1-2 positions apart)
    expect(pos30 - pos230).toBeLessThanOrEqual(3);
  });

  it('no 1e6 allocations performance', () => {
    const mockState = {
      selected: new Set<number>(),
      rank: new Map<number, number>()
    };

    // Add a few custom ranks to make it realistic
    mockState.rank.set(100, 50.5);
    mockState.rank.set(200, 75.2);
    mockState.rank.set(300, 25.8);

    vi.mocked(store.get).mockReturnValue(mockState);

    // This should not allocate 1e6 elements
    const start = performance.now();
    const items = listPage(clientId, undefined, 0, 20);
    const end = performance.now();

    expect(items.length).toBe(20);
    expect(end - start).toBeLessThan(100); // Should be fast

    // Verify first few items are in correct order
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0]?.id).toBe(1);
    expect(items[1]?.id).toBe(2);
    // ... up to item 25 (since 25.8 comes before 26)
    // Then 26, 27, etc. but 100 comes before 101
  });

  describe('helper functions', () => {
    it('getPredByRank finds correct predecessor', () => {
      const mockState = {
        selected: new Set<number>(),
        rank: new Map<number, number>([
          [100, 50],
          [200, 75],
          [300, 25]
        ])
      };

      vi.mocked(store.get).mockReturnValue(mockState);

      // Find pred for rank 75 (should be 50)
      const pred75 = getPredByRank(mockState, 75);
      expect(pred75?.id).toBe(100);
      expect(pred75?.rank).toBe(50);

      // Find pred for rank 50 (should be 25)
      const pred50 = getPredByRank(mockState, 50);
      expect(pred50?.id).toBe(300);
      expect(pred50?.rank).toBe(25);

      // Find pred for rank 25 (should be default pred 24)
      const pred25 = getPredByRank(mockState, 25);
      expect(pred25?.id).toBe(24);
      expect(pred25?.rank).toBe(24);

      // Find pred for rank 1 (should be null - no predecessor for first position)
      const pred1 = getPredByRank(mockState, 1);
      expect(pred1).toBeNull();
    });

    it('getSuccByRank finds correct successor', () => {
      const mockState = {
        selected: new Set<number>(),
        rank: new Map<number, number>([
          [100, 50],
          [200, 75],
          [300, 25]
        ])
      };

      vi.mocked(store.get).mockReturnValue(mockState);

      // Find succ for rank 50 (should be 75)
      const succ50 = getSuccByRank(mockState, 50);
      expect(succ50?.id).toBe(200);
      expect(succ50?.rank).toBe(75);

      // Find succ for rank 25 (should be 50)
      const succ25 = getSuccByRank(mockState, 25);
      expect(succ25?.id).toBe(100);
      expect(succ25?.rank).toBe(50);

      // Find succ for rank 75 (should be default succ 76)
      const succ75 = getSuccByRank(mockState, 75);
      expect(succ75?.id).toBe(76);
      expect(succ75?.rank).toBe(76);
    });
  });
});

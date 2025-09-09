import { test, expect } from '@playwright/test';

test.describe('Items List App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render initial 20 items', async ({ page }) => {
    // Wait for the table to load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Check that items are numbered 1-20
    await expect(page.locator('.items-table tbody tr').first()).toContainText('Item 1');
    await expect(page.locator('.items-table tbody tr').nth(19)).toContainText('Item 20');
  });

  test('should load more items on scroll', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Scroll to bottom to trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Wait for more items to load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(40);
    
    // Check that new items are numbered 21-40
    await expect(page.locator('.items-table tbody tr').nth(20)).toContainText('Item 21');
    await expect(page.locator('.items-table tbody tr').nth(39)).toContainText('Item 40');
  });

  test('should filter items by search', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Search for items containing '12'
    await page.fill('.search-input', '12');
    
    // Wait for search results
    await page.waitForTimeout(500); // Wait for debounce
    
    // Check that all visible items contain '12'
    const rows = page.locator('.items-table tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent();
      expect(text).toContain('12');
    }
  });

  test('should select and deselect items', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Check initial selection count
    await expect(page.locator('.selection-info')).toContainText('0 selected');
    
    // Select first item
    await page.check('.items-table tbody tr:first-child input[type="checkbox"]');
    
    // Check selection count updated
    await expect(page.locator('.selection-info')).toContainText('1 selected');
    
    // Select second item
    await page.check('.items-table tbody tr:nth-child(2) input[type="checkbox"]');
    
    // Check selection count updated
    await expect(page.locator('.selection-info')).toContainText('2 selected');
    
    // Deselect first item
    await page.uncheck('.items-table tbody tr:first-child input[type="checkbox"]');
    
    // Check selection count updated
    await expect(page.locator('.selection-info')).toContainText('1 selected');
  });

  test('should persist selection after page reload', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Select some items
    await page.check('.items-table tbody tr:first-child input[type="checkbox"]');
    await page.check('.items-table tbody tr:nth-child(3) input[type="checkbox"]');
    await page.check('.items-table tbody tr:nth-child(5) input[type="checkbox"]');
    
    // Check selection count
    await expect(page.locator('.selection-info')).toContainText('3 selected');
    
    // Reload page
    await page.reload();
    
    // Wait for items to load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Check that selections are preserved
    await expect(page.locator('.selection-info')).toContainText('3 selected');
    await expect(page.locator('.items-table tbody tr:first-child input[type="checkbox"]')).toBeChecked();
    await expect(page.locator('.items-table tbody tr:nth-child(3) input[type="checkbox"]')).toBeChecked();
    await expect(page.locator('.items-table tbody tr:nth-child(5) input[type="checkbox"]')).toBeChecked();
  });

  test('should clear selection', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Select some items
    await page.check('.items-table tbody tr:first-child input[type="checkbox"]');
    await page.check('.items-table tbody tr:nth-child(2) input[type="checkbox"]');
    await page.check('.items-table tbody tr:nth-child(3) input[type="checkbox"]');
    
    // Check selection count
    await expect(page.locator('.selection-info')).toContainText('3 selected');
    
    // Click clear selection button
    await page.click('button:has-text("Clear Selection")');
    
    // Check that all selections are cleared
    await expect(page.locator('.selection-info')).toContainText('0 selected');
    await expect(page.locator('.items-table tbody tr:first-child input[type="checkbox"]')).not.toBeChecked();
    await expect(page.locator('.items-table tbody tr:nth-child(2) input[type="checkbox"]')).not.toBeChecked();
    await expect(page.locator('.items-table tbody tr:nth-child(3) input[type="checkbox"]')).not.toBeChecked();
  });

  test('should reset state', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Select some items
    await page.check('.items-table tbody tr:first-child input[type="checkbox"]');
    await page.check('.items-table tbody tr:nth-child(2) input[type="checkbox"]');
    
    // Check selection count
    await expect(page.locator('.selection-info')).toContainText('2 selected');
    
    // Click reset button
    await page.click('button:has-text("Reset State")');
    
    // Wait for reset to complete
    await page.waitForTimeout(1000);
    
    // Check that selections are cleared
    await expect(page.locator('.selection-info')).toContainText('0 selected');
    await expect(page.locator('.items-table tbody tr:first-child input[type="checkbox"]')).not.toBeChecked();
    await expect(page.locator('.items-table tbody tr:nth-child(2) input[type="checkbox"]')).not.toBeChecked();
  });

  test('should handle drag and drop reordering', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Get initial order
    const initialFirstItem = await page.locator('.items-table tbody tr:first-child').textContent();
    const initialSecondItem = await page.locator('.items-table tbody tr:nth-child(2)').textContent();
    
    expect(initialFirstItem).toContain('Item 1');
    expect(initialSecondItem).toContain('Item 2');
    
    // Drag first item to second position
    const firstRow = page.locator('.items-table tbody tr:first-child');
    const secondRow = page.locator('.items-table tbody tr:nth-child(2)');
    
    await firstRow.dragTo(secondRow);
    
    // Wait for reorder to complete
    await page.waitForTimeout(1000);
    
    // Check that order has changed
    const newFirstItem = await page.locator('.items-table tbody tr:first-child').textContent();
    const newSecondItem = await page.locator('.items-table tbody tr:nth-child(2)').textContent();
    
    expect(newFirstItem).toContain('Item 2');
    expect(newSecondItem).toContain('Item 1');
  });

  test('should persist drag and drop order after reload', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Drag first item to second position
    const firstRow = page.locator('.items-table tbody tr:first-child');
    const secondRow = page.locator('.items-table tbody tr:nth-child(2)');
    
    await firstRow.dragTo(secondRow);
    
    // Wait for reorder to complete
    await page.waitForTimeout(1000);
    
    // Reload page
    await page.reload();
    
    // Wait for items to load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Check that order is preserved
    const firstItem = await page.locator('.items-table tbody tr:first-child').textContent();
    const secondItem = await page.locator('.items-table tbody tr:nth-child(2)').textContent();
    
    expect(firstItem).toContain('Item 2');
    expect(secondItem).toContain('Item 1');
  });

  test('should handle search with drag and drop', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Search for items containing '12'
    await page.fill('.search-input', '12');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Check that we have search results
    const rows = page.locator('.items-table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    
    // If we have at least 2 items, try drag and drop
    if (count >= 2) {
      const firstRow = rows.first();
      const secondRow = rows.nth(1);
      
      // Get initial order
      const initialFirst = await firstRow.textContent();
      const initialSecond = await secondRow.textContent();
      
      // Drag first to second position
      await firstRow.dragTo(secondRow);
      
      // Wait for reorder
      await page.waitForTimeout(1000);
      
      // Check that order changed
      const newFirst = await firstRow.textContent();
      const newSecond = await secondRow.textContent();
      
      expect(newFirst).not.toBe(initialFirst);
      expect(newSecond).not.toBe(initialSecond);
    }
  });

  test('should handle rapid search changes', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Rapidly change search queries
    await page.fill('.search-input', '1');
    await page.waitForTimeout(100);
    
    await page.fill('.search-input', '12');
    await page.waitForTimeout(100);
    
    await page.fill('.search-input', '123');
    await page.waitForTimeout(100);
    
    await page.fill('.search-input', '');
    await page.waitForTimeout(500);
    
    // Should return to showing 20 items
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
  });

  test('should show loading state', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Clear search to trigger loading
    await page.fill('.search-input', '');
    
    // Should show loading spinner briefly
    await expect(page.locator('.loading')).toBeVisible();
  });

  test('should handle end of list', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.items-table tbody tr')).toHaveCount(20);
    
    // Search for something that should have few results
    await page.fill('.search-input', '999999');
    
    // Wait for search
    await page.waitForTimeout(500);
    
    // Should show end message if we have results
    const rows = page.locator('.items-table tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      await expect(page.locator('.end-message')).toBeVisible();
    }
  });
});



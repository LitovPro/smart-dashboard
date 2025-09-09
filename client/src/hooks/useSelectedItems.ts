import { useState, useEffect, useCallback } from 'react';

const SELECTED_ITEMS_KEY = 'selectedItems';

interface UseSelectedItemsResult {
  selectedItems: Set<number>;
  toggleItem: (itemId: number) => void;
  selectItem: (itemId: number) => void;
  deselectItem: (itemId: number) => void;
  clearSelection: () => void;
  isSelected: (itemId: number) => boolean;
  selectedCount: number;
}

export function useSelectedItems(): UseSelectedItemsResult {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Load selected items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SELECTED_ITEMS_KEY);
      if (stored) {
        const selectedIds = JSON.parse(stored) as number[];
        setSelectedItems(new Set(selectedIds));
        console.log('📋 Loaded selected items from localStorage:', selectedIds);
      }
    } catch (error) {
      console.error('Failed to load selected items from localStorage:', error);
    }
  }, []);

  // Save selected items to localStorage whenever selection changes
  useEffect(() => {
    try {
      const selectedIds = Array.from(selectedItems);
      localStorage.setItem(SELECTED_ITEMS_KEY, JSON.stringify(selectedIds));
      console.log('💾 Saved selected items to localStorage:', selectedIds);
    } catch (error) {
      console.error('Failed to save selected items to localStorage:', error);
    }
  }, [selectedItems]);

  const toggleItem = useCallback((itemId: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
        console.log('📋 Deselected item:', itemId);
      } else {
        newSet.add(itemId);
        console.log('📋 Selected item:', itemId);
      }
      return newSet;
    });
  }, []);

  const selectItem = useCallback((itemId: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.add(itemId);
      console.log('📋 Selected item:', itemId);
      return newSet;
    });
  }, []);

  const deselectItem = useCallback((itemId: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      console.log('📋 Deselected item:', itemId);
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    console.log('📋 Cleared all selections');
  }, []);

  const isSelected = useCallback((itemId: number) => {
    return selectedItems.has(itemId);
  }, [selectedItems]);

  const selectedCount = selectedItems.size;

  return {
    selectedItems,
    toggleItem,
    selectItem,
    deselectItem,
    clearSelection,
    isSelected,
    selectedCount,
  };
}

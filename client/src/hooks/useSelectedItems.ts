import { useState, useEffect, useCallback } from 'react';
import { createApiClient } from '../api';

const SELECTED_ITEMS_KEY = 'selectedItems';

interface UseSelectedItemsResult {
  selectedItems: Set<number>;
  toggleItem: (itemId: number) => void;
  selectItem: (itemId: number) => void;
  deselectItem: (itemId: number) => void;
  clearSelection: () => void;
  isSelected: (itemId: number) => boolean;
  selectedCount: number;
  isLoading: boolean;
}

export function useSelectedItems(clientId?: string): UseSelectedItemsResult {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const apiClient = clientId ? createApiClient(clientId) : null;

  // Load selected items from server on mount
  useEffect(() => {
    if (!clientId || !apiClient || isInitialized) return;

    const loadFromServer = async () => {
      try {
        setIsLoading(true);
        console.log('📋 Loading selected items from server...');
        
        const state = await apiClient.getState();
        const serverSelectedItems = new Set(state.selectedItems);
        
        setSelectedItems(serverSelectedItems);
        console.log('📋 Loaded selected items from server:', Array.from(serverSelectedItems));
        
        // Also save to localStorage as backup
        localStorage.setItem(SELECTED_ITEMS_KEY, JSON.stringify(Array.from(serverSelectedItems)));
        
      } catch (error) {
        console.error('📋 Failed to load selected items from server:', error);
        
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem(SELECTED_ITEMS_KEY);
          if (stored) {
            const selectedIds = JSON.parse(stored) as number[];
            setSelectedItems(new Set(selectedIds));
            console.log('📋 Fallback: Loaded selected items from localStorage:', selectedIds);
          }
        } catch (localError) {
          console.error('📋 Failed to load selected items from localStorage:', localError);
        }
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadFromServer();
  }, [clientId, apiClient, isInitialized]);

  // Note: saveToServer function removed as it's not used in current implementation

  // Save to localStorage as backup
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      const selectedIds = Array.from(selectedItems);
      localStorage.setItem(SELECTED_ITEMS_KEY, JSON.stringify(selectedIds));
      console.log('💾 Saved selected items to localStorage:', selectedIds);
    } catch (error) {
      console.error('Failed to save selected items to localStorage:', error);
    }
  }, [selectedItems, isInitialized]);

  const toggleItem = useCallback(async (itemId: number) => {
    if (!apiClient) {
      // Fallback to local state only
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
          console.log('📋 Deselected item (local only):', itemId);
        } else {
          newSet.add(itemId);
          console.log('📋 Selected item (local only):', itemId);
        }
        return newSet;
      });
      return;
    }

    const isCurrentlySelected = selectedItems.has(itemId);
    const newSelected = !isCurrentlySelected;

    // Optimistic update
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSelected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });

    // Send to server
    try {
      await apiClient.toggleSelection({
        ids: [itemId],
        selected: newSelected
      });
      console.log(`📋 ${newSelected ? 'Selected' : 'Deselected'} item on server:`, itemId);
    } catch (error) {
      console.error('📋 Failed to toggle selection on server:', error);
      // Revert optimistic update
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSelected) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
    }
  }, [apiClient, selectedItems]);

  const selectItem = useCallback(async (itemId: number) => {
    if (selectedItems.has(itemId)) return;
    await toggleItem(itemId);
  }, [selectedItems, toggleItem]);

  const deselectItem = useCallback(async (itemId: number) => {
    if (!selectedItems.has(itemId)) return;
    await toggleItem(itemId);
  }, [selectedItems, toggleItem]);

  const clearSelection = useCallback(async () => {
    if (!apiClient) {
      setSelectedItems(new Set());
      console.log('📋 Cleared all selections (local only)');
      return;
    }

    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) return;

    // Optimistic update
    setSelectedItems(new Set());

    // Send to server
    try {
      await apiClient.toggleSelection({
        ids: selectedIds,
        selected: false
      });
      console.log('📋 Cleared all selections on server');
    } catch (error) {
      console.error('📋 Failed to clear selection on server:', error);
      // Revert optimistic update
      setSelectedItems(new Set(selectedIds));
    }
  }, [apiClient, selectedItems]);

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
    isLoading,
  };
}
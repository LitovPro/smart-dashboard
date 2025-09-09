import { useState, useEffect, useCallback, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemDTO, createApiClient } from '../api';
import { Loading } from './Loading';
import { DndContextProvider } from '../dnd/DndContextProvider';
import { useSelectedItems } from '../hooks/useSelectedItems';

interface SortableRowProps {
  item: ItemDTO;
  isSelected: boolean;
  onToggle: (id: number) => void;
}

function SortableRow({ item, isSelected, onToggle }: SortableRowProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id: item.id,
    disabled: false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`sortable-row ${isDragging ? 'dragging' : ''} ${isOver ? 'over' : ''} ${isSelected ? 'selected' : ''}`}
      {...attributes}
    >
      <td className="checkbox-cell">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(item.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${item.label}`}
        />
      </td>
      <td 
        className="label-cell drag-handle"
        {...listeners}
      >
        <span>{item.label}</span>
      </td>
    </tr>
  );
}

interface ItemsTableProps {
  clientId: string;
  items: ItemDTO[];
  isLoading: boolean;
  isEnd: boolean;
  error: string | null;
  onFetchNext: () => void;
  onReset: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  updateItems: (newItems: ItemDTO[]) => void;
}

export function ItemsTable({
  clientId,
  items,
  isLoading,
  isEnd,
  error,
  onFetchNext,
  onReset,
  query,
  onQueryChange,
  updateItems,
}: ItemsTableProps): JSX.Element {
  const [localItems, setLocalItems] = useState<ItemDTO[]>(items);
  const [showSelectedList, setShowSelectedList] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const apiClient = createApiClient(clientId);
  const { toggleItem, clearSelection, isSelected, selectedCount, selectedItems } = useSelectedItems();

  // Get selected items with their labels
  const getSelectedItemsWithLabels = useCallback(() => {
    const selectedIds = Array.from(selectedItems);
    return selectedIds.map(id => {
      const item = localItems.find(item => item.id === id);
      return item ? { id: item.id, label: item.label } : { id, label: `Item ${id}` };
    }).sort((a, b) => a.id - b.id);
  }, [selectedItems, localItems]);

  // Update local items when items change
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && !isEnd) {
          onFetchNext();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, isEnd, onFetchNext]);

  // Simple toggle function
  const handleToggle = useCallback((id: number) => {
    toggleItem(id);
  }, [toggleItem]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Reset state
  const handleReset = useCallback(async () => {
    try {
      await apiClient.reset();
      onReset();
      clearSelection();
      setLocalItems([]);
    } catch (error) {
      console.error('Failed to reset state:', error);
    }
  }, [apiClient, onReset, clearSelection]);

  // Handle reorder - CORRECT APPROACH: both modes save to server
  const handleReorder = useCallback(async (newItems: ItemDTO[]) => {
    console.log('📋 ItemsTable: handleReorder called');
    console.log('📋 Current query:', query);
    console.log('📋 Is in search mode:', query.length > 0);
    console.log('📋 New items count:', newItems.length);
    console.log('📋 New items IDs:', newItems.map(item => item.id));
    console.log('📋 New items details:', newItems.map(item => ({ id: item.id, label: item.label })));
    console.log('📋 Original items count:', items.length);
    console.log('📋 Original items IDs:', items.map(item => item.id));
    
    // Update UI immediately
    setLocalItems(newItems);
    updateItems(newItems);

    try {
      if (query.length > 0) {
        // SEARCH MODE: Use smart position updates to preserve global order
        console.log('📋 SEARCH MODE: Using smart position updates');
        
        // Find what actually changed
        const oldOrder = items.map(item => item.id);
        const newOrder = newItems.map(item => item.id);
        
        // Find the moved item and its new position
        let movedItemId = null;
        let newPosition = -1;
        
        // The correct approach: find the item that changed position
        // We need to find which item moved from one position to another
        for (let i = 0; i < Math.min(oldOrder.length, newOrder.length); i++) {
          if (oldOrder[i] !== newOrder[i]) {
            // Check if the item at position i in oldOrder moved to a different position
            const itemAtOldPosition = oldOrder[i];
            const foundNewPosition = newOrder.indexOf(itemAtOldPosition as number);
            
            if (foundNewPosition !== -1 && foundNewPosition !== i) {
              // This item moved from i to foundNewPosition
              movedItemId = itemAtOldPosition;
              newPosition = foundNewPosition;
              console.log('📋 SEARCH MODE: Found moved item', movedItemId, 'from position', i, 'to position', newPosition);
              break;
            }
          }
        }
        
        if (movedItemId !== null && newPosition >= 0) {
          console.log('📋 SEARCH MODE: Moved item', movedItemId, 'to position', newPosition);
          
          // Get context items (before and after) in the NEW order
          const beforeItemId = newPosition > 0 ? newOrder[newPosition - 1] : null;
          const afterItemId = newPosition < newOrder.length - 1 ? newOrder[newPosition + 1] : null;
          
          console.log('📋 SEARCH MODE: Context - before:', beforeItemId, 'after:', afterItemId);
          console.log('📋 SEARCH MODE: New order:', newOrder);
          console.log('📋 SEARCH MODE: Old order:', oldOrder);
          
          // Use the position-based API to preserve global order
          const payload: {
            movedId: number;
            newPosition: number;
            beforeItemId?: number | null;
            afterItemId?: number | null;
          } = {
            movedId: movedItemId as number,
            newPosition: newPosition
          };
          
          if (beforeItemId !== null && beforeItemId !== undefined) {
            payload.beforeItemId = beforeItemId;
          }
          
          if (afterItemId !== null && afterItemId !== undefined) {
            payload.afterItemId = afterItemId;
          }
          
          await apiClient.setItemPosition(payload);
          console.log('📋 SEARCH MODE: Position update sent successfully');
        } else {
          console.log('📋 SEARCH MODE: No actual changes detected, skipping API call');
        }
        
      } else {
        // NORMAL MODE: Send the entire new order to server
        console.log('📋 NORMAL MODE: Sending full order to server');
        const itemIds = newItems.map(item => item.id);
        console.log('📋 Sending new order to server:', itemIds);
        
        await apiClient.setOrder(itemIds);
        console.log('📋 Order saved successfully to server');
      }
      
    } catch (error) {
      console.error('📋 Failed to save order:', error);
      // Revert on error
      setLocalItems(items);
      updateItems(items);
    }
  }, [apiClient, items, updateItems, query]);


  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
        <button onClick={onReset} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="items-table-container">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            placeholder="Search items..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="toolbar-right">
          <div className={`selection-info ${selectedCount > 0 ? 'has-selection' : ''}`}>
            <span className="selection-icon">✓</span>
            <span className="selection-count">{selectedCount}</span>
            <span className="selection-label">
              {selectedCount === 1 ? 'item selected' : 'items selected'}
            </span>
          </div>
          
          {selectedCount > 0 && (
            <>
              <button
                onClick={() => setShowSelectedList(!showSelectedList)}
                className="btn btn-primary show-selected-btn"
              >
                {showSelectedList ? 'Hide List' : 'Show List'}
              </button>
              <button
                onClick={handleClearSelection}
                className="btn btn-secondary clear-btn"
              >
                Clear Selection
              </button>
            </>
          )}
          
          <button
            onClick={handleReset}
            className="btn btn-danger"
          >
            Reset State
          </button>
        </div>
      </div>

      {/* Selected Items List */}
      {selectedCount > 0 && showSelectedList && (
        <div className="selected-items-list">
          <div className="selected-items-header">
            <h3>Selected Items ({selectedCount})</h3>
            <button
              onClick={handleClearSelection}
              className="btn btn-secondary clear-btn"
            >
              Clear All
            </button>
          </div>
          <div className="selected-items-grid">
            {getSelectedItemsWithLabels().map(({ id, label }) => (
              <div key={id} className="selected-item-card">
                <div className="selected-item-info">
                  <span className="selected-item-label">{label}</span>
                  <span className="selected-item-id">ID: {id}</span>
                </div>
                <button
                  onClick={() => toggleItem(id)}
                  className="btn btn-danger selected-item-remove"
                  title="Remove from selection"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <DndContextProvider items={localItems} onReorder={handleReorder}>
        <table className="items-table">
          <thead>
            <tr>
              <th className="checkbox-header">Select</th>
              <th className="label-header">Item</th>
            </tr>
          </thead>
          <tbody>
            {localItems.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                isSelected={isSelected(item.id)}
                onToggle={handleToggle}
              />
            ))}
          </tbody>
        </table>
      </DndContextProvider>


      {/* Floating selection indicator */}
      {selectedCount > 0 && (
        <div className="floating-selection-indicator">
          <div className="floating-content">
            <span className="floating-icon">✓</span>
            <span className="floating-count">{selectedCount}</span>
            <span className="floating-label">
              {selectedCount === 1 ? 'Selected' : 'Selected'}
            </span>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading">
          <Loading />
          <span>Loading more items...</span>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: '20px' }} />
    </div>
  );
}
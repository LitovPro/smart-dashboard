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
  onReorder: (movedId: number, targetId: number, position: 'before' | 'after') => void;
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
  onReorder: _onReorder, // Used by DndContextProvider
}: ItemsTableProps): JSX.Element {
  const [localItems, setLocalItems] = useState<ItemDTO[]>(items);
  const [showSelectedList, setShowSelectedList] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const apiClient = createApiClient(clientId);
  const { toggleItem, clearSelection, isSelected, selectedCount, selectedItems } = useSelectedItems(clientId);

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

  // Handle reorder - Send INSERT payload to server
  const handleReorder = useCallback(async (movedId: number, targetId: number, position: 'before' | 'after') => {
    console.log('📋 ItemsTable: handleReorder called');
    console.log('📋 Moved ID:', movedId, 'Target ID:', targetId, 'Position:', position);
    console.log('📋 Current query:', query);
    console.log('📋 Current items count:', items.length);

    // Optimistically update UI by simulating the move
    const movedIndex = items.findIndex(item => item.id === movedId);
    const targetIndex = items.findIndex(item => item.id === targetId);

    if (movedIndex === -1 || targetIndex === -1) {
      console.log('📋 Invalid indices, skipping reorder');
      return;
    }

    // Create new order by removing moved item and inserting at target position
    const newItems = [...items];
    const [movedItem] = newItems.splice(movedIndex, 1);

    if (!movedItem) {
      console.log('📋 Moved item not found, skipping reorder');
      return;
    }

    // Insert at the correct position based on position parameter
    let insertIndex = targetIndex;
    if (position === 'after') {
      insertIndex = targetIndex + 1;
    }

    newItems.splice(insertIndex, 0, movedItem);

    console.log('📋 Optimistic update - new order:', newItems.map(item => item.id));

    // Update UI immediately
    setLocalItems(newItems);
    updateItems(newItems);

    try {
      // Send INSERT payload to server
      const payload = {
        movedId,
        targetId,
        position
      };

      console.log('📋 Sending INSERT payload to server:', payload);
      console.log('📋 Current items state:', {
        movedId,
        targetId,
        position,
        currentOrder: items.map(item => item.id)
      });
      await apiClient.postOrder(payload);
      console.log('📋 Order saved successfully to server');

    } catch (error) {
      console.error('📋 Failed to save order:', error);
      // Revert on error
      setLocalItems(items);
      updateItems(items);
    }
  }, [apiClient, items, updateItems]);


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

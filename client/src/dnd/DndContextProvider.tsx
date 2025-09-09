import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ItemDTO } from '../api';

interface DndContextProviderProps {
  children: React.ReactNode;
  items: ItemDTO[];
  onReorder: (newItems: ItemDTO[]) => void;
}

export function DndContextProvider({
  children,
  items,
  onReorder,
}: DndContextProviderProps): JSX.Element {
  const [activeItem, setActiveItem] = React.useState<ItemDTO | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as number;
    const activeItem = items.find(item => item.id === activeId);
    
    setActiveItem(activeItem || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('🎯 DndContextProvider: handleDragEnd called');
    console.log('🎯 Active item ID:', active.id);
    console.log('🎯 Over item ID:', over?.id);
    console.log('🎯 Current items count:', items.length);
    console.log('🎯 Current items:', items.map(item => ({ id: item.id, label: item.label })));
    
    setActiveItem(null);

    if (!over || active.id === over.id) {
      console.log('🎯 DndContextProvider: No valid drop target or same item');
      return;
    }

    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);

    console.log('🎯 Old index:', oldIndex, 'New index:', newIndex);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Simple array move - just swap positions
      const newItems = [...items];
      const [movedItem] = newItems.splice(oldIndex, 1);
      if (movedItem) {
        newItems.splice(newIndex, 0, movedItem);
      }
      
      console.log('🎯 DndContextProvider: Simple move from', oldIndex, 'to', newIndex);
      console.log('🎯 Moved item:', movedItem);
      console.log('🎯 New order:', newItems.map(item => item.id));
      console.log('🎯 New items details:', newItems.map(item => ({ id: item.id, label: item.label })));
      
      onReorder(newItems);
    } else {
      console.log('🎯 DndContextProvider: Invalid indices - oldIndex:', oldIndex, 'newIndex:', newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
      <DragOverlay>
        {activeItem ? (
          <div className="drag-overlay">
            <div className="drag-overlay-content">
              <input type="checkbox" checked={activeItem.selected} readOnly />
              <span>{activeItem.label}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
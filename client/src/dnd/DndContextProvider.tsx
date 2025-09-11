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
  onReorder: (movedId: number, targetId: number, position: 'before' | 'after') => void;
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
    console.log('🎯 Current items order:', items.map(item => item.id));
    console.log('🎯 Event details:', {
      active: active.id,
      over: over?.id,
      delta: event.delta,
      activatorEvent: event.activatorEvent
    });

    setActiveItem(null);

    if (!over || active.id === over.id) {
      console.log('🎯 DndContextProvider: No valid drop target or same item');
      return;
    }

    const movedId = active.id as number;
    const targetId = over.id as number;

    // Determine position based on current item order
    const movedIndex = items.findIndex(item => item.id === movedId);
    const targetIndex = items.findIndex(item => item.id === targetId);

    if (movedIndex === -1 || targetIndex === -1) {
      console.log('🎯 DndContextProvider: Invalid indices');
      return;
    }

    // If moving to the same position, do nothing
    if (movedIndex === targetIndex) {
      return;
    }

    // CORRECT LOGIC: Determine position based on the intended drop location
    // In drag-and-drop, when you drop an element over another element,
    // the position depends on where exactly you drop it relative to the target
    let position: 'before' | 'after';

    // If the moved element was originally BEFORE the target,
    // and we're dropping it over the target, we want to move it AFTER the target
    // If the moved element was originally AFTER the target,
    // and we're dropping it over the target, we want to move it BEFORE the target
    if (movedIndex < targetIndex) {
      // Element was above target, now over target - move AFTER target
      position = 'after';
    } else {
      // Element was below target, now over target - move BEFORE target
      position = 'before';
    }

    console.log('🎯 DndContextProvider: Moving', movedId, position, targetId);
    console.log('🎯 Moved index:', movedIndex, 'Target index:', targetIndex);
    console.log('🎯 Final decision:', {
      movedId,
      targetId,
      position,
      movedIndex,
      targetIndex,
      movedWasBelow: movedIndex > targetIndex
    });

    onReorder(movedId, targetId, position);
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
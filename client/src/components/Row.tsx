import React from 'react';
import { ItemDTO } from '../api';

interface RowProps {
  item: ItemDTO;
  onToggle: (id: number, selected: boolean) => void;
  isDragging?: boolean;
}

export function Row({ item, onToggle, isDragging = false }: RowProps): JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(item.id, e.target.checked);
  };

  return (
    <tr className={`row ${isDragging ? 'dragging' : ''}`}>
      <td className="checkbox-cell">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={handleChange}
          aria-label={`Select ${item.label}`}
        />
      </td>
      <td className="label-cell">
        <span>{item.label}</span>
      </td>
    </tr>
  );
}



import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useState } from 'react';

export function EditableOptionList({
  values,
  addLabel,
  placeholder,
  disabled,
  canReorder = false,
  onChange,
}: {
  values: string[];
  addLabel: string;
  placeholder: string;
  disabled?: boolean;
  canReorder?: boolean;
  onChange: (values: string[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditValue(values[index] ?? '');
  }

  function startAdding() {
    setEditingIndex(values.length);
    setEditValue('');
  }

  function saveEdit() {
    if (editingIndex === null) return;
    const trimmedValue = editValue.trim();
    if (!trimmedValue) {
      cancelEdit();
      return;
    }
    const isNew = editingIndex >= values.length;
    let nextValues: string[];
    if (isNew) {
      nextValues = [...values, trimmedValue];
    } else {
      nextValues = values.map((v, i) => (i === editingIndex ? trimmedValue : v));
    }
    const uniqueValues = Array.from(new Set(nextValues.map((v) => v.toLowerCase()))).map(
      (key) => nextValues.find((v) => v.toLowerCase() === key) ?? key,
    );
    onChange(uniqueValues);
    cancelEdit();
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditValue('');
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
    if (editingIndex === index) cancelEdit();
  }

  function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= values.length) return;
    const nextValues = [...values];
    const [current] = nextValues.splice(index, 1);
    nextValues.splice(targetIndex, 0, current);
    onChange(nextValues);
  }

  const isAdding = editingIndex !== null && editingIndex === values.length;

  return (
    <div className="grid gap-2">
      {values.length === 0 && editingIndex === null ? (
        <div className="admin-shein-empty-box">No options extracted</div>
      ) : null}
      {values.map((value, index) => {
        const isCurrentEditing = editingIndex === index;
        return (
          <div key={`${value}-${index}`} className="admin-shein-option-row">
            {isCurrentEditing ? (
              <Input
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus
              />
            ) : (
              <span className="text-sm font-medium">{value}</span>
            )}
            {canReorder && !isCurrentEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => move(index, -1)}
                  disabled={disabled || index === 0}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => move(index, 1)}
                  disabled={disabled || index === values.length - 1}
                >
                  ↓
                </Button>
              </>
            ) : null}
            {isCurrentEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveEdit}
                  disabled={disabled || !editValue.trim()}
                >
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit} disabled={disabled}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startEdit(index)}
                  disabled={disabled}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => remove(index)}
                  disabled={disabled}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        );
      })}
      {isAdding ? (
        <div className="admin-shein-option-row">
          <Input
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            onClick={saveEdit}
            disabled={disabled || !editValue.trim()}
          >
            Save
          </Button>
          <Button type="button" variant="outline" onClick={cancelEdit} disabled={disabled}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={startAdding} disabled={disabled}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2 } from 'lucide-react';

export const SortableItem = ({
    item,
    categoryId,
    onToggle,
    onEdit,
    onDelete,
    getBagName,
    t
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: item.id,
        data: {
            type: 'item',
            item,
            categoryId
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 group p-1.5 rounded-lg transition-all ${isDragging ? 'bg-indigo-50 border border-indigo-200 shadow-md z-50' : 'hover:bg-slate-50'}`}
        >
            <div
                {...attributes}
                {...listeners}
                className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-400 transition-colors opacity-40 group-hover:opacity-100 touch-none flex-shrink-0"
            >
                <GripVertical size={14} />
            </div>

            <input
                type="checkbox"
                checked={item.done}
                onChange={() => onToggle(item.id, categoryId)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />

            <div
                className={`flex-1 min-w-0 cursor-pointer ${item.done ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}
                onClick={() => onToggle(item.id, categoryId)}
            >
                <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs truncate">{item.text}</span>
                    {item.quantity > 1 && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                            x{item.quantity}
                        </span>
                    )}
                </div>
                {item.bagId && getBagName && (
                    <div className="text-[9px] text-indigo-500 font-bold truncate">
                        {getBagName(item.bagId)}
                    </div>
                )}
                {!item.bagId && item.recommendedBagType && (
                    <div className="text-[9px] text-amber-500 font-bold italic truncate">
                        {item.recommendedBagType} (?)
                    </div>
                )}
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(item, categoryId)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                >
                    <Edit2 size={12} />
                </button>
                <button
                    onClick={() => onDelete(item.id, categoryId)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
};

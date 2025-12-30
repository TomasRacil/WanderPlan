import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Card } from '../../common/Card';
import { SortableItem } from './SortableItem';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

export const CategoryView = ({
    category,
    onAddProduct,
    onEditCategory,
    onDeleteCategory,
    onToggleItem,
    onEditItem,
    onDeleteItem,
    getBagName,
    disabled = false,
    t
}) => {
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: category.id,
        data: {
            type: 'category',
            id: category.id
        }
    });

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: category.id,
        data: {
            type: 'category',
            category
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className="p-4"
            title={
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-400 opacity-40 hover:opacity-100 touch-none"
                        >
                            <GripVertical size={14} />
                        </div>
                        <span>{category.category}</span>
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => onAddProduct(category.id)}
                            className="p-1 hover:bg-indigo-50 text-indigo-600 rounded"
                            title={t.addItem}
                        >
                            <Plus size={14} />
                        </button>
                        <button
                            onClick={() => onEditCategory(category.id)}
                            className="p-1 hover:bg-indigo-50 text-indigo-600 rounded"
                            title={t.editEvent}
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={() => onDeleteCategory(category.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                            title={t.confirmDelete}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            }
        >
            <div
                ref={setDroppableRef}
                className={`space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar min-h-[40px] rounded-lg transition-colors ${isOver ? 'bg-indigo-50/50 outline-2 outline-dashed outline-indigo-200' : ''}`}
            >
                {category.items.length === 0 ? (
                    <div className="text-xs text-slate-400 italic text-center py-4">
                        {t.emptyTasks || "No items"}
                    </div>
                ) : (() => {
                    const sortedItems = [...category.items].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
                    return (
                        <SortableContext items={sortedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            {sortedItems.map(item => (
                                <SortableItem
                                    key={item.id}
                                    item={item}
                                    categoryId={category.id}
                                    onToggle={onToggleItem}
                                    onEdit={onEditItem}
                                    onDelete={onDeleteItem}
                                    getBagName={getBagName}
                                    t={t}
                                />
                            ))}
                        </SortableContext>
                    );
                })()}
            </div>
        </Card>
    );
};

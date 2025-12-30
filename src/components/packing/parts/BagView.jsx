import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Luggage, User } from 'lucide-react';
import { Card } from '../../common/Card';
import { SortableItem } from './SortableItem';

export const BagView = ({
    bagGroup,
    ownerName,
    onToggleItem,
    onEditItem,
    onDeleteItem,
    getBagName,
    t
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: bagGroup.id,
        data: {
            type: 'bag',
            bagId: bagGroup.id === 'unassigned_bag' ? null : bagGroup.id
        }
    });

    return (
        <Card
            ref={setNodeRef}
            className={`p-4 transition-colors ${isOver ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : ''}`}
            title={
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                        <Luggage size={16} className={bagGroup.type === 'none' ? 'text-slate-400' : 'text-indigo-600'} />
                        <span className="truncate">
                            {ownerName && ownerName !== t.unassignedItems ? `${ownerName} - ${bagGroup.name}` : bagGroup.name}
                        </span>
                    </div>
                </div>
            }
        >
            <div className="space-y-1 min-h-[40px]">
                {bagGroup.items.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 italic text-[10px]">
                        {bagGroup.type === 'none' ? t.allDone : (t.emptyBaggage || "Empty baggage")}
                    </div>
                ) : (
                    [...bagGroup.items]
                        .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1))
                        .map(item => (
                            <SortableItem
                                key={item.id}
                                item={item}
                                categoryId={item.categoryId}
                                onToggle={onToggleItem}
                                onEdit={onEditItem}
                                onDelete={onDeleteItem}
                                getBagName={getBagName}
                                t={t}
                            />
                        ))
                )}
            </div>
        </Card>
    );
};

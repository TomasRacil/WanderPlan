import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Briefcase, Plus, Trash2, Edit2, Luggage, User } from 'lucide-react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
} from '@dnd-kit/sortable';

import { SectionTitle } from './common/SectionTitle';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { ConfirmModal } from './common/ConfirmModal';
import { BagManagerModal } from './packing/BagManagerModal';

import { generateTrip } from '../store/tripSlice';
import {
    setPackingList,
    reorderCategories,
    reorderItemsInCategory,
    moveItemBetweenCategories,
    setItemBag
} from '../store/packingSlice';

import { generateId } from '../utils/idGenerator';
import { LOCALES } from '../i18n/locales';

// Modular Parts
import { PackingListHeader } from './packing/parts/PackingListHeader';
import { CategoryView } from './packing/parts/CategoryView';
import { BagView } from './packing/parts/BagView';
import { SortableItem } from './packing/parts/SortableItem';

export const PackingList = () => {
    const dispatch = useDispatch();
    const packingList = useSelector(state => state.packing.list);
    const bags = useSelector(state => state.packing.bags || []);
    const travelers = useSelector(state => state.trip.tripDetails.travelerProfiles || []);
    const { language, loading } = useSelector(state => state.ui);

    const [viewMode, setViewMode] = useState('category'); // 'category' or 'bag'
    const [aiMode, setAiMode] = useState('add');
    const t = LOCALES[language || 'en'];

    const [modal, setModal] = useState({ isOpen: false, type: null, categoryId: null, itemId: null });
    const [isBagModalOpen, setIsBagModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null, categoryId: null });
    const [formData, setFormData] = useState({ text: '', quantity: 1, bagId: '' });

    const [activeId, setActiveId] = useState(null);
    const [activeItem, setActiveItem] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const openModal = (type, categoryId = null, item = null) => {
        setModal({ isOpen: true, type, categoryId, itemId: item ? item.id : null });
        if (type === 'edit-item' && item) {
            const safeText = typeof item.text === 'object' ? (item.text.item || item.text.text || '') : item.text;
            setFormData({ text: safeText, quantity: item.quantity || 1, bagId: item.bagId || '' });
        } else if (type === 'edit-category') {
            const cat = packingList.find(c => c.id === categoryId);
            setFormData({ text: cat ? cat.category : '', quantity: 1, bagId: '' });
        } else {
            setFormData({ text: '', quantity: 1, bagId: '' });
        }
    };

    const handleModalSubmit = (e) => {
        e.preventDefault();
        const submitText = typeof formData.text === 'string' ? formData.text : String(formData.text || '');
        if (!submitText.trim()) return;

        if (modal.type === 'category') {
            dispatch(setPackingList([...packingList, { id: generateId('pcat'), category: formData.text, items: [] }]));
        } else if (modal.type === 'edit-category') {
            dispatch(setPackingList(packingList.map(cat => cat.id === modal.categoryId ? { ...cat, category: formData.text } : cat)));
        } else if (modal.type === 'item') {
            dispatch(setPackingList(packingList.map(cat => {
                if (cat.id === modal.categoryId) {
                    return { ...cat, items: [...cat.items, { id: generateId('pack'), text: formData.text, quantity: parseInt(formData.quantity) || 1, bagId: formData.bagId || null, done: false }] };
                }
                return cat;
            })));
        } else if (modal.type === 'edit-item') {
            dispatch(setPackingList(packingList.map(cat => {
                if (cat.id === modal.categoryId) {
                    return {
                        ...cat,
                        items: cat.items.map(i => i.id === modal.itemId ? { ...i, text: formData.text, quantity: parseInt(formData.quantity) || 1, bagId: formData.bagId || null } : i)
                    };
                }
                return cat;
            })));
        }
        setModal({ isOpen: false, type: null, categoryId: null, itemId: null });
    };

    const toggleItem = (itemId, categoryId) => {
        dispatch(setPackingList(packingList.map(cat => {
            if (cat.id === categoryId) {
                return { ...cat, items: cat.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) };
            }
            return cat;
        })));
    };

    const deleteItem = (itemId, categoryId) => setConfirmDelete({ isOpen: true, type: 'item', id: itemId, categoryId });
    const deleteCategory = (categoryId) => setConfirmDelete({ isOpen: true, type: 'category', id: categoryId });

    const handleConfirmDelete = () => {
        if (confirmDelete.type === 'ALL') {
            dispatch(setPackingList([]));
        } else if (confirmDelete.type === 'category') {
            dispatch(setPackingList(packingList.filter(c => c.id !== confirmDelete.id)));
        } else if (confirmDelete.type === 'item') {
            dispatch(setPackingList(packingList.map(cat => cat.id === confirmDelete.categoryId ? { ...cat, items: cat.items.filter(i => i.id !== confirmDelete.id) } : cat)));
        }
        setConfirmDelete({ isOpen: false, type: null, id: null, categoryId: null });
    };

    const getBagName = (bagId) => {
        const bag = bags.find(b => b.id === bagId);
        if (!bag) return null;
        if (bag.travelerId) {
            const owner = travelers.find(t => t.id === bag.travelerId);
            if (owner) return `${owner.nickname} - ${bag.name}`;
        }
        return bag.name;
    };

    const groupedByOwner = useMemo(() => {
        const ownerMap = {
            'unassigned': { id: 'unassigned', name: t.unassignedItems, type: 'unassigned', bags: [] }
        };
        travelers.forEach(trv => { ownerMap[trv.id] = { id: trv.id, name: trv.nickname, type: 'traveler', bags: [] }; });

        const bagGroups = {
            'unassigned_bag': { id: 'unassigned_bag', name: t.unassignedItems, type: 'none', items: [] }
        };
        ownerMap['unassigned'].bags.push(bagGroups['unassigned_bag']);

        bags.forEach(bag => {
            const ownerId = bag.travelerId || 'unassigned';
            const bagGroup = { id: bag.id, name: bag.name, type: bag.type, items: [] };
            bagGroups[bag.id] = bagGroup;
            if (ownerMap[ownerId]) ownerMap[ownerId].bags.push(bagGroup);
        });

        packingList.forEach(cat => {
            cat.items.forEach(item => {
                const bId = item.bagId || 'unassigned_bag';
                if (bagGroups[bId]) bagGroups[bId].items.push({ ...item, categoryId: cat.id });
                else bagGroups['unassigned_bag'].items.push({ ...item, categoryId: cat.id });
            });
        });

        return Object.values(ownerMap).map(o => ({
            ...o,
            bags: o.bags.filter(b => b.items.length > 0 || (b.id !== 'unassigned_bag' && viewMode === 'bag'))
        })).filter(o => o.bags.length > 0);
    }, [packingList, bags, travelers, t, viewMode]);

    const handleDragStart = (event) => {
        const { active } = event;
        setActiveId(active.id);
        if (active.data.current.type === 'item') setActiveItem(active.data.current.item);
        if (active.data.current.type === 'category') setActiveCategory(active.data.current.category);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null); setActiveItem(null); setActiveCategory(null);
        if (!over) return;

        // CATEGORY VIEW: Reordering categories or items
        if (viewMode === 'category') {
            const activeType = active.data.current.type;
            const overType = over.data.current.type;

            if (activeType === 'category' && overType === 'category') {
                if (active.id !== over.id) {
                    const oldIdx = packingList.findIndex(c => c.id === active.id);
                    const newIdx = packingList.findIndex(c => c.id === over.id);
                    dispatch(reorderCategories({ startIndex: oldIdx, endIndex: newIdx }));
                }
            } else if (activeType === 'item') {
                const sourceCatId = active.data.current.categoryId;
                const destCatId = overType === 'category' ? over.id : (over.data.current.categoryId || over.data.current.item?.categoryId);

                if (sourceCatId === destCatId) {
                    if (active.id !== over.id) {
                        const cat = packingList.find(c => c.id === sourceCatId);
                        const oldIdx = cat.items.findIndex(i => i.id === active.id);
                        const newIdx = overType === 'item' ? cat.items.findIndex(i => i.id === over.id) : cat.items.length;
                        dispatch(reorderItemsInCategory({ categoryId: sourceCatId, startIndex: oldIdx, endIndex: newIdx }));
                    }
                } else if (destCatId) {
                    const sourceCat = packingList.find(c => c.id === sourceCatId);
                    const destCat = packingList.find(c => c.id === destCatId);
                    const sourceIdx = sourceCat.items.findIndex(i => i.id === active.id);
                    const destIdx = overType === 'item' ? destCat.items.findIndex(i => i.id === over.id) : destCat.items.length;
                    dispatch(moveItemBetweenCategories({ sourceCategoryId: sourceCatId, destinationCategoryId: destCatId, sourceIndex: sourceIdx, destinationIndex: destIdx, itemId: active.id }));
                }
            }
        }
        // BAG VIEW: Move items between bags
        else if (viewMode === 'bag') {
            const activeType = active.data.current.type;
            const overType = over.data.current.type;

            if (activeType === 'item') {
                const destBagId = overType === 'bag' ? over.data.current.bagId : (over.data.current.item?.bagId || null);
                dispatch(setItemBag({ itemId: active.id, bagId: destBagId }));
            }
        }
    };

    return (
        <div className="animate-fadeIn w-full">
            <div className="mb-6">
                <SectionTitle icon={Briefcase} title={t.packingList} subtitle={t.packingSubtitle} />
            </div>

            <PackingListHeader
                loading={loading} aiMode={aiMode} setAiMode={setAiMode}
                viewMode={viewMode} setViewMode={setViewMode}
                onGenerate={(prompt, mode, attachments) => dispatch(generateTrip({ targetArea: 'packing', customPrompt: prompt, aiMode: mode, promptAttachments: attachments }))}
                onAddCategory={() => openModal('category')}
                onClearList={() => setConfirmDelete({ isOpen: true, type: 'ALL' })}
                packingListLength={packingList.length}
                t={t}
            />

            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {packingList.length === 0 ? (
                        <div className="col-span-full p-12 text-center text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">
                            {t.emptyPacking}
                            <div className="mt-4"><Button variant="secondary" onClick={() => openModal('category')}>{t.create}</Button></div>
                        </div>
                    ) : (
                        viewMode === 'category' ? (
                            <SortableContext items={packingList.map(c => c.id)} strategy={rectSortingStrategy}>
                                {packingList.map(category => (
                                    <CategoryView key={category.id} category={category} t={t} getBagName={getBagName}
                                        onAddProduct={id => openModal('item', id)}
                                        onEditCategory={id => openModal('edit-category', id)}
                                        onDeleteCategory={id => deleteCategory(id)}
                                        onToggleItem={toggleItem}
                                        onEditItem={(item, catId) => openModal('edit-item', catId, item)}
                                        onDeleteItem={deleteItem}
                                    />
                                ))}
                            </SortableContext>
                        ) : (
                            groupedByOwner.map(owner => (
                                <div key={owner.id} className="col-span-full space-y-4">
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                        {owner.type === 'traveler' ? <User size={16} className="text-indigo-600" /> : <Luggage size={16} className="text-slate-400" />}
                                        <h3 className="font-bold text-slate-700">{owner.name}</h3>
                                        <div className="h-px flex-1 bg-slate-200 ml-2"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {owner.bags.map(bagGroup => (
                                            <BagView key={bagGroup.id} bagGroup={bagGroup} ownerName={owner.name} t={t} getBagName={getBagName}
                                                onToggleItem={toggleItem}
                                                onEditItem={(item, catId) => openModal('edit-item', catId, item)}
                                                onDeleteItem={deleteItem}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                    {activeId ? (
                        activeCategory ? (
                            <div className="w-[300px] opacity-80"><CategoryView category={activeCategory} t={t} getBagName={getBagName} disabled /></div>
                        ) : activeItem ? (
                            <div className="bg-white border-2 border-indigo-500 rounded-lg p-2 shadow-2xl scale-105 pointer-events-none min-w-[200px]">
                                <SortableItem item={activeItem} t={t} getBagName={getBagName} />
                            </div>
                        ) : null
                    ) : null}
                </DragOverlay>
            </DndContext>

            <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.type === 'category' ? t.addCategory : (modal.type === 'edit-item' ? t.editItem : t.addItem)}>
                <form onSubmit={handleModalSubmit}>
                    <input autoFocus value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} placeholder={modal.type === 'category' ? t.catPlaceholder : t.itemPlaceholder} className="w-full p-2 border rounded mb-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                    {(modal.type === 'item' || modal.type === 'edit-item') && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.quantity || "Qty"}</label><input type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" /></div>
                            <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.bag || "Bag"}</label><select value={formData.bagId} onChange={e => setFormData({ ...formData, bagId: e.target.value })} className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"><option value="">-- {t.unassigned || "No Bag"} --</option>{bags.map(b => (<option key={b.id} value={b.id}>{b.name} ({b.type})</option>))}</select></div>
                        </div>
                    )}
                    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setModal({ ...modal, isOpen: false })}>{t.cancel}</Button><Button type="submit" icon={modal.type === 'edit-item' ? Edit2 : Plus}>{modal.type === 'edit-item' ? t.update : t.add}</Button></div>
                </form>
            </Modal>

            <ConfirmModal isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete({ isOpen: false, type: null, id: null, categoryId: null })} onConfirm={handleConfirmDelete} title={confirmDelete.type === 'ALL' ? t.clearList : (t.confirmDelete || 'Confirm Delete')} message={confirmDelete.type === 'ALL' ? t.confirmClear : (t.confirmDeleteMsg || "Are you sure you want to delete this? This action cannot be undone.")} />
            <BagManagerModal isOpen={isBagModalOpen} onClose={() => setIsBagModalOpen(false)} t={t} />
        </div>
    );
};

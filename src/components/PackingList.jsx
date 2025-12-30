import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Briefcase, Plus, Trash2, Edit2, Sparkles, Luggage, User } from 'lucide-react';
import { SectionTitle } from './common/SectionTitle';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { ConfirmModal } from './common/ConfirmModal';
import { AiPromptTool } from './common/AiPromptTool';
import { BagManagerModal } from './packing/BagManagerModal';
import { generateTrip } from '../store/tripSlice';
import { setPackingList } from '../store/packingSlice';
import { generateId } from '../utils/idGenerator';
import { LOCALES } from '../i18n/locales';

export const PackingList = () => {
    const dispatch = useDispatch();
    const packingList = useSelector(state => state.packing.list);
    const bags = useSelector(state => state.packing.bags || []);
    const travelers = useSelector(state => state.trip.tripDetails.travelerProfiles || []);
    const { language, loading } = useSelector(state => state.ui);
    const [localPrompt, setLocalPrompt] = useState('');
    const [aiMode, setAiMode] = useState('add');
    const [viewMode, setViewMode] = useState('category'); // 'category' or 'bag'
    const t = LOCALES[language || 'en'];

    const [modal, setModal] = useState({ isOpen: false, type: null, categoryId: null, itemId: null });
    const [isBagModalOpen, setIsBagModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null, categoryId: null });
    const [formData, setFormData] = useState({ text: '', quantity: 1, bagId: '' });

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
            // ... existing add category ...
            dispatch(setPackingList([
                ...packingList,
                { id: generateId('pcat'), category: formData.text, items: [] }
            ]));
        } else if (modal.type === 'edit-category') {
            dispatch(setPackingList(packingList.map(cat =>
                cat.id === modal.categoryId ? { ...cat, category: formData.text } : cat
            )));
        } else if (modal.type === 'item') {
            // ... existing add item ...
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
                        items: cat.items.map(i => i.id === modal.itemId ? {
                            ...i,
                            text: formData.text,
                            quantity: parseInt(formData.quantity) || 1,
                            bagId: formData.bagId || null
                        } : i)
                    };
                }
                return cat;
            })));
        }
        setModal({ isOpen: false, type: null, categoryId: null, itemId: null });
    };

    // ... (toggleItem, deleteItem, deleteCategory, handleConfirmDelete remain same)

    // Helper to get bag name
    const getBagName = (bagId) => {
        const bag = bags.find(b => b.id === bagId);
        if (!bag) return null;
        if (bag.travelerId) {
            const owner = travelers.find(t => t.id === bag.travelerId);
            if (owner) return `${owner.nickname} - ${bag.name}`;
        }
        return bag.name;
    };

    const toggleItem = (itemId, categoryId) => {
        dispatch(setPackingList(packingList.map(cat => {
            if (cat.id === categoryId) {
                return {
                    ...cat,
                    items: cat.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
                };
            }
            return cat;
        })));
    };

    const deleteItem = (itemId, categoryId) => {
        setConfirmDelete({ isOpen: true, type: 'item', id: itemId, categoryId });
    };

    const deleteCategory = (categoryId) => {
        setConfirmDelete({ isOpen: true, type: 'category', id: categoryId });
    };

    const getGroupedByOwner = () => {
        const ownerMap = {};

        // Initialize travelers
        travelers.forEach(trv => {
            ownerMap[trv.id] = {
                id: trv.id,
                name: trv.nickname,
                type: 'traveler',
                bags: []
            };
        });

        // "Unassigned" owner for bags/items with no owner
        ownerMap['unassigned'] = {
            id: 'unassigned',
            name: t.unassignedItems,
            type: 'unassigned',
            bags: []
        };

        // Initialize bag groups within owners
        const bagGroups = {};
        bags.forEach(bag => {
            const ownerId = bag.travelerId || 'unassigned';
            const bagGroup = {
                id: bag.id,
                name: bag.name,
                type: bag.type,
                items: []
            };
            bagGroups[bag.id] = bagGroup;
            if (ownerMap[ownerId]) {
                ownerMap[ownerId].bags.push(bagGroup);
            }
        });

        // Add special "No Bag" group for each owner? 
        // Or just one global "No Bag" under "Unassigned"?
        // Let's add a "No Bag" group to EVERY owner that has unassigned items.
        // Actually simpler: one "No Bag" group under "Unassigned" for items with bagId=null.

        const unassignedBag = {
            id: 'unassigned_bag',
            name: t.unassignedItems,
            type: 'none',
            items: []
        };
        bagGroups['unassigned'] = unassignedBag;
        ownerMap['unassigned'].bags.push(unassignedBag);

        // Group items into bags
        packingList.forEach(cat => {
            cat.items.forEach(item => {
                const bId = item.bagId || 'unassigned';
                if (bagGroups[bId]) {
                    bagGroups[bId].items.push({ ...item, categoryId: cat.id });
                } else if (bId !== 'unassigned') {
                    // Item assigned to a bag that doesn't exist anymore? (Should be cleaned by migration, but just in case)
                    bagGroups['unassigned'].items.push({ ...item, categoryId: cat.id });
                }
            });
        });

        // Filter out empty bags (keep unassignedBag if it has items)
        Object.values(ownerMap).forEach(owner => {
            owner.bags = owner.bags.filter(b => b.items.length > 0 || (b.id !== 'unassigned_bag' && viewMode === 'bag'));
        });

        // Filter out empty owners
        return Object.values(ownerMap).filter(o => o.bags.length > 0);
    };

    const handleConfirmDelete = () => {
        if (confirmDelete.type === 'ALL') {
            dispatch(setPackingList([]));
        } else if (confirmDelete.type === 'category') {
            dispatch(setPackingList(packingList.filter(c => c.id !== confirmDelete.id)));
        } else if (confirmDelete.type === 'item') {
            dispatch(setPackingList(packingList.map(cat =>
                cat.id === confirmDelete.categoryId
                    ? { ...cat, items: cat.items.filter(i => i.id !== confirmDelete.id) }
                    : cat
            )));
        }
        setConfirmDelete({ isOpen: false, type: null, id: null, categoryId: null });
    };

    return (
        <div className="animate-fadeIn w-full">
            <div className="mb-6">
                <SectionTitle
                    icon={Briefcase}
                    title={t.packingList}
                    subtitle={t.packingSubtitle}
                />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <AiPromptTool
                            onGenerate={(prompt, mode, attachments) => dispatch(generateTrip({ targetArea: 'packing', customPrompt: prompt, aiMode: mode, promptAttachments: attachments }))}
                            loading={loading}
                            aiMode={aiMode}
                            setAiMode={setAiMode}
                            t={t}
                            placeholder={t.customPrompt}
                        />
                    </div>
                    <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl whitespace-nowrap">
                        <button
                            onClick={() => setViewMode('category')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'category' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t.byCategory}
                        </button>
                        <button
                            onClick={() => setViewMode('bag')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'bag' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t.byBag}
                        </button>
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto">
                        <Button onClick={() => openModal('category')} icon={Plus} className="flex-1 h-10 text-xs px-6" variant="secondary">{t.addCategory}</Button>
                        {packingList.length > 0 && (
                            <Button
                                onClick={() => setConfirmDelete({ isOpen: true, type: 'ALL' })}
                                className="flex-1 h-10 text-xs px-6 text-red-600 hover:bg-red-50 border-red-200"
                                variant="secondary"
                            >
                                <Trash2 size={14} className="mr-1" /> {t.clearList}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {packingList.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-300">
                        {t.emptyPacking}
                        <div className="mt-4">
                            <Button variant="secondary" onClick={() => openModal('category')}>{t.create}</Button>
                        </div>
                    </div>
                )}

                {viewMode === 'category' ? (
                    [...packingList].map(category => (
                        <Card key={category.id} className="p-4" title={
                            <div className="flex justify-between items-center w-full">
                                <span>{category.category}</span>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openModal('item', category.id); }}
                                        className="p-1 hover:bg-indigo-50 text-indigo-600 rounded"
                                    >
                                        <Plus size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openModal('edit-category', category.id); }}
                                        className="p-1 hover:bg-indigo-50 text-indigo-600 rounded"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, type: 'category', id: category.id }); }}
                                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        }>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                {[...category.items].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)).map(item => (
                                    <div key={item.id} className="flex items-center gap-2 group">
                                        <input
                                            type="checkbox"
                                            checked={item.done}
                                            onChange={() => toggleItem(item.id, category.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                {item.text}
                                                {item.quantity > 1 && <span className="ml-1 text-xs font-bold text-slate-400">x{item.quantity}</span>}
                                            </div>
                                            {item.bagId ? (
                                                <div className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-0.5 max-w-full truncate">
                                                    {getBagName(item.bagId)}
                                                </div>
                                            ) : item.recommendedBagType ? (
                                                <div className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5 max-w-full truncate border border-dashed border-slate-300" title={t.suggestedBag || "Suggested Bag"}>
                                                    {item.recommendedBagType} (?)
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openModal('edit-item', category.id, item)}
                                                className="p-1 text-slate-300 hover:text-indigo-500"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ isOpen: true, type: 'item', id: item.id, categoryId: category.id })}
                                                className="p-1 text-slate-300 hover:text-red-500"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {category.items.length === 0 && (
                                    <div className="text-xs text-slate-400 italic text-center py-2">
                                        {t.emptyPacking}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    getGroupedByOwner().map(ownerGroup => (
                        <div key={ownerGroup.id} className="col-span-full space-y-4 mb-8">
                            <div className="flex items-center gap-2 px-1">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <User size={16} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-700">{ownerGroup.name}</h3>
                                <div className="h-px flex-1 bg-slate-100 ml-2" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {ownerGroup.bags.map(bagGroup => (
                                    <Card key={bagGroup.id} className="p-4" title={
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-2">
                                                <Luggage size={16} className={bagGroup.type === 'none' ? 'text-slate-400' : 'text-indigo-600'} />
                                                <span>
                                                    {ownerGroup.type === 'traveler' ? `${ownerGroup.name} - ${bagGroup.name}` : bagGroup.name}
                                                </span>
                                            </div>
                                        </div>
                                    }>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {[...bagGroup.items].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)).map(item => (
                                                <div key={item.id} className="flex items-center gap-2 group">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.done}
                                                        onChange={() => toggleItem(item.id, item.categoryId)}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                            {item.text}
                                                            {item.quantity > 1 && <span className="ml-1 text-xs font-bold text-slate-400">x{item.quantity}</span>}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 italic mt-0.5">
                                                            {packingList.find(c => c.id === item.categoryId)?.category}
                                                        </div>
                                                    </div>
                                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openModal('edit-item', item.categoryId, item)}
                                                            className="p-1 text-slate-300 hover:text-indigo-500"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete({ isOpen: true, type: 'item', id: item.id, categoryId: item.categoryId })}
                                                            className="p-1 text-slate-300 hover:text-red-500"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {bagGroup.items.length === 0 && bagGroup.type === 'none' && (
                                                <div className="text-xs text-slate-400 italic text-center py-2">
                                                    {t.allDone}
                                                </div>
                                            )}
                                            {bagGroup.items.length === 0 && bagGroup.type !== 'none' && (
                                                <div className="text-xs text-slate-400 italic text-center py-2">
                                                    {t.emptyBaggage || "Empty baggage"}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.type === 'category' ? t.addCategory : (modal.type === 'edit-item' ? t.editItem : t.addItem)}
            >
                <form onSubmit={handleModalSubmit}>
                    <input
                        autoFocus
                        value={formData.text}
                        onChange={e => setFormData({ ...formData, text: e.target.value })}
                        placeholder={modal.type === 'category' ? t.catPlaceholder : t.itemPlaceholder}
                        className="w-full p-2 border rounded mb-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />

                    {(modal.type === 'item' || modal.type === 'edit-item') && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {t.quantity || "Qty"}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {t.bag || "Bag"}
                                </label>
                                <select
                                    value={formData.bagId}
                                    onChange={e => setFormData({ ...formData, bagId: e.target.value })}
                                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                                >
                                    <option value="">-- {t.unassigned || "No Bag"} --</option>
                                    {bags.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setModal({ ...modal, isOpen: false })}>{t.cancel}</Button>
                        <Button type="submit" icon={modal.type === 'edit-item' ? Edit2 : Plus}>{modal.type === 'edit-item' ? t.update : t.add}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, type: null, id: null, categoryId: null })}
                onConfirm={handleConfirmDelete}
                title={confirmDelete.type === 'ALL' ? t.clearList : (t.confirmDelete || 'Confirm Delete')}
                message={confirmDelete.type === 'ALL' ? t.confirmClear : (t.confirmDeleteMsg || "Are you sure you want to delete this? This action cannot be undone.")}
            />

            <BagManagerModal
                isOpen={isBagModalOpen}
                onClose={() => setIsBagModalOpen(false)}
                t={t}
            />
        </div>
    );
};

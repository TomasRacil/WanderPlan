import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Briefcase, Plus, Trash2, Edit2, Sparkles } from 'lucide-react';
import { SectionTitle } from './common/SectionTitle';
import { Card } from './common/Card';
import { Modal } from './common/Modal';
import { Button } from './common/Button';
import { ConfirmModal } from './common/ConfirmModal';
import { AiPromptTool } from './common/AiPromptTool';
import { generateTrip } from '../store/tripSlice';
import { setPackingList } from '../store/packingSlice';
import { generateId } from '../utils/idGenerator';
import { LOCALES } from '../i18n/locales';

export const PackingList = () => {
    const dispatch = useDispatch();
    const packingList = useSelector(state => state.packing.list);
    const { language, loading } = useSelector(state => state.ui);
    const [localPrompt, setLocalPrompt] = useState('');
    const [aiMode, setAiMode] = useState('add');
    const t = LOCALES[language || 'en'];

    const [modal, setModal] = useState({ isOpen: false, category: null, item: null });
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null, categoryId: null });
    const [inputValue, setInputValue] = useState('');

    const openModal = (type, categoryId = null) => {
        setModal({ isOpen: true, type, categoryId });
        setInputValue('');
    };

    const handleModalSubmit = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        if (modal.type === 'category') {
            dispatch(setPackingList([
                ...packingList,
                { id: generateId('pcat'), category: inputValue, items: [] }
            ]));
        } else if (modal.type === 'item') {
            dispatch(setPackingList(packingList.map(cat => {
                if (cat.id === modal.categoryId) {
                    return { ...cat, items: [...cat.items, { id: generateId('pack'), text: inputValue, done: false }] };
                }
                return cat;
            })));
        }
        setModal({ isOpen: false, type: null, categoryId: null });
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

            {/* AI Generation Tool Section - Full Width */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
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

                {[...packingList].map(category => (
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
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className={`flex-1 text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {item.text}
                                    </span>
                                    <button
                                        onClick={() => setConfirmDelete({ isOpen: true, type: 'item', id: item.id, categoryId: category.id })}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            {category.items.length === 0 && (
                                <div className="text-xs text-slate-400 italic text-center py-2">
                                    {t.emptyPacking}
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.type === 'category' ? t.addCategory : t.addItem}
            >
                <form onSubmit={handleModalSubmit}>
                    <input
                        autoFocus
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder={modal.type === 'category' ? t.catPlaceholder : t.itemPlaceholder}
                        className="w-full p-2 border rounded mb-4 text-sm"
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setModal({ ...modal, isOpen: false })}>{t.cancel}</Button>
                        <Button type="submit" icon={Plus}>{t.add}</Button>
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
        </div>
    );
};

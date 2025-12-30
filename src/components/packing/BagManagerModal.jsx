import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, X, Luggage } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { addBag, updateBag, deleteBag } from '../../store/packingSlice';
import { generateId } from '../../utils/idGenerator';

export const BagManagerModal = ({ isOpen, onClose, t }) => {
    const dispatch = useDispatch();
    const bags = useSelector(state => state.packing.bags || []);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'carry-on',
        weightLimit: '',
        weightUnit: 'kg',
        quantity: 1
    });

    const resetForm = () => {
        setFormData({ name: '', type: 'carry-on', weightLimit: '', weightUnit: 'kg', quantity: 1 });
        setEditingId(null);
    };

    const handleEdit = (bag) => {
        setFormData({
            name: bag.name,
            type: bag.type || 'carry-on',
            weightLimit: bag.weightLimit || '',
            weightUnit: bag.weightUnit || 'kg',
            quantity: bag.quantity || 1
        });
        setEditingId(bag.id);
    };

    const handleDelete = (id) => {
        dispatch(deleteBag(id));
        if (editingId === id) resetForm();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) return;

        const payload = {
            ...formData,
            weightLimit: parseFloat(formData.weightLimit) || 0,
            quantity: parseInt(formData.quantity) || 1
        };

        if (editingId) {
            dispatch(updateBag({ id: editingId, ...payload }));
        } else {
            dispatch(addBag({ ...payload, id: generateId('bag') }));
        }
        resetForm();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.manageBags}>
            <div className="space-y-6">
                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {t.bagName}
                            </label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t.bagName}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {t.bagType}
                            </label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            >
                                <option value="carry-on">{t.carryOn}</option>
                                <option value="checked">{t.checkedBag}</option>
                                <option value="personal">{t.personalItem}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {t.bagQuantity}
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {t.weightLimit}
                                </label>
                                <input
                                    type="number"
                                    value={formData.weightLimit}
                                    onChange={e => setFormData({ ...formData, weightLimit: e.target.value })}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div className="w-20">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {t.unit}
                                </label>
                                <select
                                    value={formData.weightUnit}
                                    onChange={e => setFormData({ ...formData, weightUnit: e.target.value })}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                >
                                    <option value="kg">kg</option>
                                    <option value="lb">lb</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        {editingId && (
                            <Button type="button" variant="secondary" onClick={resetForm} className="text-xs">
                                {t.cancel}
                            </Button>
                        )}
                        <Button type="submit" icon={editingId ? undefined : Plus} className="text-xs">
                            {editingId ? t.updateBag : t.addBag}
                        </Button>
                    </div>
                </form>

                {/* List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {bags.length === 0 && (
                        <div className="text-center text-slate-400 italic text-sm py-4">
                            {t.noBags}
                        </div>
                    )}
                    {bags.map(bag => (
                        <div key={bag.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${bag.type === 'checked' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <Luggage size={16} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 text-sm">{bag.name} <span className="text-slate-400 font-normal">x{bag.quantity}</span></div>
                                    <div className="text-[10px] text-slate-500 font-medium">
                                        {bag.weightLimit > 0 ? `${bag.weightLimit} ${bag.weightUnit}` : t.weightLimit} • {bag.type === 'checked' ? t.checkedBag : (bag.type === 'personal' ? t.personalItem : t.carryOn)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(bag)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-50">
                                    <span className="text-xs font-bold">Edit</span>
                                </button>
                                <button onClick={() => handleDelete(bag.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-50">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

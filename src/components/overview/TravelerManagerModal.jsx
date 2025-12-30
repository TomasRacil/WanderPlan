import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, X, User } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { addTraveler, updateTraveler, deleteTraveler } from '../../store/tripSlice';
import { clearTravelerFromBags } from '../../store/packingSlice';
import { generateId } from '../../utils/idGenerator';

export const TravelerManagerModal = ({ isOpen, onClose, t }) => {
    const dispatch = useDispatch();
    const travelers = useSelector(state => state.trip.tripDetails.travelerProfiles || []);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        nickname: '',
        age: '',
        sex: 'other'
    });

    const resetForm = () => {
        setFormData({ nickname: '', age: '', sex: 'other' });
        setEditingId(null);
    };

    const handleEdit = (traveler) => {
        setFormData({
            nickname: traveler.nickname,
            age: traveler.age || '',
            sex: traveler.sex || 'other'
        });
        setEditingId(traveler.id);
    };

    const handleDelete = (id) => {
        dispatch(deleteTraveler(id));
        dispatch(clearTravelerFromBags(id));
        if (editingId === id) resetForm();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.nickname) return;

        if (editingId) {
            dispatch(updateTraveler({ id: editingId, ...formData }));
        } else {
            dispatch(addTraveler({ ...formData, id: generateId('trv') }));
        }
        resetForm();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.manageTravelers}>
            <div className="space-y-6">
                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {t.nickname}
                            </label>
                            <input
                                value={formData.nickname}
                                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                placeholder={t.nickname}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {t.age}
                            </label>
                            <input
                                type="number"
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                                placeholder={t.age}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {t.sex}
                            </label>
                            <select
                                value={formData.sex}
                                onChange={e => setFormData({ ...formData, sex: e.target.value })}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            >
                                <option value="male">{t.male}</option>
                                <option value="female">{t.female}</option>
                                <option value="other">{t.other}</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        {editingId && (
                            <Button type="button" variant="secondary" onClick={resetForm} className="text-xs">
                                {t.cancel}
                            </Button>
                        )}
                        <Button type="submit" icon={editingId ? undefined : Plus} className="text-xs">
                            {editingId ? t.updateTraveler : t.addTraveler}
                        </Button>
                    </div>
                </form>

                {/* List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {travelers.length === 0 && (
                        <div className="text-center text-slate-400 italic text-sm py-4">
                            {t.noTravelers}
                        </div>
                    )}
                    {travelers.map(trv => (
                        <div key={trv.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <User size={16} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 text-sm">{trv.nickname}</div>
                                    <div className="text-[10px] text-slate-500 font-medium">
                                        {trv.age ? `${trv.age} y/o` : 'Age N/A'} • {t[trv.sex] || trv.sex}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleEdit(trv)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-xs font-bold">{t.edit}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(trv.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-50 transition-colors"
                                >
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

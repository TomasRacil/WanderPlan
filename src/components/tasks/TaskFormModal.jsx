import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, CheckCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AttachmentManager } from '../common/AttachmentManager';

export const TaskFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    activeCurrencies,
    categories,
    t
}) => {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            text: '',
            deadline: '',
            cost: '',
            currency: 'USD',
            category: 'Documents',
            isPaid: false,
            timeToComplete: '',
            notes: '',
            attachmentIds: [],
            links: []
        }
    });

    useEffect(() => {
        if (isOpen) {
            reset(initialData || {
                text: '',
                deadline: '',
                cost: '',
                currency: activeCurrencies[0]?.code || 'USD',
                category: 'Documents',
                isPaid: false,
                timeToComplete: '',
                notes: '',
                attachmentIds: [],
                links: []
            });
        }
    }, [isOpen, initialData, activeCurrencies, reset]);

    const onFormSubmit = (data) => {
        onSubmit(data);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? t.editTask : t.addItem}
        >
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.title}</label>
                        <input
                            autoFocus
                            {...register('text', { required: t.taskPlaceholder + ' is required' })}
                            className={`w-full p-2 bg-slate-50 border ${errors.text ? 'border-red-500' : 'border-slate-200'} rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none`}
                            placeholder={t.taskPlaceholder}
                        />
                        {errors.text && <p className="text-red-500 text-xs mt-1">{errors.text.message}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.deadline}</label>
                        <input
                            type="date"
                            {...register('deadline')}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.category}</label>
                        <select
                            {...register('category')}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>
                                    {t[`cat_${c.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')}`] || c}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.timeToComplete}</label>
                        <input
                            {...register('timeToComplete')}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder={t.timePlaceholder}
                        />
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t.cost}</label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            {...register('cost')}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm min-w-0 font-bold"
                            placeholder="0"
                        />
                        <div className="w-28 shrink-0">
                            <select
                                {...register('currency')}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shrink-0 h-[38px]">
                            <input
                                type="checkbox"
                                id="modal-paid-task"
                                {...register('isPaid')}
                                className="w-4 h-4 rounded text-indigo-600 mr-2"
                            />
                            <label htmlFor="modal-paid-task" className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">
                                {t.paid}
                            </label>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.notes}</label>
                    <textarea
                        {...register('notes')}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder={t.notesPlaceholder}
                        rows="2"
                    />
                </div>

                {/* Attachments */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.attachments} & {t.links}</label>
                    <AttachmentManager
                        attachmentIds={watch('attachmentIds') || []}
                        links={watch('links') || []}
                        onUpdate={(data) => {
                            if (data.attachmentIds) setValue('attachmentIds', data.attachmentIds);
                            if (data.links) setValue('links', data.links);
                        }}
                        t={t}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
                    <Button type="submit" className="flex-1" icon={initialData ? CheckCircle : Plus}>{initialData ? t.saveChanges : t.addItem}</Button>
                </div>
            </form>
        </Modal>
    );
};

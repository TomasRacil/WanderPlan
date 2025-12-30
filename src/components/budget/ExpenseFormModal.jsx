import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, CheckCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export const ExpenseFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    activeCurrencies,
    categories,
    t
}) => {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            title: '',
            amount: '',
            currency: 'USD',
            category: 'Food'
        }
    });

    useEffect(() => {
        if (isOpen) {
            reset(initialData || {
                title: '',
                amount: '',
                currency: activeCurrencies[0]?.code || 'USD',
                category: 'Food'
            });
        }
    }, [isOpen, initialData, activeCurrencies, reset]);

    const onFormSubmit = (data) => {
        onSubmit(data);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? (t.editTransaction || "Edit Transaction") : t.addExpense}>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.description}</label>
                    <input
                        {...register('title', { required: true })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. Lunch"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.amount}</label>
                        <input
                            type="number"
                            step="0.01"
                            {...register('amount', { required: true })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.currency}</label>
                        <select
                            {...register('currency')}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                        </select>
                    </div>
                </div>
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
                <div className="flex gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} className="flex-1">{t.cancel}</Button>
                    <Button type="submit" className="flex-1" icon={initialData ? CheckCircle : Plus}>
                        {initialData ? t.saveChanges : t.addTransaction}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

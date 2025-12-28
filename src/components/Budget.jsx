import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Wallet, PieChart, CreditCard, DollarSign, Plus, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { BUDGET_CATEGORIES } from '../data/budgetConstants';
import { SectionTitle, Card, Button, Modal, ConfirmModal } from './CommonUI';
import { setExpenses, updateTripDetails, setItinerary, setPreTripTasks, fetchExchangeRates, updateExchangeRate, fetchPairRate } from '../store/tripSlice';
import { calculateBudgetTotals, formatMoney, convertToHome, parseCost } from '../utils/helpers';
import { SearchableSelect } from './SearchableSelect';
import { ALL_CURRENCIES } from '../data/currencies';
import { LOCALES } from '../i18n/locales';
import { RefreshCw, Coins } from 'lucide-react';


export const Budget = () => {
    const dispatch = useDispatch();
    const { expenses, itinerary, preTripTasks, tripDetails, language, exchangeRates = {} } = useSelector(state => state.trip);

    // Filtered list of currencies allowed (Home + Added)
    const activeCurrencies = ALL_CURRENCIES.filter(c =>
        c.code === tripDetails.homeCurrency ||
        Object.keys(exchangeRates).includes(c.code)
    );

    const [expenseCurrency, setExpenseCurrency] = useState(tripDetails.lastUsedCurrency || tripDetails.tripCurrency);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
    const [loadingRates, setLoadingRates] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

    const t = LOCALES[language || 'en'];

    // Pass exchangeRates to calculateBudgetTotals
    const totals = calculateBudgetTotals(expenses, itinerary, preTripTasks, tripDetails, exchangeRates);
    const totalBudget = parseCost(tripDetails.budget) || 1;
    const percentage = Math.min(100, (totals.totalSpent / totalBudget) * 100);

    const handleRateUpdate = (currency, rate) => {
        dispatch(updateExchangeRate({ currency, rate: parseFloat(rate) }));
    };

    const handleAddCurrency = async (currency) => {
        if (!currency) return;
        setLoadingRates(true);
        await dispatch(fetchPairRate({ base: tripDetails.homeCurrency, target: currency }));
        setLoadingRates(false);
    };

    const handleFetchRates = async () => {
        setLoadingRates(true);
        await dispatch(fetchExchangeRates(tripDetails.homeCurrency));
        setLoadingRates(false);
    };

    const togglePaid = (item) => {
        if (item.source === 'itinerary') {
            dispatch(setItinerary(itinerary.map(i => i.id === item.id ? { ...i, isPaid: !i.isPaid } : i)));
        } else if (item.source === 'task') {
            dispatch(setPreTripTasks(preTripTasks.map(t => t.id === item.id ? { ...t, isPaid: !t.isPaid } : t)));
        }
    };

    const deleteExpense = (id) => {
        setConfirmDelete({ isOpen: true, id });
    };

    const handleConfirmDelete = () => {
        if (confirmDelete.id) {
            dispatch(setExpenses(expenses.filter(e => e.id !== confirmDelete.id)));
        }
    };

    const unifiedExpenses = [
        ...expenses.map(e => ({ ...e, source: 'expense', date: e.date || new Date().toISOString(), isPaid: true })),
        ...itinerary.filter(i => parseCost(i.cost) > 0).map(i => ({ ...i, source: 'itinerary', amount: parseCost(i.cost), date: i.startDate || i.date, title: i.title, category: i.category || i.type })),
        ...preTripTasks.filter(t => parseCost(t.cost) > 0).map(t => ({ ...t, source: 'task', amount: parseCost(t.cost), date: 'Pre-Trip', title: t.text, category: t.category || 'Documents' }))
    ].sort((a, b) => {
        if (a.date === 'Pre-Trip') return -1;
        if (b.date === 'Pre-Trip') return 1;
        return new Date(b.date) - new Date(a.date);
    });

    const openEditModal = (item) => {
        setEditingItem(item);
        setExpenseCurrency(item.currency);
        setIsEditModalOpen(true);
    };

    const handleAddExpense = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const amount = parseCost(formData.get('amount'));
        if (!amount) return;

        const newExpense = {
            id: Date.now(),
            title: formData.get('title'),
            category: formData.get('category'),
            amount: amount,
            currency: expenseCurrency,
            date: new Date().toISOString()
        };
        dispatch(setExpenses([...expenses, newExpense]));
        setIsAddModalOpen(false);
    };

    const handleEditExpense = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const amount = parseCost(formData.get('amount'));
        if (!amount) return;

        if (editingItem.source === 'expense') {
            dispatch(setExpenses(expenses.map(e => e.id === editingItem.id ? {
                ...e,
                title: formData.get('title'),
                category: formData.get('category'),
                amount: amount,
                currency: expenseCurrency
            } : e)));
        } else if (editingItem.source === 'itinerary') {
            dispatch(setItinerary(itinerary.map(i => i.id === editingItem.id ? {
                ...i,
                title: formData.get('title'),
                cost: amount,
                currency: expenseCurrency
                // Category is currently inferred from type in some places, but we store it too
            } : i)));
        } else if (editingItem.source === 'task') {
            dispatch(setPreTripTasks(preTripTasks.map(t => t.id === editingItem.id ? {
                ...t,
                text: formData.get('title'),
                cost: amount,
                currency: expenseCurrency
            } : t)));
        }

        setIsEditModalOpen(false);
        setEditingItem(null);
    };

    const onCurrencyChange = (val) => {
        setExpenseCurrency(val);
        dispatch(updateTripDetails({ lastUsedCurrency: val }));
    };

    return (
        <div className="animate-fadeIn">
            <SectionTitle
                icon={Wallet}
                title={t.tripBudget}
                subtitle={`${t.trackExpenses} ${tripDetails.homeCurrency}.`}
            />

            <div className="mb-6 flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 pr-4 border-r border-slate-100 w-full sm:w-auto">
                    <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{t.primaryCurrency}:</span>
                    <div className="flex-1 sm:w-48">
                        <SearchableSelect
                            options={ALL_CURRENCIES}
                            value={tripDetails.homeCurrency}
                            onChange={(val) => dispatch(updateTripDetails({ homeCurrency: val }))}
                            labelKey="name"
                            valueKey="code"
                            placeholder={t.selectCurrency}
                            variant="light"
                            renderOption={(opt) => `${opt.code} (${opt.symbol})`}
                        />
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-4 items-center overflow-x-auto py-1 custom-scrollbar flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">{t.activeRates}:</span>
                    {Object.entries(exchangeRates || {}).length === 0 && (
                        <span className="text-xs text-slate-400 italic">{t.noRates}</span>
                    )}
                    {Object.entries(exchangeRates || {}).map(([curr, rate]) => (
                        <div key={curr} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg border border-indigo-100 shrink-0">
                            <span className="text-xs font-bold text-indigo-700">{curr}</span>
                            <span className="text-[10px] text-indigo-400 hidden sm:inline">1 {tripDetails.homeCurrency} =</span>
                            <span className="text-xs font-medium text-slate-700">{rate.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Enhanced Summary Card */}
                <Card className="p-0 md:col-span-3 bg-white border-none shadow-lg overflow-hidden flex flex-col md:flex-row">
                    <div className="flex-1 bg-slate-900 text-white p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-indigo-300 font-bold text-sm uppercase tracking-wider">{t.totalSpent} ({t.paid})</h3>
                                <div className="text-4xl font-bold">{formatMoney(totals.totalSpent, tripDetails.homeCurrency)}</div>
                            </div>
                            <div className="text-right">
                                <h4 className="text-indigo-300 text-xs uppercase font-bold mb-1">{t.remaining}</h4>
                                <div className={`text-2xl font-bold ${totals.remaining < 0 ? 'text-red-400' : 'text-white'}`}>
                                    {formatMoney(totals.remaining, tripDetails.homeCurrency)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-xs text-slate-300">
                                <span>{t.budgetProgress}</span>
                                <span>{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${totals.remaining < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-slate-400 text-xs pt-4 border-t border-slate-800">
                            <div>
                                <span className="uppercase font-bold block mb-1">{t.projectedTotal}</span>
                                <span className="text-lg font-bold text-slate-200">{formatMoney(totals.projectedTotal, tripDetails.homeCurrency)}</span>
                            </div>
                            <Button variant="secondary" onClick={() => setIsRatesModalOpen(true)} className="text-[10px] py-1 px-2" icon={Plus}>
                                Add Currency
                            </Button>
                        </div>
                    </div>

                    <div className="w-full md:w-80 bg-slate-50 p-6 border-l border-slate-100">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <PieChart size={16} /> {t.categoryBreakdown}
                        </h4>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                            {Object.entries(totals.breakdown).map(([cat, data]) => (
                                <div key={cat} className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                        <span>{cat}</span>
                                        <span>{formatMoney(data.paid, tripDetails.homeCurrency)} / {formatMoney(data.total, tripDetails.homeCurrency)}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                                        <div
                                            className="bg-indigo-500 h-full"
                                            style={{ width: `${(data.paid / (data.total || 1)) * 100}%` }}
                                        ></div>
                                        <div
                                            className="bg-slate-300 h-full"
                                            style={{ width: `${(data.estimated / (data.total || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Transactions List */}
                <div className="md:col-span-3">
                    <Card className="h-full flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <CreditCard size={18} /> {t.recentExpenses}
                            </h3>
                            <Button onClick={() => setIsAddModalOpen(true)} icon={Plus} className="py-1.5 px-3 text-xs">
                                {t.addTransaction}
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                            <div className="space-y-2">
                                {unifiedExpenses.map((item) => (
                                    <div key={`${item.source}-${item.id}`} className={`flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg group transition-colors border ${item.isPaid ? 'border-transparent hover:border-emerald-100' : 'border-dashed border-slate-200 bg-slate-50/50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${item.source === 'expense' ? 'bg-indigo-50 text-indigo-600' : (item.source === 'itinerary' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600')}`}>
                                                {item.source === 'expense' ? <DollarSign size={16} /> : (item.source === 'itinerary' ? <Wallet size={16} /> : <CreditCard size={16} />)}
                                            </div>
                                            <div>
                                                <div className={`font-medium text-sm ${item.isPaid ? 'text-slate-800' : 'text-slate-500'}`}>{item.title}</div>
                                                <div className="text-xs text-slate-500 capitalize">{item.source} • {item.category} • {item.date === 'Pre-Trip' ? 'Pre-Trip' : new Date(item.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className={`font-bold ${item.isPaid ? 'text-slate-700' : 'text-slate-400'}`}>{item.currency} {item.amount.toFixed(2)}</div>
                                                {item.currency !== tripDetails.homeCurrency && (
                                                    <div className="text-[10px] text-slate-400">
                                                        ~ {formatMoney(convertToHome(item.amount, item.currency, tripDetails, exchangeRates), tripDetails.homeCurrency)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {item.source === 'expense' ? (
                                                    <button
                                                        onClick={() => deleteExpense(item.id)}
                                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isPaid}
                                                        onChange={() => togglePaid(item)}
                                                        className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                        title="Mark as Paid"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Add Expense Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t.addExpense}>
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.description}</label>
                        <input name="title" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Lunch" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.amount}</label>
                            <input type="number" step="0.01" name="amount" required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.currency}</label>
                            <select
                                value={expenseCurrency}
                                onChange={(e) => onCurrencyChange(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.category}</label>
                        <select name="category" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            {BUDGET_CATEGORIES.map(c => (
                                <option key={c} value={c}>
                                    {t[`cat_${c.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')}`] || c}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsAddModalOpen(false)} className="flex-1">{t.cancel}</Button>
                        <Button type="submit" className="flex-1" icon={Plus}>{t.addTransaction}</Button>
                    </div>
                </form>

            </Modal>

            {/* Edit Expense Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingItem(null); }} title={t.editEvent || "Edit Transaction"}>
                {editingItem && (
                    <form onSubmit={handleEditExpense} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.description}</label>
                            <input name="title" defaultValue={editingItem.title} required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.amount}</label>
                                <input type="number" step="0.01" name="amount" defaultValue={editingItem.amount} required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.currency}</label>
                                <select
                                    value={expenseCurrency}
                                    onChange={(e) => onCurrencyChange(e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                            </div>
                        </div>
                        {editingItem.source === 'expense' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.category}</label>
                                <select name="category" defaultValue={editingItem.category} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                    {BUDGET_CATEGORIES.map(c => (
                                        <option key={c} value={c}>
                                            {t[`cat_${c.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')}`] || c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex gap-2 pt-2">
                            <Button variant="secondary" onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }} className="flex-1">{t.cancel}</Button>
                            <Button type="submit" className="flex-1" icon={CheckCircle}>{t.saveChanges}</Button>
                        </div>
                    </form>
                )}
            </Modal>
            {/* Exchange Rates Modal */}
            <Modal isOpen={isRatesModalOpen} onClose={() => setIsRatesModalOpen(false)} title="Exchange Rates">
                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-slate-500 mb-3">{t.baseCurrency}: <span className="font-bold">{tripDetails.homeCurrency}</span></p>
                        <div className="flex gap-2">
                            <Button onClick={handleFetchRates} disabled={loadingRates} icon={RefreshCw} className="flex-1">
                                {loadingRates ? t.updating : t.updateApi}
                            </Button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.addNewCurrency}</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <SearchableSelect
                                    options={ALL_CURRENCIES.filter(c => !(exchangeRates?.[c.code]) && c.code !== tripDetails.homeCurrency)}
                                    value=""
                                    onChange={handleAddCurrency}
                                    labelKey="name"
                                    valueKey="code"
                                    placeholder="Select Currency to Add"
                                    variant="light"
                                    renderOption={(opt) => `${opt.code} - ${opt.name}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.managedRates}</label>
                        {Object.entries(exchangeRates || {}).map(([currency, rate]) => (
                            <div key={currency} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-700 w-16">{currency}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">1 {tripDetails.homeCurrency} = </span>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        value={rate || ''}
                                        onChange={(e) => handleRateUpdate(currency, e.target.value)}
                                        className="w-24 p-1.5 text-sm border border-slate-200 rounded text-right focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="Rate"
                                    />
                                    <span className="text-xs text-slate-400">{currency}</span>
                                    <button onClick={() => {
                                        const newRates = { ...exchangeRates };
                                        delete newRates[currency];
                                        dispatch(setExchangeRates(newRates));
                                    }} className="text-slate-300 hover:text-red-500 ml-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={handleConfirmDelete}
                title={t.confirmDelete || 'Delete Expense'}
                message={t.confirmDeleteMsg || 'Are you sure you want to delete this expense? This action cannot be undone.'}
            />
        </div >
    );
};

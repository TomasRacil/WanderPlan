import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Wallet, RefreshCw, Trash2 } from 'lucide-react';
import { BUDGET_CATEGORIES } from '../data/budgetConstants';
import { SectionTitle } from './common/SectionTitle';
import { Button } from './common/Button';
import { Modal } from './common/Modal';
import { ConfirmModal } from './common/ConfirmModal';
import { setExpenses, updateTripDetails, fetchExchangeRates, updateExchangeRate, fetchPairRate, setExchangeRates } from '../store/tripSlice';
import { setItinerary } from '../store/itinerarySlice';
import { setTasks as setPreTripTasks } from '../store/resourceSlice';
import { calculateBudgetTotals, parseCost } from '../utils/helpers';
import { SearchableSelect } from './common/SearchableSelect';
import { ALL_CURRENCIES } from '../data/currencies';
import { LOCALES } from '../i18n/locales';

// Sub-components
import { BudgetSummaryChart } from './budget/BudgetSummaryChart';
import { ExpenseList } from './budget/ExpenseList';
import { ExpenseFormModal } from './budget/ExpenseFormModal';

export const Budget = () => {
    const dispatch = useDispatch();
    const { expenses, tripDetails, exchangeRates = {} } = useSelector(state => state.trip);
    const { items: itinerary } = useSelector(state => state.itinerary);
    const { tasks: preTripTasks } = useSelector(state => state.resources);
    const { language } = useSelector(state => state.ui);
    const t = LOCALES[language || 'en'];

    // Filtered list of currencies allowed (Home + Added)
    const activeCurrencies = ALL_CURRENCIES.filter(c =>
        c.code === tripDetails.homeCurrency ||
        Object.keys(exchangeRates).includes(c.code)
    );

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
    const [loadingRates, setLoadingRates] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });

    // Pass exchangeRates to calculateBudgetTotals
    const totals = calculateBudgetTotals(expenses, itinerary, preTripTasks, tripDetails, exchangeRates);
    const totalBudget = parseCost(tripDetails.budget) || 1;
    const percentage = Math.min(100, (totals.totalSpent / totalBudget) * 100);

    const unifiedExpenses = useMemo(() => [
        ...expenses.map(e => ({ ...e, source: 'expense', date: e.date || new Date().toISOString(), isPaid: true })),
        ...itinerary.filter(i => parseCost(i.cost) > 0).map(i => ({ ...i, source: 'itinerary', amount: parseCost(i.cost), date: i.startDate || i.date, title: i.title, category: i.category || i.type })),
        ...preTripTasks.filter(t => parseCost(t.cost) > 0).map(t => ({ ...t, source: 'task', amount: parseCost(t.cost), date: 'Pre-Trip', title: t.text, category: t.category || 'Documents' }))
    ].sort((a, b) => {
        if (a.date === 'Pre-Trip') return -1;
        if (b.date === 'Pre-Trip') return 1;
        return new Date(b.date) - new Date(a.date);
    }), [expenses, itinerary, preTripTasks]);

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
        setConfirmDelete({ isOpen: false, id: null });
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleSaveExpense = (data) => {
        const amount = parseCost(data.amount);
        if (!amount) return;

        if (editingItem) {
            // Edit Mode
            if (editingItem.source === 'expense') {
                dispatch(setExpenses(expenses.map(e => e.id === editingItem.id ? {
                    ...e,
                    title: data.title,
                    category: data.category,
                    amount: amount,
                    currency: data.currency
                } : e)));
            } else if (editingItem.source === 'itinerary') {
                dispatch(setItinerary(itinerary.map(i => i.id === editingItem.id ? {
                    ...i,
                    title: data.title,
                    cost: amount,
                    currency: data.currency,
                    category: data.category
                } : i)));
            } else if (editingItem.source === 'task') {
                dispatch(setPreTripTasks(preTripTasks.map(t => t.id === editingItem.id ? {
                    ...t,
                    text: data.title,
                    cost: amount,
                    currency: data.currency,
                    category: data.category
                } : t)));
            }
        } else {
            // Add Mode
            const newExpense = {
                id: Date.now(),
                title: data.title,
                category: data.category,
                amount: amount,
                currency: data.currency,
                date: new Date().toISOString()
            };
            dispatch(setExpenses([...expenses, newExpense]));
            dispatch(updateTripDetails({ lastUsedCurrency: data.currency }));
        }
        setIsFormOpen(false);
        setEditingItem(null);
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
                <BudgetSummaryChart
                    totals={totals}
                    percentage={percentage}
                    tripDetails={tripDetails}
                    onAddCurrency={() => setIsRatesModalOpen(true)}
                    t={t}
                />

                <div className="md:col-span-3">
                    <ExpenseList
                        expenses={unifiedExpenses}
                        onEdit={openEditModal}
                        onDelete={deleteExpense}
                        onTogglePaid={togglePaid}
                        onAdd={() => { setEditingItem(null); setIsFormOpen(true); }}
                        tripDetails={tripDetails}
                        exchangeRates={exchangeRates}
                        t={t}
                    />
                </div>
            </div>

            {/* Consolidated Add/Edit Modal */}
            <ExpenseFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
                onSubmit={handleSaveExpense}
                initialData={editingItem}
                activeCurrencies={activeCurrencies}
                categories={BUDGET_CATEGORIES}
                t={t}
            />

            {/* Exchange Rates Modal (Kept inlined as it is specific and relatively small) */}
            <Modal isOpen={isRatesModalOpen} onClose={() => setIsRatesModalOpen(false)} title={t.exchangeRatesTitle || "Exchange Rates"}>
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
                                    placeholder={t.selectCurrencyToAdd || "Select Currency to Add"}
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
                                        placeholder={t.ratePlaceholder || "Rate"}
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
                title={t.deleteExpense || 'Delete Expense'}
                message={t.confirmDeleteMsg || 'Are you sure you want to delete this expense? This action cannot be undone.'}
            />
        </div >
    );
};

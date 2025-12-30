import React from 'react';
import { CreditCard, Plus, DollarSign, Wallet, Edit2, Trash2 } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { formatMoney, convertToHome } from '../../utils/helpers';

export const ExpenseList = ({
    expenses,
    onEdit,
    onDelete,
    onTogglePaid,
    onAdd,
    tripDetails,
    exchangeRates,
    t
}) => {
    return (
        <Card className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <CreditCard size={18} /> {t.recentExpenses}
                </h3>
                <Button onClick={onAdd} icon={Plus} className="py-1.5 px-3 text-xs">
                    {t.addTransaction}
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                <div className="space-y-2">
                    {expenses.map((item) => (
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
                                    <div className={`font-bold ${item.isPaid ? 'text-slate-700' : 'text-slate-400'}`}>{formatMoney(item.amount, item.currency)}</div>
                                    {item.currency !== tripDetails.homeCurrency && (
                                        <div className="text-[10px] text-slate-400">
                                            ~ {formatMoney(convertToHome(item.amount, item.currency, tripDetails, exchangeRates), tripDetails.homeCurrency)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onEdit(item)}
                                        className="text-slate-300 hover:text-indigo-600 opacity-40 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    {item.source === 'expense' ? (
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            className="text-slate-300 hover:text-red-500 opacity-40 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    ) : (
                                        <input
                                            type="checkbox"
                                            checked={item.isPaid}
                                            onChange={() => onTogglePaid(item)}
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
    );
};

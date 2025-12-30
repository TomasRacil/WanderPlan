import React from 'react';
import { PieChart, Plus } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { formatMoney } from '../../utils/helpers';

export const BudgetSummaryChart = ({
    totals,
    percentage,
    tripDetails,
    onAddCurrency,
    t
}) => {
    return (
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
                    <Button variant="secondary" onClick={onAddCurrency} className="text-[10px] py-1 px-2" icon={Plus}>
                        {t.addCurrency}
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
    );
};

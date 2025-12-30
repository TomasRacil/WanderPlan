import React from 'react';
import { Globe } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { Card } from '../common/Card';
import { SearchableSelect } from '../common/SearchableSelect';
import { updateTripDetails } from '../../store/tripSlice';
import { ALL_CURRENCIES } from '../../data/currencies';

export const TripSettingsCard = ({ tripDetails, t }) => {
    const dispatch = useDispatch();

    return (
        <Card className="p-6 border-slate-200 bg-white/50 backdrop-blur-sm !overflow-visible shadow-indigo-100/50">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold flex items-center gap-3 text-slate-800">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Globe size={18} />
                    </div>
                    {t.tripSettings || "Trip Settings"}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Basics</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6">
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t.travelStyle || "Travel Style"}</label>
                    <select
                        value={tripDetails.travelStyle}
                        onChange={(e) => dispatch(updateTripDetails({ travelStyle: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-300"
                    >
                        <option value="Balanced">{t.balanced}</option>
                        <option value="Relaxed">{t.relaxed}</option>
                        <option value="Adventure">{t.adventure}</option>
                        <option value="Foodie">{t.foodie}</option>
                        <option value="Cultural">{t.cultural}</option>
                    </select>
                </div>

                <div className="space-y-1.5 !overflow-visible">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t.currency || "Home Currency"}</label>
                    <div className="relative z-50">
                        <SearchableSelect
                            options={ALL_CURRENCIES}
                            value={tripDetails.homeCurrency}
                            onChange={(val) => dispatch(updateTripDetails({ homeCurrency: val }))}
                            labelKey="name"
                            valueKey="code"
                            placeholder={t.currency}
                            variant="light"
                            renderOption={(opt) => `${opt.code} - ${opt.name}`}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t.budget || "Total Budget"}</label>
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none transition-colors group-focus-within:text-indigo-600">
                            <span className="text-xs font-bold text-slate-400">{tripDetails.homeCurrency}</span>
                        </div>
                        <input
                            value={tripDetails.budget}
                            onChange={(e) => dispatch(updateTripDetails({ budget: e.target.value }))}
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 pl-12 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all shadow-sm hover:border-slate-300"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t.travelers || "Travelers"}</label>
                    <div className="relative group">
                        <input
                            type="number"
                            min="1"
                            value={tripDetails.travelers || 1}
                            onChange={(e) => dispatch(updateTripDetails({ travelers: parseInt(e.target.value) || 1 }))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all shadow-sm hover:border-slate-300"
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
};

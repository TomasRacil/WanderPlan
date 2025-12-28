import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';
import { applyProposedChanges, discardProposedChanges } from '../store/tripSlice';
import { Button } from './CommonUI';

export const ReviewModal = () => {
    const dispatch = useDispatch();
    const proposedChanges = useSelector(state => state.trip.proposedChanges);
    const { language } = useSelector(state => state.trip.tripDetails || {});
    // Simple fallback if translation not available in context, or assume 'en'
    // In a real app we'd use the centralized `t` from locales, but here we can just use english labels or pass generic ones.

    if (!proposedChanges) return null;

    const { data, targetArea, aiMode } = proposedChanges;

    const renderContent = () => {
        if (!data) return <p>No data received.</p>;

        const sections = [];

        if (data.newItinerary && data.newItinerary.length > 0) {
            sections.push(
                <div key="itin" className="mb-4">
                    <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">Itinerary</span>
                        <span className="text-sm font-normal text-slate-500">{data.newItinerary.length} items</span>
                    </h4>
                    <ul className="text-sm text-slate-600 max-h-40 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-100">
                        {data.newItinerary.map((item, idx) => (
                            <li key={idx} className="mb-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-sm">
                                <div className="font-bold text-slate-800 flex justify-between">
                                    <span>{item.title || item.type}</span>
                                    <span className="text-xs text-indigo-600 font-normal border border-indigo-100 bg-indigo-50 px-2 py-0.5 rounded">{item.startTime}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                                    <span className="flex items-center gap-1">📅 {item.startDate}</span>
                                    {item.duration && <span className="flex items-center gap-1">• ⏳ {item.duration}m</span>}
                                    {item.cost > 0 && <span className="flex items-center gap-1">• 💰 {item.cost} {item.currency}</span>}
                                    {item.location && <span className="flex items-center gap-1">• 📍 {item.location}</span>}
                                </div>
                                {item.notes && <div className="mt-2 text-xs italic text-slate-600 bg-slate-50 p-2 rounded border-l-2 border-slate-300">{item.notes}</div>}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }

        if (data.newPreTrip && data.newPreTrip.length > 0) {
            sections.push(
                <div key="tasks" className="mb-4">
                    <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Tasks</span>
                        <span className="text-sm font-normal text-slate-500">{data.newPreTrip.length} items</span>
                    </h4>
                    <ul className="max-h-60 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-100">
                        {data.newPreTrip.map((item, idx) => (
                            <li key={idx} className="mb-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-sm">
                                <div className="font-bold text-slate-800">{item.text}</div>
                                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                                    {item.deadline && <span>📅 Deadline: {item.deadline}</span>}
                                    {item.cost > 0 && <span>💰 {item.cost} {item.currency}</span>}
                                </div>
                                {item.notes && <div className="mt-2 text-xs italic text-slate-600 bg-slate-50 p-2 rounded border-l-2 border-slate-300">{item.notes}</div>}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }

        if (data.newPacking && data.newPacking.length > 0) {
            let itemCount = 0;
            data.newPacking.forEach(c => itemCount += c.items.length);
            sections.push(
                <div key="packing" className="mb-4">
                    <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">Packing</span>
                        <span className="text-sm font-normal text-slate-500">{itemCount} items</span>
                    </h4>
                    <ul className="max-h-60 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-100">
                        {data.newPacking.map((cat, idx) => (
                            <li key={idx} className="mb-3">
                                <h5 className="font-bold text-xs text-slate-500 uppercase mb-1 border-b border-slate-200 pb-1">{cat.category}</h5>
                                <ul className="space-y-1">
                                    {cat.items.map((item, i) => (
                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                            <span className="text-slate-400">•</span> {typeof item === 'string' ? item : item.item}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }

        if (sections.length === 0) {
            return <p className="text-slate-500 italic">No significant changes found.</p>;
        }

        return sections;
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-indigo-50 to-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Sparkles className="text-indigo-600" size={20} />
                            Review AI Suggestions
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {aiMode === 'dedupe' ? 'Cleaning up duplicates...' :
                                aiMode === 'update' ? 'Updating existing items...' :
                                    aiMode === 'fill' ? 'Filling gaps...' : 'Adding new suggestions...'}
                        </p>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {renderContent()}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => dispatch(discardProposedChanges())} icon={X} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                        Reject
                    </Button>
                    <Button variant="primary" onClick={() => dispatch(applyProposedChanges())} icon={Check}>
                        Accept Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};

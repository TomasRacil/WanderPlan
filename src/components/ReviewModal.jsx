import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Check, X, Sparkles, RotateCcw, Trash2, Edit3, PlusCircle } from 'lucide-react';
import { applyProposedChanges, discardProposedChanges, toggleProposedChange } from '../store/tripSlice';
import { Button } from './CommonUI';

export const ReviewModal = () => {
    const dispatch = useDispatch();
    const proposedChanges = useSelector(state => state.trip.proposedChanges);
    const itinerary = useSelector(state => state.trip.itinerary);
    const preTripTasks = useSelector(state => state.trip.preTripTasks);
    const packingList = useSelector(state => state.trip.packingList);

    if (!proposedChanges) return null;

    const { data, targetArea, aiMode } = proposedChanges;

    const getItemLabel = (id) => {
        if (!id || String(id) === 'undefined' || String(id) === 'null') return 'Unnamed Item';

        const stringId = String(id);

        if (targetArea === 'itinerary') {
            const item = itinerary.find(i => i.id && String(i.id) === stringId);
            return item ? item.title : `Event ${stringId}`;
        }
        if (targetArea === 'tasks') {
            const item = preTripTasks.find(t => t.id && String(t.id) === stringId);
            return item ? item.text : `Task ${stringId}`;
        }
        if (targetArea === 'packing') {
            // Check categories
            const cat = packingList.find(c => c.id && String(c.id) === stringId);
            if (cat) return cat.category || 'Unnamed Category';

            // Check items inside all categories
            for (const category of packingList) {
                const item = category.items.find(i => i.id && String(i.id) === stringId);
                if (item) return item.text || 'Unnamed Item';
            }

            return `Item ${stringId}`;
        }
        return `Item ${stringId}`;
    };

    const handleToggle = (type, id) => {
        dispatch(toggleProposedChange({ type, id }));
    };

    const renderContent = () => {
        if (!data) return <p>No data received.</p>;

        const sections = [];
        const { adds = [], updates = [], deletes = [] } = data;

        // Render Adds
        if (adds.length > 0) {
            sections.push(
                <div key="adds" className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-600 mb-3 uppercase tracking-wider">
                        <PlusCircle size={16} />
                        New Items to Add ({adds.filter(a => !a.ignored).length}/{adds.length})
                    </h4>
                    <div className="space-y-2">
                        {adds.map((item, idx) => {
                            const addId = JSON.stringify(item);
                            return (
                                <div key={`add-${idx}`} className={`p-3 bg-white border rounded-lg shadow-sm text-sm transition-all duration-200 flex justify-between items-start group ${item.ignored ? 'opacity-40 grayscale border-slate-200' : 'border-emerald-100 hover:border-emerald-300'}`}>
                                    <div className="flex-1">
                                        <div className={`font-bold text-slate-800 ${item.ignored ? 'line-through' : ''}`}>{item.title || item.text || (item.category ? item.category + ' items' : 'New Content')}</div>
                                        {targetArea === 'itinerary' && (
                                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                                                <span>📅 {item.startDate}</span>
                                                <span>🕒 {item.startTime}</span>
                                                {item.cost > 0 && <span>💰 {item.cost} {item.currency}</span>}
                                            </div>
                                        )}
                                        {targetArea === 'packing' && (item.items && Array.isArray(item.items)) && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {item.items.map((i, k) => <span key={k} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">{i}</span>)}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleToggle('adds', addId)}
                                        className={`ml-2 p-1.5 rounded-full transition-colors ${item.ignored ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                        title={item.ignored ? "Restore" : "Revoke"}
                                    >
                                        {item.ignored ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Render Updates
        if (updates.length > 0) {
            sections.push(
                <div key="updates" className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-3 uppercase tracking-wider">
                        <Edit3 size={16} />
                        Updates to Existing Items ({updates.filter(u => !u.ignored).length}/{updates.length})
                    </h4>
                    <div className="space-y-2">
                        {updates.map((upd, idx) => (
                            <div key={`upd-${idx}`} className={`p-3 bg-white border rounded-lg shadow-sm text-sm transition-all duration-200 flex justify-between items-start group ${upd.ignored ? 'opacity-40 grayscale border-slate-200' : 'border-blue-100 hover:border-blue-300'}`}>
                                <div className="flex-1">
                                    <div className={`text-xs font-bold text-blue-500 mb-1 border-b border-blue-50 pb-1 ${upd.ignored ? 'line-through' : ''}`}>{getItemLabel(upd.id)}</div>
                                    {upd.fields && Object.entries(upd.fields).map(([key, val]) => (
                                        <div key={key} className="flex gap-2 text-[11px] py-0.5">
                                            <span className="text-slate-400 font-medium w-20 shrink-0 capitalize">{key}:</span>
                                            <span className="text-slate-700">{val}</span>
                                        </div>
                                    ))}
                                    {upd.newItems && (
                                        <div className="text-[11px] mt-1">
                                            <span className="text-emerald-600 font-bold">+ Add:</span> {upd.newItems.join(', ')}
                                        </div>
                                    )}
                                    {upd.removeItems && (
                                        <div className="text-[11px] mt-1">
                                            <span className="text-red-600 font-bold">- Remove:</span> {upd.removeItems.map(rid => getItemLabel(rid)).join(', ')}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleToggle('updates', upd.id)}
                                    className={`ml-2 p-1.5 rounded-full transition-colors ${upd.ignored ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                    title={upd.ignored ? "Restore" : "Revoke"}
                                >
                                    {upd.ignored ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Render Deletes
        if (deletes.length > 0) {
            sections.push(
                <div key="deletes" className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-red-600 mb-3 uppercase tracking-wider">
                        <Trash2 size={16} />
                        Items to Remove ({deletes.filter(d => !d.ignored).length}/{deletes.length})
                    </h4>
                    <div className="space-y-2">
                        {deletes.map((del, idx) => {
                            const dId = typeof del === 'string' ? del : del.id;
                            const isIgnored = typeof del === 'object' && del.ignored;
                            return (
                                <div key={`del-${idx}`} className={`p-2.5 bg-white border rounded-lg text-xs flex justify-between items-center transition-all duration-200 group ${isIgnored ? 'opacity-40 grayscale border-slate-200' : 'border-red-100 bg-red-50/30'}`}>
                                    <span className={`font-medium ${isIgnored ? 'text-slate-400 line-through' : 'text-red-700'}`}>{getItemLabel(dId)}</span>
                                    <div className="flex items-center gap-2">
                                        {!isIgnored && <span className="font-bold text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">DELETE</span>}
                                        <button
                                            onClick={() => handleToggle('deletes', dId)}
                                            className={`p-1.5 rounded-full transition-colors ${isIgnored ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-300 hover:text-slate-700 hover:bg-white border-transparent hover:border-slate-200 border'}`}
                                            title={isIgnored ? "Restore" : "Revoke"}
                                        >
                                            {isIgnored ? <RotateCcw size={14} /> : <X size={14} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (data.phrasebook) {
            sections.push(
                <div key="phrase" className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <h4 className="font-bold text-indigo-700 text-sm mb-1 uppercase">New Phrasebook</h4>
                    <p className="text-xs text-indigo-600">Full phrasebook generated for {data.phrasebook.language}.</p>
                </div>
            );
        }

        if (sections.length === 0) {
            return (
                <div className="text-center py-12">
                    <p className="text-slate-400 italic text-sm">No specific changes detected.</p>
                </div>
            );
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

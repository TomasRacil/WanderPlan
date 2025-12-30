import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Check, X, Sparkles, RotateCcw, Trash2, Edit3, PlusCircle } from 'lucide-react';
import { discardProposedChanges, toggleProposedChange } from '../../store/tripSlice';
import { implementProposedChanges as applyProposedChanges } from '../../store/thunks';
import { Modal } from './Modal';
import { Button } from './Button';
import { LOCALES } from '../../i18n/locales';

export const ReviewModal = () => {
    const dispatch = useDispatch();
    const proposedChanges = useSelector(state => state.trip.proposedChanges);
    const itinerary = useSelector(state => state.itinerary.items);
    const preTripTasks = useSelector(state => state.resources.tasks);
    const packingList = useSelector(state => state.packing.list);
    const bags = useSelector(state => state.packing.bags || []);
    const documents = useSelector(state => state.resources.documents || {});
    const travelers = useSelector(state => state.trip.tripDetails?.travelerProfiles || []);
    const language = useSelector(state => state.ui.language);
    const t = LOCALES[language || 'en'];

    if (!proposedChanges) return null;

    const { data, targetArea, aiMode } = proposedChanges;

    const findOriginalItem = (id) => {
        const stringId = String(id);
        if (targetArea === 'itinerary') return itinerary.find(i => String(i.id) === stringId);
        if (targetArea === 'tasks') return preTripTasks.find(t => String(t.id) === stringId);
        if (targetArea === 'packing') {
            const cat = packingList.find(c => String(c.id) === stringId);
            if (cat) return cat;
            // Check Bags
            const bag = bags.find(b => String(b.id) === stringId);
            if (bag) return { title: `Bag: ${bag.name}` }; // pseudo-item for label

            for (const category of packingList) {
                const item = category.items.find(i => String(i.id) === stringId);
                if (item) return item;
            }
        }
        return null;
    };

    const getItemLabel = (id) => {
        if (!id || String(id) === 'undefined' || String(id) === 'null') return t.unnamedItem;
        const item = findOriginalItem(id);
        if (item) return item.title || item.text || item.category || (item.item ? item.item : `Item ${id}`); // Added item.item check just in case
        return `Item ${id}`;
    };

    const getBagLabel = (bagId) => {
        if (bagId) {
            const bag = bags.find(b => String(b.id) === String(bagId));
            if (bag) {
                let label = bag.name;
                if (bag.travelerId) {
                    const owner = travelers.find(t => t.id === bag.travelerId);
                    if (owner) label = `${owner.nickname || owner.name} - ${bag.name}`;
                }
                return label;
            }
        }
        return null; // Was recommendedType || bagId
    };

    const getAttachmentLabel = (docId) => {
        const doc = documents[String(docId)];
        return doc ? (doc.name || doc.title || `Doc ${docId}`) : `Doc ${docId}`;
    };

    const formatFieldValue = (key, val) => {
        if (val === null || val === undefined) return '---';

        // Handle Bag IDs
        if (key === 'bagId') {
            return getBagLabel(val);
        }

        // Handle Attachment IDs
        if (key === 'attachmentIds' && Array.isArray(val)) {
            return val.map(id => getAttachmentLabel(id)).join(', ');
        }

        if (key === 'attachmentId') {
            return getAttachmentLabel(val);
        }

        // Handle Booleans
        if (typeof val === 'boolean') return val ? '✅' : '❌';

        return String(val);
    };

    const handleToggle = (type, id) => {
        dispatch(toggleProposedChange({ type, id }));
    };

    const renderContent = () => {
        if (!data) return <p>{t.noDataReceived}</p>;

        const sections = [];
        const { adds = [], updates = [], deletes = [], categoryUpdates = [], itemUpdates = [], removeItems = [] } = data;

        // Normalize New Schema to Old Format for Rendering
        // Merge categoryUpdates into adds/updates logic
        const allAdds = [...adds];
        const allUpdates = [...updates];
        const allDeletes = [...deletes];

        // 1. Map categoryUpdates -> visual updates or adds
        categoryUpdates.forEach(catUpd => {
            // Find if we should treat this as an update to a category
            const existingCat = packingList.find(c => String(c.id) === String(catUpd.categoryId));
            if (existingCat) {
                // It's an update to an existing category
                allUpdates.push({
                    id: catUpd.categoryId,
                    newItems: catUpd.newItems,
                    fields: {} // no property changes, just new items
                });
            } else {
                // Weird case, maybe treated as new category if we had that info, but for now map to update
                allUpdates.push({
                    id: catUpd.categoryId,
                    newItems: catUpd.newItems
                });
            }
        });

        // 2. Map itemUpdates -> visual updates
        itemUpdates.forEach(itemUpd => {
            allUpdates.push({
                id: itemUpd.itemId,
                fields: itemUpd.updates
            });
        });

        // 3. Map removeItems -> visual deletes or updates with removeItems
        if (removeItems.length > 0) {
            // We can show them as "Deletes" for simplicity
            removeItems.forEach(id => {
                allDeletes.push({ id });
            });
        }

        // Render Adds
        if (allAdds.length > 0) {
            sections.push(
                <div key="adds" className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-600 mb-3 uppercase tracking-wider">
                        <PlusCircle size={16} />
                        {t.newItems} ({allAdds.filter(a => !a.ignored).length}/{allAdds.length})
                    </h4>
                    <div className="space-y-2">
                        {allAdds.map((item, idx) => {
                            const addId = JSON.stringify(item);
                            return (
                                <div key={`add-${idx}`} className={`p-3 bg-white border rounded-lg shadow-sm text-sm transition-all duration-200 flex justify-between items-start group ${item.ignored ? 'opacity-40 grayscale border-slate-200' : 'border-emerald-100 hover:border-emerald-300'}`}>
                                    <div className="flex-1">
                                        <div className={`font-bold text-slate-800 ${item.ignored ? 'line-through' : ''}`}>{item.title || item.text || (item.category ? item.category + ' items' : t.newContent)}</div>
                                        {targetArea === 'itinerary' && (
                                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                                                <span>📅 {item.startDate}</span>
                                                <span>🕒 {item.startTime}</span>
                                                {item.cost > 0 && <span>💰 {item.cost} {item.currency}</span>}
                                            </div>
                                        )}
                                        {targetArea === 'packing' && (item.items && Array.isArray(item.items)) && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {item.items.map((i, k) => {
                                                    const itemData = typeof i === 'string' ? { item: i } : i;
                                                    const text = itemData.item || itemData.text;
                                                    const qty = itemData.quantity > 1 ? ` x${itemData.quantity}` : '';
                                                    // Try to predict which bag it will go to if bagId is missing but we have a type
                                                    // Removing predictive logic as per user request to disable auto-assignment
                                                    const effectiveBagId = itemData.bagId;
                                                    const bagTag = getBagLabel(effectiveBagId);

                                                    return (
                                                        <span key={k} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] flex items-center gap-1">
                                                            <span className="font-medium text-slate-700">{text}</span>
                                                            {qty && <span className="text-indigo-600 font-bold">{qty}</span>}
                                                            {bagTag && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded">💼 {bagTag}</span>}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {item.attachmentIds && item.attachmentIds.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {item.attachmentIds.map(aid => (
                                                    <span key={aid} className="text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                                        📎 {getAttachmentLabel(aid)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleToggle('adds', addId)}
                                        className={`ml-2 p-1.5 rounded-full transition-colors ${item.ignored ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                        title={item.ignored ? t.restore : t.revoke}
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
        if (allUpdates.length > 0) {
            sections.push(
                <div key="updates" className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-3 uppercase tracking-wider">
                        <Edit3 size={16} />
                        {t.updates} ({allUpdates.filter(u => !u.ignored).length}/{allUpdates.length})
                    </h4>
                    <div className="space-y-2">
                        {allUpdates.map((upd, idx) => (
                            <div key={`upd-${idx}`} className={`p-3 bg-white border rounded-lg shadow-sm text-sm transition-all duration-200 flex justify-between items-start group ${upd.ignored ? 'opacity-40 grayscale border-slate-200' : 'border-blue-100 hover:border-blue-300'}`}>
                                <div className="flex-1">
                                    <div className={`text-xs font-bold text-blue-500 mb-1 border-b border-blue-50 pb-1 ${upd.ignored ? 'line-through' : ''}`}>{getItemLabel(upd.id)}</div>
                                    {upd.fields && Object.entries(upd.fields).map(([key, val]) => {
                                        const originalItem = findOriginalItem(upd.id);
                                        const oldVal = originalItem ? originalItem[key] : null;

                                        const formattedOld = formatFieldValue(key, oldVal);
                                        const formattedNew = formatFieldValue(key, val);

                                        return (
                                            <div key={key} className="flex flex-col gap-1 py-1 border-b border-dashed border-slate-100 last:border-0">
                                                <span className="text-slate-400 text-[10px] font-bold uppercase">{key}</span>
                                                <div className="flex items-center gap-2 text-xs">
                                                    {oldVal !== undefined && oldVal !== null && (
                                                        <span className="text-slate-400 line-through decoration-slate-300 decoration-2">{formattedOld}</span>
                                                    )}
                                                    {oldVal !== undefined && oldVal !== null && <span className="text-slate-300">→</span>}
                                                    <span className="font-bold text-blue-700">{formattedNew}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {upd.newItems && (
                                        <div className="text-[11px] mt-1 space-y-1">
                                            <div className="text-emerald-600 font-bold mb-0.5">+ Add:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {upd.newItems.map((ni, nidx) => {
                                                    const itemData = typeof ni === 'string' ? { item: ni } : ni;
                                                    const text = itemData.item || itemData.text;
                                                    const qty = itemData.quantity > 1 ? ` x${itemData.quantity}` : '';
                                                    const bagTag = getBagLabel(itemData.bagId, itemData.recommendedBagType);

                                                    return (
                                                        <span key={nidx} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] flex items-center gap-1">
                                                            <span>{text}</span>
                                                            {qty && <span className="font-bold">{qty}</span>}
                                                            {bagTag && <span className="text-[9px] bg-emerald-100 px-1 rounded opacity-80">💼 {bagTag}</span>}
                                                        </span>
                                                    );
                                                })}
                                            </div>
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
                                    title={upd.ignored ? t.restore : t.revoke}
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
        if (allDeletes.length > 0) {
            sections.push(
                <div key="deletes" className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-red-600 mb-3 uppercase tracking-wider">
                        <Trash2 size={16} />
                        {t.deletes} ({allDeletes.filter(d => !d.ignored).length}/{allDeletes.length})
                    </h4>
                    <div className="space-y-2">
                        {allDeletes.map((del, idx) => {
                            const dId = typeof del === 'string' ? del : del.id;
                            const isIgnored = typeof del === 'object' && del.ignored;
                            return (
                                <div key={`del-${idx}`} className={`p-2.5 bg-white border rounded-lg text-xs flex justify-between items-center transition-all duration-200 group ${isIgnored ? 'opacity-40 grayscale border-slate-200' : 'border-red-100 bg-red-50/30'}`}>
                                    <span className={`font-medium ${isIgnored ? 'text-slate-400 line-through' : 'text-red-700'}`}>{getItemLabel(dId)}</span>
                                    <div className="flex items-center gap-2">
                                        {!isIgnored && <span className="font-bold text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{t.delete}</span>}
                                        <button
                                            onClick={() => handleToggle('deletes', dId)}
                                            className={`p-1.5 rounded-full transition-colors ${isIgnored ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-300 hover:text-slate-700 hover:bg-white border-transparent hover:border-slate-200 border'}`}
                                            title={isIgnored ? t.restore : t.revoke}
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
                    <h4 className="font-bold text-indigo-700 text-sm mb-1 uppercase">{t.newPhrasebook}</h4>
                    <p className="text-xs text-indigo-600">{t.phrasebookGenMsg} {data.phrasebook.language}.</p>
                </div>
            );
        }

        if (sections.length === 0) {
            return (
                <div className="text-center py-12">
                    <p className="text-slate-400 italic text-sm">{t.noChanges}</p>
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
                            {t.reviewAi}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {aiMode === 'dedupe' ? t.aiCleaning :
                                aiMode === 'update' ? t.aiUpdating :
                                    aiMode === 'fill' ? t.aiFilling : t.aiAdding}
                        </p>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {data.changeSummary && (
                        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl relative">
                            <Sparkles className="absolute top-4 left-4 text-indigo-500" size={16} />
                            <p className="text-sm text-indigo-900 pl-7 italic">
                                "{data.changeSummary}"
                            </p>
                        </div>
                    )}
                    {renderContent()}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => dispatch(discardProposedChanges())} icon={X} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                        {t.reject}
                    </Button>
                    <Button variant="primary" onClick={async () => {
                        await dispatch(applyProposedChanges());
                        dispatch(discardProposedChanges());
                    }} icon={Check}>
                        {t.acceptChanges}
                    </Button>
                </div>
            </div>
        </div>
    );
};

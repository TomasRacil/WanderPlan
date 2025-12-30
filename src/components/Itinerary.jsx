import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar, MapPin, Map as MapIcon, Edit2, Save as SaveIcon, Trash2, CheckCircle, Plus, Sparkles, Paperclip, Link as LinkIcon, Clock, Globe, Loader2 } from 'lucide-react';
import { BUDGET_CATEGORIES } from '../data/budgetConstants';
import { EVENT_TYPES, TYPE_TO_CATEGORY } from '../data/eventConstants';
import { SectionTitle, Card, Button, Modal, ConfirmModal } from './CommonUI';
import { updateTripDetails, generateTrip } from '../store/tripSlice';
import { setItinerary } from '../store/itinerarySlice';
import { getEventIcon, getEventColor, generateGoogleMapsLink, parseCost, getBudgetCategory } from '../utils/helpers';
import { SearchableSelect } from './SearchableSelect';
import { ALL_CURRENCIES } from '../data/currencies';
import { LOCALES } from '../i18n/locales';
import { LocationAutocomplete } from './LocationAutocomplete';
import { AttachmentManager } from './AttachmentManager';
import { FilePreviewModal } from './FilePreviewModal';
import { AiPromptTool } from './AiPromptTool';

// Infer category from type
const getCategory = (type) => {
    return TYPE_TO_CATEGORY[type] || 'Activities';
};

export const Itinerary = () => {
    const dispatch = useDispatch();
    const { tripDetails, exchangeRates = {} } = useSelector(state => state.trip);
    const { items: itinerary } = useSelector(state => state.itinerary);
    const { documents = {} } = useSelector(state => state.resources);
    const { language, loading } = useSelector(state => state.ui);
    const [localPrompt, setLocalPrompt] = useState('');

    // Filtered list of currencies allowed (Home + Added)
    const activeCurrencies = ALL_CURRENCIES.filter(c =>
        c.code === tripDetails.homeCurrency ||
        Object.keys(exchangeRates).includes(c.code)
    );

    const t = LOCALES[language || 'en'];

    // Derive all unique attachments for the Library
    // Derived document library is now handled internally by AttachmentManager using Redux state

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [aiMode, setAiMode] = useState('add');
    const [editMode, setEditMode] = useState(false);
    const [formError, setFormError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
    const [previewFile, setPreviewFile] = useState(null);
    const [loadingStartTz, setLoadingStartTz] = useState(false);
    const [loadingEndTz, setLoadingEndTz] = useState(false);
    const [promptResetTrigger, setPromptResetTrigger] = useState(0);
    const [addForm, setAddForm] = useState({
        id: null,
        title: '', type: 'Activity',
        startDateTime: '', duration: 120, // Duration in minutes
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: '', coordinates: null, endLocation: '', endCoordinates: null, notes: '', cost: '', currency: tripDetails.lastUsedCurrency || 'USD', isPaid: false,
        attachmentIds: [],
        links: []
    });

    const calculateEndTime = (startDateStr, startTimeStr, durationMinutes, startTz, endTz) => {
        if (!startDateStr || !startTimeStr) return { endDate: startDateStr, endTime: '' };

        const start = new Date(`${startDateStr}T${startTimeStr}`);
        const end = new Date(start.getTime() + durationMinutes * 60000);

        let finalEnd = end;
        let tzLabel = null;

        if (startTz && endTz && startTz !== endTz) {
            try {
                const getOffset = (d, tz) => {
                    const str = d.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
                    const match = str.match(/([+-])(\d+):(\d+)/);
                    if (!match) return 0;
                    return (match[1] === '+' ? 1 : -1) * (parseInt(match[2]) * 60 + parseInt(match[3]));
                };
                const startOffset = getOffset(start, startTz);
                const endOffset = getOffset(end, endTz);
                const diff = endOffset - startOffset;
                finalEnd = new Date(end.getTime() + diff * 60000);
                tzLabel = endTz;
            } catch (e) { console.error('TZ Error', e); }
        }

        const pad = n => n.toString().padStart(2, '0');
        const endDate = `${finalEnd.getFullYear()}-${pad(finalEnd.getMonth() + 1)}-${pad(finalEnd.getDate())}`;
        const endTime = `${pad(finalEnd.getHours())}:${pad(finalEnd.getMinutes())}`;

        return { endDate, endTime, tzLabel };
    };

    const handleGenerate = (prompt, mode, attachments) => {
        dispatch(generateTrip({ targetArea: 'itinerary', customPrompt: prompt, aiMode: mode, promptAttachments: attachments }))
            .unwrap()
            .then(() => {
                // Clear prompt on success
                setPromptResetTrigger(prev => prev + 1);
            })
            .catch(err => {
                console.error("Geneation failed", err);
                // Do not clear prompt on error
            });
    };

    const handleAddOpen = () => {
        let defaultStart = '';
        const pad = (n) => n.toString().padStart(2, '0');

        if (itinerary.length > 0) {
            // Find last event by date/time
            const sorted = [...itinerary].sort((a, b) => {
                const dateA = new Date((a.endDate || a.startDate || a.date) + 'T' + (a.endTime || a.startTime || '00:00'));
                const dateB = new Date((b.endDate || b.startDate || b.date) + 'T' + (b.endTime || b.startTime || '00:00'));
                return dateB - dateA; // Descending
            });
            const lastEvent = sorted[0];

            if (lastEvent) {
                const lastEnd = new Date((lastEvent.endDate || lastEvent.startDate || lastEvent.date) + 'T' + (lastEvent.endTime || lastEvent.startTime || '10:00'));
                // Add 1 hour buffer
                // lastEnd.setHours(lastEnd.getHours() + 1); // Maybe don't auto-buffer, just take same day?

                // Format for datetime-local: YYYY-MM-DDTHH:mm
                defaultStart = `${lastEnd.getFullYear()}-${pad(lastEnd.getMonth() + 1)}-${pad(lastEnd.getDate())}T${pad(lastEnd.getHours())}:${pad(lastEnd.getMinutes())}`;
            }
        } else if (tripDetails?.startDate) {
            defaultStart = `${tripDetails.startDate}T10:00`;
        }

        setAddForm({
            id: null,
            title: '', type: 'Activity',
            startDateTime: defaultStart, duration: 60,
            timeZone: tripDetails.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            destinationTimeZone: tripDetails.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            location: '', coordinates: null, endLocation: '', endCoordinates: null, notes: '', cost: '', currency: tripDetails.lastUsedCurrency || 'USD', isPaid: false,
            attachments: [],
            links: []
        });
        setEditMode(false);
        setFormError('');
        setIsAddModalOpen(true);
    };

    const handleEditOpen = (item) => {
        // Calculate duration from start/end if available in legacy item, else use item.duration or default 60
        let duration = item.duration || 60;
        if (!item.duration && item.startTime && item.endTime) {
            const start = new Date(`2000-01-01T${item.startTime}`);
            const end = new Date(`2000-01-01T${item.endTime}`);
            if (end > start) {
                duration = (end - start) / 60000;
            }
        }

        setAddForm({
            id: item.id,
            title: item.title,
            type: item.type,
            startDateTime: `${item.startDate || item.date}T${item.startTime || item.time}`,
            duration: duration,
            timeZone: item.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            destinationTimeZone: item.destinationTimeZone || item.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            location: item.location,
            coordinates: item.coordinates,
            endLocation: item.endLocation || '',
            endCoordinates: item.endCoordinates || null,
            notes: item.notes,
            cost: item.cost,
            currency: item.currency,
            isPaid: item.isPaid,
            attachmentIds: item.attachmentIds || [],
            links: item.links || []
        });
        setEditMode(true);
        setFormError('');
        setIsAddModalOpen(true);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        setFormError('');

        // Basic Validation
        if (!addForm.title) { setFormError(t.title + ' is required'); return; }
        if (!addForm.startDateTime) { setFormError(t.dateRange + ' is required'); return; }
        if (addForm.duration <= 0) { setFormError(t.durationPositive); return; }

        const [startDate, startTime] = addForm.startDateTime ? addForm.startDateTime.split('T') : ['', ''];

        // Calculate end date/time internally for storage if needed, but we mostly rely on duration now.
        // But for sorting and compatibility we might want to store implicit endTime or just duration.
        // We will store duration mostly.

        const newItem = {
            id: editMode ? addForm.id : Date.now(),
            title: addForm.title,
            type: addForm.type,
            category: getBudgetCategory(addForm.type, null),
            startDate,
            startTime,
            duration: parseInt(addForm.duration),
            timeZone: addForm.timeZone,
            destinationTimeZone: addForm.destinationTimeZone,
            location: addForm.location,
            coordinates: addForm.coordinates,
            endLocation: addForm.endLocation,
            endCoordinates: addForm.endCoordinates,
            notes: addForm.notes,
            cost: parseCost(addForm.cost),
            currency: addForm.currency,
            isPaid: addForm.isPaid,
            isEditing: false,
            attachments: addForm.attachments,
            links: addForm.links
        };

        if (editMode) {
            dispatch(setItinerary(itinerary.map(i => i.id === newItem.id ? newItem : i).sort((a, b) => new Date(a.startDate + ' ' + a.startTime) - new Date(b.startDate + ' ' + b.startTime))));
        } else {
            dispatch(setItinerary([...itinerary, newItem].sort((a, b) => new Date(a.startDate + ' ' + a.startTime) - new Date(b.startDate + ' ' + b.startTime))));
        }
        setIsAddModalOpen(false);
    };

    const handleDelete = (id) => {
        setConfirmDelete({ isOpen: true, id });
    };

    const handleConfirmDelete = () => {
        if (confirmDelete.id) {
            dispatch(setItinerary(itinerary.filter(i => i.id !== confirmDelete.id)));
        }
    };

    const updateItineraryItem = (id, field, value) => {
        dispatch(setItinerary(itinerary.map(item => item.id === id ? { ...item, [field]: value } : item)));
        if (field === 'currency') {
            dispatch(updateTripDetails({ lastUsedCurrency: value }));
        }
    };

    const groupedItinerary = itinerary.reduce((groups, item) => {
        const date = item.startDate || item.date; // Fallback for old items
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedItinerary).sort();

    // Helper for duration display
    const formatDuration = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0 && m > 0) return `${h}${t.hoursAbbr} ${m}${t.minutesAbbr}`;
        if (h > 0) return `${h}${t.hoursAbbr}`;
        return `${m}${t.minutesAbbr}`;
    };

    return (
        <div className="animate-fadeIn">
            <div className="mb-6">
                <SectionTitle icon={Calendar} title={t.itinerary} subtitle={t.itinerarySubtitle} />
            </div>

            {/* AI Generation Tool Section - Full Width */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                        <AiPromptTool
                            onGenerate={handleGenerate}
                            loading={loading}
                            aiMode={aiMode}
                            setAiMode={setAiMode}
                            t={t}
                            placeholder={t.customPrompt}
                            resetTrigger={promptResetTrigger}
                        />
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto">
                        <Button onClick={handleAddOpen} icon={Plus} className="flex-1 h-10 text-xs px-6" variant="secondary">{t.addEvent}</Button>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Timeline Side */}
                <div className="lg:col-span-3">
                    {itinerary.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <Calendar size={48} className="mb-4 opacity-50" />
                            <p>{t.emptyItinerary}</p>
                            <Button variant="secondary" className="mt-4" onClick={handleAddOpen}>{t.addEvent}</Button>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {sortedDates.map(dateKey => (
                                <div key={dateKey} className="relative">
                                    {/* Day Header */}
                                    <div className="flex items-center justify-between mb-6 bg-slate-100 p-3 rounded-xl sticky top-0 z-30 shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                            <Calendar size={18} className="text-indigo-600" />
                                            {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <a
                                            href={generateGoogleMapsLink(groupedItinerary[dateKey])}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-50 flex items-center gap-1 font-medium transition-colors"
                                        >
                                            <MapIcon size={12} /> {t.viewDailyRoute}
                                        </a>
                                    </div>

                                    {/* Events Line */}
                                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                        {groupedItinerary[dateKey].map((item, idx) => {
                                            const { endDate, endTime, tzLabel } = calculateEndTime(item.startDate || item.date, item.startTime || item.time, item.duration || 60, item.timeZone, item.destinationTimeZone);

                                            return (
                                                <div key={item.id} className="relative flex items-start group">
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute left-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm z-10 ${getEventColor(item.type)}`}>
                                                        {getEventIcon(item.type)}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="ml-16 bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex-1 hover:shadow-md transition-shadow">

                                                        {item.isEditing ? (
                                                            <div className="space-y-3">
                                                                <input value={item.title} onChange={e => updateItineraryItem(item.id, 'title', e.target.value)} className="w-full border p-1 rounded text-sm font-bold" />
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="flex items-center gap-1">
                                                                        <input type="date" value={item.startDate || item.date} onChange={e => updateItineraryItem(item.id, 'startDate', e.target.value)} className="border p-1 rounded text-sm flex-1 min-w-0" />
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <input type="time" value={item.startTime || item.time} onChange={e => updateItineraryItem(item.id, 'startTime', e.target.value)} className="border p-1 rounded text-sm flex-1 min-w-0" />
                                                                    </div>
                                                                    <div className="col-span-2 flex items-center gap-1">
                                                                        <Clock size={14} className="text-slate-400" />
                                                                        <input type="number" value={item.duration || 60} onChange={e => updateItineraryItem(item.id, 'duration', parseInt(e.target.value))} className="border p-1 rounded text-sm w-20" /> <span className="text-xs text-slate-400">{t.minutesAbbr}</span>
                                                                    </div>
                                                                </div>
                                                                <input value={item.location} onChange={e => updateItineraryItem(item.id, 'location', e.target.value)} className="w-full border p-1 rounded text-sm" placeholder={t.location} />
                                                                <textarea value={item.notes} onChange={e => updateItineraryItem(item.id, 'notes', e.target.value)} className="w-full border p-1 rounded text-sm h-20" placeholder={t.notesPlaceholder} />
                                                                <div className="space-y-2">
                                                                    <select value={item.type} onChange={e => updateItineraryItem(item.id, 'type', e.target.value)} className="border p-2 rounded-lg text-sm w-full bg-slate-50">
                                                                        {EVENT_TYPES.map(type => (
                                                                            <option key={type} value={type}>{type}</option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                        <label className="text-xs font-bold text-slate-500 uppercase px-1">{t.cost}</label>
                                                                        <input type="number" value={item.cost} onChange={e => updateItineraryItem(item.id, 'cost', parseFloat(e.target.value))} className="bg-white border border-slate-200 rounded p-1 text-sm w-full outline-none" placeholder="0" />
                                                                        <select value={item.currency} onChange={e => updateItineraryItem(item.id, 'currency', e.target.value)} className="bg-white border border-slate-200 rounded p-1 text-xs font-bold w-30 outline-none">
                                                                            {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                                                        </select>
                                                                        <div className="flex items-center gap-1 shrink-0 ml-1 border-l pl-2 border-slate-200">
                                                                            <input type="checkbox" checked={item.isPaid} onChange={e => updateItineraryItem(item.id, 'isPaid', e.target.checked)} id={`paid-${item.id}`} className="w-4 h-4 text-indigo-600 rounded" />
                                                                            <label htmlFor={`paid-${item.id}`} className="text-[10px] font-bold text-slate-500 uppercase">{t.paid}</label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end gap-2 mt-2">
                                                                    <Button variant="secondary" onClick={() => updateItineraryItem(item.id, 'isEditing', false)}>{t.cancel}</Button>
                                                                    <Button onClick={() => updateItineraryItem(item.id, 'isEditing', false)} icon={SaveIcon}>{t.saveChanges}</Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col md:flex-row gap-4">
                                                                {item.image && (
                                                                    <div className="w-full md:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                                                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <h4 className="font-bold text-lg text-slate-800">{item.title}</h4>
                                                                            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400 uppercase mt-1">
                                                                                <span>{item.type || 'Activity'}•</span>
                                                                                <span className="flex items-center gap-1"><Clock size={10} /> {formatDuration(item.duration || 60)}</span>
                                                                                {item.cost > 0 && (
                                                                                    <span className={`px-2 py-0.5 rounded-full ${item.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                                        {item.currency} {item.cost} {item.isPaid ? t.paidSuffix : t.estSuffix}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-[11px] font-bold text-indigo-600 leading-tight">
                                                                                <div className="flex flex-col items-end">
                                                                                    <span>{new Date((item.startDate || item.date) + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {item.startTime || item.time}</span>
                                                                                    {endTime && (
                                                                                        <span className="text-slate-400 font-normal">
                                                                                            to {endDate !== (item.startDate || item.date) && `${new Date(endDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • `}
                                                                                            {endTime}
                                                                                            {endDate !== (item.startDate || item.date) && (
                                                                                                <span className="ml-1 text-orange-500 font-bold">
                                                                                                    +{Math.round((new Date(endDate + 'T00:00:00') - new Date((item.startDate || item.date) + 'T00:00:00')) / (1000 * 60 * 60 * 24))}d
                                                                                                </span>
                                                                                            )}
                                                                                        </span>
                                                                                    )}
                                                                                    <div className="mt-1 flex flex-col items-end gap-0.5">
                                                                                        {item.timeZone && <span className="text-[10px] text-slate-400 font-normal uppercase">{item.timeZone.split('/').pop().replace(/_/g, ' ')}</span>}
                                                                                        {item.destinationTimeZone && item.destinationTimeZone !== item.timeZone && (
                                                                                            <span className="text-[10px] text-indigo-400 font-normal uppercase flex items-center gap-1">
                                                                                                → {item.destinationTimeZone.split('/').pop().replace(/_/g, ' ')}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <button onClick={() => handleEditOpen(item)} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center justify-end gap-1 mt-2 w-full transition-colors">
                                                                                <Edit2 size={12} /> {t.editEvent}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-2 mb-3">
                                                                        <MapPin size={14} />
                                                                        {item.location}
                                                                        {item.endLocation && (
                                                                            <>
                                                                                <span className="mx-1">→</span>
                                                                                <MapPin size={14} />
                                                                                {item.endLocation}
                                                                            </>
                                                                        )}
                                                                    </div>

                                                                    {(item.location && item.endLocation) && (
                                                                        <a
                                                                            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(item.location)}&destination=${encodeURIComponent(item.endLocation)}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 mb-2"
                                                                        >
                                                                            <MapIcon size={12} /> {t.viewRoute}
                                                                        </a>
                                                                    )}

                                                                    {/* Attachments & Links Preview */}
                                                                    {(item.attachmentIds?.length > 0 || item.links?.length > 0) && (
                                                                        <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                                                            {item.attachmentIds?.map(id => {
                                                                                const doc = documents[id];
                                                                                if (!doc) return null;
                                                                                return (
                                                                                    <button key={id} onClick={() => setPreviewFile(doc)} className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 hover:text-indigo-600 border border-slate-200 transition-colors" title="Preview File">
                                                                                        <Paperclip size={10} /> {doc.name}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                            {item.links?.map(l => (
                                                                                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-indigo-50 px-2 py-1 rounded text-indigo-600 hover:underline border border-indigo-100">
                                                                                    <LinkIcon size={10} /> {l.label}
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {item.notes && (
                                                                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg italic border-l-2 border-slate-200">
                                                                            {item.notes}
                                                                        </p>
                                                                    )}

                                                                    <div className="flex justify-between mt-4 items-end border-t border-slate-100 pt-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => updateItineraryItem(item.id, 'isPaid', !item.isPaid)}
                                                                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${item.isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                                            >
                                                                                <CheckCircle size={12} /> {item.isPaid ? t.paid : t.markPaid}
                                                                            </button>

                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleDelete(item.id)}
                                                                            className="text-slate-300 hover:text-red-500 p-1"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Event Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={editMode ? t.editEvent : t.addEvent}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {formError && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{formError}</div>}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.title}</label>
                        <input name="title" value={addForm.title} onChange={e => setAddForm({ ...addForm, title: e.target.value })} required className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="e.g. Flight AA123" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.type}</label>
                        <select
                            value={addForm.type}
                            onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        >
                            {EVENT_TYPES.map(type => (
                                <option key={type} value={type}>
                                    {t[`type_${type.toLowerCase().replace(/ /g, '_').replace(/&/g, '')}`] || type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.cost}</label>
                        <div className="flex gap-2 items-center">
                            <input type="number" name="cost" value={addForm.cost} onChange={e => setAddForm({ ...addForm, cost: e.target.value })} placeholder="0" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm min-w-0" />
                            <div className="w-28 shrink-0">
                                <select
                                    value={addForm.currency}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAddForm({ ...addForm, currency: val });
                                        dispatch(updateTripDetails({ lastUsedCurrency: val }));
                                    }}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shrink-0 h-[38px]">
                                <input type="checkbox" name="isPaid" checked={addForm.isPaid} onChange={e => setAddForm({ ...addForm, isPaid: e.target.checked })} id="isPaidNew" className="w-4 h-4 text-indigo-600 rounded mr-1" />
                                <label htmlFor="isPaidNew" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.paid}</label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.start}</label>
                            <input
                                type="datetime-local"
                                value={addForm.startDateTime}
                                onChange={e => setAddForm({ ...addForm, startDateTime: e.target.value })}
                                required
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.duration}</label>
                            <div className="flex gap-2 items-center">
                                <div className="flex-1 relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={Math.floor(addForm.duration / 60)}
                                        onChange={e => setAddForm({ ...addForm, duration: (parseInt(e.target.value || 0) * 60) + (addForm.duration % 60) })}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm pl-2 pr-6"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-2 top-2 text-xs text-slate-400">{t.hoursAbbr}</span>
                                </div>
                                <div className="flex-1 relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={addForm.duration % 60}
                                        onChange={e => setAddForm({ ...addForm, duration: (Math.floor(addForm.duration / 60) * 60) + parseInt(e.target.value || 0) })}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm pl-2 pr-6"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-2 top-2 text-xs text-slate-400">{t.minutesAbbr}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timezone */}
                    {/* Timezone */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Globe size={12} /> {t.timeZone}
                            {loadingStartTz && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                        </label>
                        <select
                            value={addForm.timeZone}
                            onChange={e => setAddForm({ ...addForm, timeZone: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        >
                            {Intl.supportedValuesOf('timeZone').map(tz => (
                                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Destination Timezone - Only if end location differs */}
                    {addForm.endLocation && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Globe size={12} /> {t.destTimeZone}
                                {loadingEndTz && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                            </label>
                            <select
                                value={addForm.destinationTimeZone}
                                onChange={e => setAddForm({ ...addForm, destinationTimeZone: e.target.value })}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            >
                                {Intl.supportedValuesOf('timeZone').map(tz => (
                                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.startLocation} ({t.start})</label>
                        <div className="relative">
                            <LocationAutocomplete
                                value={addForm.location}
                                onChange={(val) => setAddForm(prev => ({ ...prev, location: val }))}
                                onSelect={(item) => setAddForm(prev => ({
                                    ...prev,
                                    location: item.name,
                                    coordinates: { lat: item.lat, lng: item.lng },
                                    // Don't set TZ here, wait for async or use what we have (null from immediate select)
                                }))}
                                onTimezoneLoading={setLoadingStartTz}
                                onTimezoneSelect={(tz) => {
                                    if (tz) setAddForm(prev => ({
                                        ...prev,
                                        timeZone: tz,
                                        // Auto-sync dest TZ if it was same as start
                                        destinationTimeZone: (!prev.endLocation || prev.timeZone === prev.destinationTimeZone) ? tz : prev.destinationTimeZone
                                    }));
                                }}
                                placeholder={t.startPlaceholder}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.endLocation} ({t.optional})</label>
                        <div className="relative">
                            <LocationAutocomplete
                                value={addForm.endLocation || ''}
                                onChange={(val) => setAddForm(prev => ({ ...prev, endLocation: val }))}
                                onSelect={(item) => setAddForm(prev => ({
                                    ...prev,
                                    endLocation: item.name,
                                    endCoordinates: { lat: item.lat, lng: item.lng }
                                }))}
                                onTimezoneLoading={setLoadingEndTz}
                                onTimezoneSelect={(tz) => {
                                    if (tz) setAddForm(prev => ({ ...prev, destinationTimeZone: tz }));
                                }}
                                placeholder={t.endPlaceholder}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.notes}</label>
                        <textarea
                            value={addForm.notes}
                            onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder={t.notesPlaceholder}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    {/* Attachments */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.attachments} & {t.links}</label>
                        <AttachmentManager
                            attachmentIds={addForm.attachmentIds || []}
                            links={addForm.links || []}
                            onUpdate={(data) => setAddForm({ ...addForm, ...data })}
                            t={t}
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsAddModalOpen(false)} className="flex-1">{t.cancel}</Button>
                        <Button type="submit" className="flex-1" icon={editMode ? SaveIcon : Plus}>{editMode ? t.saveChanges : t.addToItinerary}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={handleConfirmDelete}
                title={t.confirmDelete || 'Delete Event'}
                message={t.confirmDeleteEvent || 'Are you sure you want to delete this event? This action cannot be undone.'}
            />

            <FilePreviewModal
                file={previewFile}
                onClose={() => setPreviewFile(null)}
            />
        </div>
    );
};

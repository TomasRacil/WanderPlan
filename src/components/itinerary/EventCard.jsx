import React from 'react';
import { Calendar, MapPin, Map as MapIcon, Edit2, Save as SaveIcon, Trash2, CheckCircle, Clock, Paperclip, Link as LinkIcon } from 'lucide-react';
import { Button } from '../common/Button';
import { getEventIcon, getEventColor, calculateEndTime, formatDuration } from '../../utils/helpers';
import { EVENT_TYPES } from '../../data/eventConstants';

export const EventCard = ({
    item,
    onUpdate,
    onDelete,
    onEdit,
    onPreviewFile,
    documents = {},
    activeCurrencies = [],
    t
}) => {
    const { endDate, endTime, tzLabel } = calculateEndTime(item.startDate || item.date, item.startTime || item.time, item.duration || 60, item.timeZone, item.destinationTimeZone);

    // Inline Edit View
    if (item.isEditing) {
        return (
            <div className="relative flex items-start group">
                {/* Timeline Dot */}
                <div className={`absolute left-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm z-10 ${getEventColor(item.type)}`}>
                    {getEventIcon(item.type)}
                </div>

                <div className="ml-16 bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex-1">
                    <div className="space-y-3">
                        <input value={item.title} onChange={e => onUpdate(item.id, 'title', e.target.value)} className="w-full border p-1 rounded text-sm font-bold" />
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1">
                                <input type="date" value={item.startDate || item.date} onChange={e => onUpdate(item.id, 'startDate', e.target.value)} className="border p-1 rounded text-sm flex-1 min-w-0" />
                            </div>
                            <div className="flex items-center gap-1">
                                <input type="time" value={item.startTime || item.time} onChange={e => onUpdate(item.id, 'startTime', e.target.value)} className="border p-1 rounded text-sm flex-1 min-w-0" />
                            </div>
                            <div className="col-span-2 flex items-center gap-1">
                                <Clock size={14} className="text-slate-400" />
                                <input type="number" value={item.duration || 60} onChange={e => onUpdate(item.id, 'duration', parseInt(e.target.value))} className="border p-1 rounded text-sm w-20" /> <span className="text-xs text-slate-400">{t.minutesAbbr}</span>
                            </div>
                        </div>
                        <input value={item.location} onChange={e => onUpdate(item.id, 'location', e.target.value)} className="w-full border p-1 rounded text-sm" placeholder={t.location} />
                        <textarea value={item.notes} onChange={e => onUpdate(item.id, 'notes', e.target.value)} className="w-full border p-1 rounded text-sm h-20" placeholder={t.notesPlaceholder} />
                        <div className="space-y-2">
                            <select value={item.type} onChange={e => onUpdate(item.id, 'type', e.target.value)} className="border p-2 rounded-lg text-sm w-full bg-slate-50">
                                {EVENT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <label className="text-xs font-bold text-slate-500 uppercase px-1">{t.cost}</label>
                                <input type="number" value={item.cost} onChange={e => onUpdate(item.id, 'cost', parseFloat(e.target.value))} className="bg-white border border-slate-200 rounded p-1 text-sm w-full outline-none" placeholder="0" />
                                <select value={item.currency} onChange={e => onUpdate(item.id, 'currency', e.target.value)} className="bg-white border border-slate-200 rounded p-1 text-xs font-bold w-30 outline-none">
                                    {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                                <div className="flex items-center gap-1 shrink-0 ml-1 border-l pl-2 border-slate-200">
                                    <input type="checkbox" checked={item.isPaid} onChange={e => onUpdate(item.id, 'isPaid', e.target.checked)} id={`paid-${item.id}`} className="w-4 h-4 text-indigo-600 rounded" />
                                    <label htmlFor={`paid-${item.id}`} className="text-[10px] font-bold text-slate-500 uppercase">{t.paid}</label>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                            <Button variant="secondary" onClick={() => onUpdate(item.id, 'isEditing', false)}>{t.cancel}</Button>
                            <Button onClick={() => onUpdate(item.id, 'isEditing', false)} icon={SaveIcon}>{t.saveChanges}</Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Standard View
    return (
        <div className="relative flex items-start group">
            {/* Timeline Dot */}
            <div className={`absolute left-0 h-10 w-10 rounded-full flex items-center justify-center shadow-sm z-10 ${getEventColor(item.type)}`}>
                {getEventIcon(item.type)}
            </div>

            {/* Content */}
            <div className="ml-16 bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex-1 hover:shadow-md transition-shadow">
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
                                    <span className="flex items-center gap-1"><Clock size={10} /> {formatDuration(item.duration || 60, t)}</span>
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
                                <button onClick={() => onEdit(item)} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center justify-end gap-1 mt-2 w-full transition-colors">
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
                                        <button key={id} onClick={() => onPreviewFile(doc)} className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 hover:text-indigo-600 border border-slate-200 transition-colors" title="Preview File">
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
                                    onClick={() => onUpdate(item.id, 'isPaid', !item.isPaid)}
                                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${item.isPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <CheckCircle size={12} /> {item.isPaid ? t.paid : t.markPaid}
                                </button>
                            </div>
                            <button
                                onClick={() => onDelete(item.id)}
                                className="text-slate-300 hover:text-red-500 p-1"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

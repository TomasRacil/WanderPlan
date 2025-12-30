import React from 'react';
import { Calendar, Map as MapIcon } from 'lucide-react';
import { Button } from '../common/Button';
import { generateGoogleMapsLink } from '../../utils/helpers';
import { EventCard } from './EventCard';

export const TimelineView = ({
    itinerary,
    groupedItinerary,
    sortedDates,
    onEdit,
    onDelete,
    onUpdate,
    onPreviewFile,
    onAddEvent,
    documents = {},
    activeCurrencies = [],
    t
}) => {
    if (itinerary.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <Calendar size={48} className="mb-4 opacity-50" />
                <p>{t.emptyItinerary}</p>
                <Button variant="secondary" className="mt-4" onClick={onAddEvent}>{t.addEvent}</Button>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {sortedDates.map(dateKey => (
                <div key={dateKey} className="relative">
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-6 p-3 rounded-xl sticky top-0 z-30 shadow-sm border transition-all bg-slate-100 text-slate-700 border-slate-200">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold">
                                {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={generateGoogleMapsLink(groupedItinerary[dateKey])}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] px-3 py-1.5 rounded-lg border font-bold transition-colors uppercase tracking-wider bg-white text-blue-600 border-blue-100 hover:bg-blue-50"
                            >
                                {t.viewDailyRoute}
                            </a>
                        </div>
                    </div>

                    {/* Events Line */}
                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        {groupedItinerary[dateKey].map((item) => (
                            <EventCard
                                key={item.id}
                                item={item}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onUpdate={onUpdate}
                                onPreviewFile={onPreviewFile}
                                documents={documents}
                                activeCurrencies={activeCurrencies}
                                t={t}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

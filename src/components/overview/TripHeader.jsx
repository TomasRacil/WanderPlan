import React from 'react';
import { Calendar, Camera } from 'lucide-react';
import { updateTripDetails } from '../../store/tripSlice';
import { useDispatch } from 'react-redux';
import { DateRangePicker } from '../common/DateRangePicker';

export const TripHeader = ({ tripDetails, t }) => {
    const dispatch = useDispatch();

    return (
        <div className="relative h-80 rounded-2xl group shadow-lg">
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <img src={tripDetails.coverImage} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
                <div className="flex flex-col gap-2 mb-4">
                    <input
                        type="text"
                        value={tripDetails.destination}
                        onChange={(e) => dispatch(updateTripDetails({ destination: e.target.value }))}
                        placeholder={t.destination}
                        className="bg-transparent border-b border-white/30 text-3xl font-bold focus:outline-none w-full placeholder:text-white/50"
                    />
                    <input
                        type="text"
                        value={tripDetails.origin || ''}
                        onChange={(e) => dispatch(updateTripDetails({ origin: e.target.value }))}
                        placeholder={t.origin}
                        className="bg-transparent border-b border-white/20 text-sm focus:outline-none w-full text-white/80 placeholder:text-white/40"
                    />
                </div>
                <div className="flex flex-wrap gap-6 text-white/90 items-end">
                    <DateRangePicker
                        startDate={tripDetails.startDate}
                        endDate={tripDetails.endDate}
                        onChange={(dates) => dispatch(updateTripDetails(dates))}
                        t={t}
                    />
                    <button
                        onClick={() => {
                            const url = prompt(t.changeCover + ":");
                            if (url) dispatch(updateTripDetails({ coverImage: url }));
                        }}
                        className="ml-auto text-xs bg-black/40 hover:bg-black/60 px-2 py-1 rounded flex items-center gap-1"
                    >
                        <Camera size={12} /> {t.changeCover}
                    </button>
                </div>
            </div>
        </div>
    );
};

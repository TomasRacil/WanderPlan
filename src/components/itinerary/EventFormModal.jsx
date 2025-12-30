import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Globe, Loader2, Plus, Save as SaveIcon } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { LocationAutocomplete } from '../common/LocationAutocomplete';
import { AttachmentManager } from '../common/AttachmentManager';
import { EVENT_TYPES } from '../../data/eventConstants';
import { updateTripDetails } from '../../store/tripSlice';
import { useDispatch } from 'react-redux';

export const EventFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isEditMode,
    activeCurrencies = [],
    t
}) => {
    const dispatch = useDispatch();
    const [loadingStartTz, setLoadingStartTz] = useState(false);
    const [loadingEndTz, setLoadingEndTz] = useState(false);

    const { control, handleSubmit, register, reset, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            title: '',
            type: 'Activity',
            cost: '',
            currency: 'USD',
            isPaid: false,
            startDateTime: '',
            duration: 0,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            destinationTimeZone: '',
            location: '',
            coordinates: null,
            endLocation: '',
            endCoordinates: null,
            notes: '',
            attachmentIds: [],
            links: []
        }
    });

    // Watch fields for dependent logic
    const duration = watch('duration');
    const endLocation = watch('endLocation');
    const timeZone = watch('timeZone');
    const destinationTimeZone = watch('destinationTimeZone');

    useEffect(() => {
        if (isOpen) {
            reset(initialData || {
                title: '',
                type: 'Activity',
                cost: '',
                currency: activeCurrencies[0]?.code || 'USD',
                isPaid: false,
                startDateTime: '',
                duration: 60,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                destinationTimeZone: '',
                location: '',
                coordinates: null,
                endLocation: '',
                endCoordinates: null,
                notes: '',
                attachmentIds: [],
                links: []
            });
        }
    }, [isOpen, initialData, reset, activeCurrencies]);


    const onFormSubmit = (data) => {
        onSubmit(data);
    };

    const handleCurrencyChange = (val) => {
        setValue('currency', val);
        dispatch(updateTripDetails({ lastUsedCurrency: val }));
    };

    // Duration helpers
    const hours = Math.floor((duration || 0) / 60);
    const minutes = (duration || 0) % 60;

    const updateDuration = (h, m) => {
        setValue('duration', (parseInt(h || 0) * 60) + parseInt(m || 0));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? t.editEvent : t.addEvent}>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.title}</label>
                    <input
                        {...register('title', { required: t.title + ' is required' })}
                        className={`w-full p-2 bg-slate-50 border ${errors.title ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm`}
                        placeholder="e.g. Flight AA123"
                    />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.type}</label>
                    <select
                        {...register('type')}
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
                        <input
                            type="number"
                            {...register('cost')}
                            placeholder="0"
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm min-w-0"
                        />
                        <div className="w-28 shrink-0">
                            <Controller
                                name="currency"
                                control={control}
                                render={({ field }) => (
                                    <select
                                        {...field}
                                        onChange={(e) => handleCurrencyChange(e.target.value)}
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                    </select>
                                )}
                            />
                        </div>
                        <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shrink-0 h-[38px]">
                            <input
                                type="checkbox"
                                id="isPaidNew"
                                {...register('isPaid')}
                                className="w-4 h-4 text-indigo-600 rounded mr-1"
                            />
                            <label htmlFor="isPaidNew" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.paid}</label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.start}</label>
                        <input
                            type="datetime-local"
                            {...register('startDateTime', { required: t.dateRange + ' is required' })}
                            className={`w-full p-2 bg-slate-50 border ${errors.startDateTime ? 'border-red-500' : 'border-slate-200'} rounded-lg text-sm`}
                        />
                        {errors.startDateTime && <p className="text-red-500 text-xs mt-1">{errors.startDateTime.message}</p>}
                    </div>
                    <div className="flex flex-col">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.duration}</label>
                        <div className="flex gap-2 items-center">
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    min="0"
                                    value={hours}
                                    onChange={e => updateDuration(e.target.value, minutes)}
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
                                    value={minutes}
                                    onChange={e => updateDuration(hours, e.target.value)}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm pl-2 pr-6"
                                    placeholder="0"
                                />
                                <span className="absolute right-2 top-2 text-xs text-slate-400">{t.minutesAbbr}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timezone */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <Globe size={12} /> {t.timeZone}
                        {loadingStartTz && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                    </label>
                    <select
                        {...register('timeZone')}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                        {Intl.supportedValuesOf('timeZone').map(tz => (
                            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>

                {/* Destination Timezone - Only if end location differs */}
                {endLocation && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Globe size={12} /> {t.destTimeZone}
                            {loadingEndTz && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                        </label>
                        <select
                            {...register('destinationTimeZone')}
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
                        <Controller
                            name="location"
                            control={control}
                            render={({ field }) => (
                                <LocationAutocomplete
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    onSelect={(item) => {
                                        setValue('location', item.name);
                                        setValue('coordinates', { lat: item.lat, lng: item.lng });
                                    }}
                                    onTimezoneLoading={setLoadingStartTz}
                                    onTimezoneSelect={(tz) => {
                                        if (tz) {
                                            setValue('timeZone', tz);
                                            // Auto-sync dest TZ if it was same as start or empty
                                            if (!endLocation || timeZone === destinationTimeZone) {
                                                setValue('destinationTimeZone', tz);
                                            }
                                        }
                                    }}
                                    placeholder={t.startPlaceholder}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                />
                            )}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.endLocation} ({t.optional})</label>
                    <div className="relative">
                        <Controller
                            name="endLocation"
                            control={control}
                            render={({ field }) => (
                                <LocationAutocomplete
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    onSelect={(item) => {
                                        setValue('endLocation', item.name);
                                        setValue('endCoordinates', { lat: item.lat, lng: item.lng });
                                    }}
                                    onTimezoneLoading={setLoadingEndTz}
                                    onTimezoneSelect={(tz) => {
                                        if (tz) setValue('destinationTimeZone', tz);
                                    }}
                                    placeholder={t.endPlaceholder}
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                />
                            )}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.notes}</label>
                    <textarea
                        {...register('notes')}
                        placeholder={t.notesPlaceholder}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                {/* Attachments */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.attachments} & {t.links}</label>
                    <AttachmentManager
                        attachmentIds={watch('attachmentIds') || []}
                        links={watch('links') || []}
                        onUpdate={(data) => {
                            if (data.attachmentIds) setValue('attachmentIds', data.attachmentIds);
                            if (data.links) setValue('links', data.links);
                        }}
                        t={t}
                    />
                </div>

                <div className="flex gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} className="flex-1">{t.cancel}</Button>
                    <Button type="submit" className="flex-1" icon={isEditMode ? SaveIcon : Plus}>{isEditMode ? t.saveChanges : t.addToItinerary}</Button>
                </div>
            </form>
        </Modal>
    );
};

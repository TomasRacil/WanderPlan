import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar, Plus } from 'lucide-react';
import { SectionTitle } from './common/SectionTitle';
import { Button } from './common/Button';
import { ConfirmModal } from './common/ConfirmModal';
import { updateTripDetails, generateTrip } from '../store/tripSlice';
import { setItinerary } from '../store/itinerarySlice';
import { parseCost, getBudgetCategory } from '../utils/helpers'; // Ensure helpers has these
import { ALL_CURRENCIES } from '../data/currencies';
import { LOCALES } from '../i18n/locales';
import { AiPromptTool } from './common/AiPromptTool';
import { FilePreviewModal } from './common/FilePreviewModal';

// Sub-components
import { TimelineView } from './itinerary/TimelineView';
import { EventFormModal } from './itinerary/EventFormModal';

export const Itinerary = () => {
    const dispatch = useDispatch();
    const { tripDetails, exchangeRates = {} } = useSelector(state => state.trip);
    const { items: itinerary } = useSelector(state => state.itinerary);
    // documents needed for preview in TimelineView
    const { documents = {} } = useSelector(state => state.resources);
    const { language, loading } = useSelector(state => state.ui);

    // Filtered list of currencies allowed (Home + Added)
    const activeCurrencies = ALL_CURRENCIES.filter(c =>
        c.code === tripDetails.homeCurrency ||
        Object.keys(exchangeRates).includes(c.code)
    );

    const t = LOCALES[language || 'en'];

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [aiMode, setAiMode] = useState('add');
    const [editMode, setEditMode] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
    const [previewFile, setPreviewFile] = useState(null);
    const [promptResetTrigger, setPromptResetTrigger] = useState(0);

    // This holds the data to initialize the form (empty for add, item data for edit)
    const [modalInitialData, setModalInitialData] = useState(null);

    const handleGenerate = (prompt, mode, attachments) => {
        dispatch(generateTrip({ targetArea: 'itinerary', customPrompt: prompt, aiMode: mode, promptAttachments: attachments }))
            .unwrap()
            .then(() => {
                setPromptResetTrigger(prev => prev + 1);
            })
            .catch(err => {
                console.error("Geneation failed", err);
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
                // Format for datetime-local: YYYY-MM-DDTHH:mm
                defaultStart = `${lastEnd.getFullYear()}-${pad(lastEnd.getMonth() + 1)}-${pad(lastEnd.getDate())}T${pad(lastEnd.getHours())}:${pad(lastEnd.getMinutes())}`;
            }
        } else if (tripDetails?.startDate) {
            defaultStart = `${tripDetails.startDate}T10:00`;
        }

        setModalInitialData({
            id: null,
            title: '', type: 'Activity',
            startDateTime: defaultStart, duration: 60,
            timeZone: tripDetails.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            destinationTimeZone: tripDetails.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            location: '', coordinates: null, endLocation: '', endCoordinates: null, notes: '', cost: '', currency: tripDetails.lastUsedCurrency || 'USD', isPaid: false,
            attachmentIds: [],
            links: []
        });
        setEditMode(false);
        setIsAddModalOpen(true);
    };

    const handleEditOpen = (item) => {
        // Calculate duration logic moved here to prepare data
        let duration = item.duration || 60;
        if (!item.duration && item.startTime && item.endTime) {
            const start = new Date(`2000-01-01T${item.startTime}`);
            const end = new Date(`2000-01-01T${item.endTime}`);
            if (end > start) {
                duration = (end - start) / 60000;
            }
        }

        setModalInitialData({
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
        setIsAddModalOpen(true);
    };

    const handleFormSubmit = (formData) => {
        const [startDate, startTime] = formData.startDateTime ? formData.startDateTime.split('T') : ['', ''];

        const newItem = {
            id: editMode ? formData.id : Date.now(),
            title: formData.title,
            type: formData.type,
            category: getBudgetCategory(formData.type, null),
            startDate,
            startTime,
            duration: parseInt(formData.duration),
            timeZone: formData.timeZone,
            destinationTimeZone: formData.destinationTimeZone,
            location: formData.location,
            coordinates: formData.coordinates,
            endLocation: formData.endLocation,
            endCoordinates: formData.endCoordinates,
            notes: formData.notes,
            cost: parseCost(formData.cost),
            currency: formData.currency,
            isPaid: formData.isPaid,
            isEditing: false, // Ensure editing state is off after submit
            attachmentIds: formData.attachmentIds, // Note: EventFormModal passes 'attachmentIds'
            links: formData.links
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
        setConfirmDelete({ isOpen: false, id: null });
    };

    const updateItineraryItem = (id, field, value) => {
        dispatch(setItinerary(itinerary.map(item => item.id === id ? { ...item, [field]: value } : item)));
        if (field === 'currency') {
            dispatch(updateTripDetails({ lastUsedCurrency: value }));
        }
    };

    const groupedItinerary = itinerary.reduce((groups, item) => {
        const date = item.startDate || item.date;
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedItinerary).sort();

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
                    <TimelineView
                        itinerary={itinerary}
                        groupedItinerary={groupedItinerary}
                        sortedDates={sortedDates}
                        onEdit={handleEditOpen}
                        onDelete={handleDelete}
                        onUpdate={updateItineraryItem}
                        onPreviewFile={setPreviewFile}
                        onAddEvent={handleAddOpen}
                        documents={documents}
                        activeCurrencies={activeCurrencies}
                        t={t}
                    />
                </div>
            </div>

            {/* Add/Edit Event Modal */}
            <EventFormModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleFormSubmit}
                initialData={modalInitialData}
                isEditMode={editMode}
                activeCurrencies={activeCurrencies}
                t={t}
            />

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

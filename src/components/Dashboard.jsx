import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Trash2, Calendar, MapPin, Upload, Download, Globe } from 'lucide-react';
import { loadTripsList, deleteTrip } from '../store/tripsListSlice';
import { loadSelectedTrip, createNewTrip, loadFullTrip } from '../store/tripSlice';
import { Button } from './common/Button';
import { exportTripToZip, parseTripFromZip } from '../utils/exportImport';
import { storage } from '../services/storage';
import { migrateLegacyState } from '../store/migration';
import { LOCALES } from '../i18n/locales';

export function Dashboard({ onTripSelect }) {
    const dispatch = useDispatch();
    const { trips, loading } = useSelector(state => state.tripsList);
    const { language } = useSelector(state => state.ui);
    const t = LOCALES[language || 'en'];
    const fileInputRef = useRef(null);
    const updateInputRef = useRef(null);

    useEffect(() => {
        dispatch(loadTripsList());
    }, [dispatch]);

    const handleCreateNew = async () => {
        const result = await dispatch(createNewTrip());
        if (createNewTrip.fulfilled.match(result)) {
            onTripSelect(result.payload);
        }
    };

    const handleSelectTrip = async (id) => {
        await dispatch(loadSelectedTrip(id));
        onTripSelect(id);
    };

    const [confirmModal, setConfirmModal] = React.useState(null); // { title, msg, onConfirm, isDeletion }

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        setConfirmModal({
            title: t.deleteTripTitle,
            msg: t.deleteTripConfirm,
            isDeletion: true,
            onConfirm: () => {
                dispatch(deleteTrip(id));
                setConfirmModal(null);
            }
        });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("Importing file:", file.name);

        try {
            const rawData = await parseTripFromZip(file);
            console.log("Parsed raw data:", rawData ? Object.keys(rawData) : "null");

            if (!rawData) {
                alert("Failed to parse file");
                return;
            }

            // Ensure dataset is migrated/normalized before checking
            const tripData = migrateLegacyState(rawData);
            console.log("Migrated data structure:", tripData ? Object.keys(tripData) : "null");

            if (!tripData || !tripData.trip || !tripData.trip.tripDetails) {
                console.error("Invalid trip data after migration", tripData);
                alert(t.errorOccurred || "Invalid trip data");
                return;
            }

            // Check if trip ID exists
            const tripId = tripData.trip.tripDetails.id;
            console.log("Trip ID to import:", tripId);

            const existing = trips.find(t => t.id === tripId);

            if (existing) {
                console.log("Trip already exists, asking confirmation");
                setConfirmModal({
                    title: t.confirmOverwriteTitle,
                    msg: t.confirmOverwriteMsg,
                    isDeletion: false,
                    onConfirm: async () => {
                        console.log("Overwriting trip...");
                        await storage.saveTrip(tripData);
                        dispatch(loadTripsList());
                        setConfirmModal(null);
                    }
                });
            } else {
                console.log("Saving new trip...");
                await storage.saveTrip(tripData);
                dispatch(loadTripsList());
            }
        } catch (error) {
            console.error("Import error:", error);
            alert(t.errorOccurred);
        }
        e.target.value = '';
    };

    const handleExport = async (e, tripId) => {
        e.stopPropagation();
        try {
            const tripData = await storage.loadTrip(tripId);
            if (!tripData) return;

            const content = await exportTripToZip(tripData);
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            const dest = tripData.trip?.tripDetails?.destination || 'trip';
            link.download = `wanderplan-${dest}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert(t.errorOccurred);
        }
    };

    // For updating a specific trip from card (Maybe irrelevant if we have general import? 
    // User asked "upload add to the card". Maybe they mean 'update this trip from file'?)
    // Let's assume general import is enough for 'adding', but maybe 'update' is useful.
    // Actually simplicity: General Import Button + Export on cards.
    // Wait, user said "move save trip to zip and upload add to the card".
    // "save trip to zip" -> Export (Download) on card.
    // "upload add to the card" -> unclear. Maybe "Upload/Import" button next to "Create New"?
    // I already have generic Import. 
    // Let's Add "Export" button to each card.

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative">
            {confirmModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
                        <p className="text-slate-600 mb-6 text-sm">{confirmModal.msg}</p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => setConfirmModal(null)}>{t.cancel}</Button>
                            <Button
                                onClick={confirmModal.onConfirm}
                                className={`${confirmModal.isDeletion ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
                            >
                                {confirmModal.isDeletion ? (t.delete || "Delete") : (t.overwrite || "Overwrite")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 sm:gap-0">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t.yourTrips}</h1>
                        <p className="text-slate-500 mt-1 hidden sm:block">{t.dashboardSubtitle}</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <input
                            type="file"
                            accept=".json,.zip"
                            onChange={handleImportFile}
                            className="hidden"
                            ref={fileInputRef}
                        />
                        <Button variant="secondary" icon={Upload} onClick={handleImportClick} className="flex-1 sm:flex-none justify-center">{t.importTrip}</Button>
                        <Button onClick={handleCreateNew} icon={Plus} className="flex-1 sm:flex-none justify-center">{t.create || "Create"}</Button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-500">{t.loadingTrips}</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trips.map(trip => (
                            <div
                                key={trip.id}
                                onClick={() => handleSelectTrip(trip.id)}
                                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group overflow-hidden border border-slate-200 relative"
                            >
                                <div className="h-40 bg-slate-200 relative">
                                    {trip.coverImage ? (
                                        <img src={trip.coverImage} alt={trip.destination} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <MapPin size={40} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                    <h3 className="absolute bottom-4 left-4 text-white font-bold text-xl text-shadow pr-16 truncate w-full">
                                        {trip.destination}
                                    </h3>

                                    {/* Card Actions */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleExport(e, trip.id)}
                                            className="p-2 bg-white/90 text-slate-600 hover:text-indigo-600 rounded-full shadow-sm backdrop-blur-sm"
                                            title={t.exportTrip}
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, trip.id)}
                                            className="p-2 bg-white/90 text-slate-600 hover:text-red-600 rounded-full shadow-sm backdrop-blur-sm"
                                            title={t.delete}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                        <Calendar size={16} />
                                        <span>
                                            {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'No dates'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                                            {trip.cost} {trip.currency}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {trips.length === 0 && (
                            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MapPin size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">{t.noTrips}</h3>
                                <p className="text-slate-500 mb-6">{t.dashboardSubtitle}</p>
                                <Button onClick={handleCreateNew} icon={Plus}>{t.startPlanning}</Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SectionTitle, Button } from './CommonUI';
import { Map as MapIcon, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { LOCALES } from '../i18n/locales';

// Fix for default markers in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component to represent map content and bounds
const MapContent = ({ items, t }) => {
    const map = useMap();
    const markers = items.filter(i => i.coordinates && i.coordinates.lat && i.coordinates.lng);
    const routes = items.filter(i =>
        i.coordinates && i.coordinates.lat && i.coordinates.lng &&
        i.endCoordinates && i.endCoordinates.lat && i.endCoordinates.lng
    );

    useEffect(() => {
        if (markers.length > 0 || routes.length > 0) {
            const latLngs = [
                ...markers.map(m => [m.coordinates.lat, m.coordinates.lng]),
                ...routes.map(r => [r.endCoordinates.lat, r.endCoordinates.lng])
            ];
            const bounds = L.latLngBounds(latLngs);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [markers, routes, map]);

    if (markers.length === 0 && routes.length === 0) {
        return (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/80 p-4 rounded-xl shadow-lg z-[1000] text-center pointer-events-none">
                <p className="text-slate-500 font-medium">{t.noCoords || "No locations found for this day"}</p>
            </div>
        );
    }

    const formatDuration = (mins) => {
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
    };

    return (
        <>
            {markers.map(item => (
                <Marker key={item.id} position={[item.coordinates.lat, item.coordinates.lng]}>
                    <Popup>
                        <div className="text-sm">
                            <h3 className="font-bold text-slate-800">{item.title}</h3>
                            <p className="text-slate-500">{item.location}</p>
                            <div className="flex flex-col mt-1">
                                <span className="text-xs text-indigo-600 font-bold">{item.startTime} {item.duration ? `(${formatDuration(item.duration)})` : ''}</span>
                                {item.timeZone && <span className="text-[10px] text-slate-400">{item.timeZone}</span>}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {routes.map(item => {
                return (
                    <React.Fragment key={`route-${item.id}`}>
                        <Marker position={[item.endCoordinates.lat, item.endCoordinates.lng]}>
                            <Popup>
                                <div className="text-sm">
                                    <h3 className="font-bold text-slate-800">{item.title} (End)</h3>
                                    <p className="text-slate-500">{item.endLocation}</p>
                                </div>
                            </Popup>
                        </Marker>
                        <Polyline
                            positions={[
                                [item.coordinates.lat, item.coordinates.lng],
                                [item.endCoordinates.lat, item.endCoordinates.lng]
                            ]}
                            color="#818cf8"
                            weight={3}
                            opacity={0.8}
                            dashArray="5, 8"
                        />
                    </React.Fragment>
                )
            })}
        </>
    );
};

export const Map = () => {
    const { itinerary, language } = useSelector(state => state.trip);
    const t = LOCALES[language || 'en'];

    // Day Selection State
    // selectedDate: string 'YYYY-MM-DD' or null (All)
    const [selectedDate, setSelectedDate] = useState(null);

    // Get Unique Dates sorted
    const uniqueDates = useMemo(() => {
        const dates = new Set(itinerary.map(i => i.startDate || i.date));
        return Array.from(dates).sort();
    }, [itinerary]);

    // Derived items
    const displayedItems = useMemo(() => {
        if (!selectedDate) return itinerary;
        return itinerary.filter(i => (i.startDate || i.date) === selectedDate);
    }, [itinerary, selectedDate]);

    const handlePrev = () => {
        if (uniqueDates.length === 0) return;
        const currentIndex = selectedDate ? uniqueDates.indexOf(selectedDate) : -1;
        if (currentIndex === -1 || currentIndex === 0) {
            setSelectedDate(uniqueDates[uniqueDates.length - 1]); // Loop to last? Or stop? Looping is nicer.
        } else {
            setSelectedDate(uniqueDates[currentIndex - 1]);
        }
    };

    const handleNext = () => {
        if (uniqueDates.length === 0) return;
        const currentIndex = selectedDate ? uniqueDates.indexOf(selectedDate) : -1;
        if (currentIndex === -1 || currentIndex === uniqueDates.length - 1) {
            setSelectedDate(uniqueDates[0]);
        } else {
            setSelectedDate(uniqueDates[currentIndex + 1]);
        }
    };

    // Default position (Null Island or generic)
    const defaultPosition = [51.505, -0.09];

    return (
        <div className="animate-fadeIn h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <SectionTitle icon={MapIcon} title={t.map} subtitle={t.mapSubtitle} />
            </div>

            {/* Navigation Controls */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <Button
                    variant={selectedDate === null ? 'primary' : 'secondary'}
                    onClick={() => setSelectedDate(null)}
                    className="text-xs"
                >
                    Show Whole Trip
                </Button>

                <div className="flex items-center gap-2 flex-1 justify-center bg-slate-50 rounded-lg p-1 border border-slate-100">
                    <button onClick={handlePrev} className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30" disabled={uniqueDates.length === 0}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2 px-4 min-w-[120px] justify-center">
                        <Calendar size={14} className="text-indigo-600" />
                        <span className="text-sm font-bold text-slate-700">
                            {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'All Dates'}
                        </span>
                    </div>
                    <button onClick={handleNext} className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30" disabled={uniqueDates.length === 0}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden shadow-sm border border-slate-200 z-0 relative min-h-[400px]">
                <MapContainer
                    center={defaultPosition}
                    zoom={2}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                    preferCanvas={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapContent items={displayedItems} t={t} />
                </MapContainer>
            </div>
        </div>
    );
};

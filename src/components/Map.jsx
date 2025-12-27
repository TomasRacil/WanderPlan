import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SectionTitle } from './CommonUI';
import { Map as MapIcon } from 'lucide-react';
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
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/80 p-4 rounded-xl shadow-lg z-[1000] text-center">
                <p className="text-slate-500 font-medium">{t.noCoords}</p>
            </div>
        );
    }

    return (
        <>
            {markers.map(item => (
                <Marker key={item.id} position={[item.coordinates.lat, item.coordinates.lng]}>
                    <Popup>
                        <div className="text-sm">
                            <h3 className="font-bold text-slate-800">{item.title}</h3>
                            <p className="text-slate-500">{item.location}</p>
                            <p className="text-xs text-indigo-600 mt-1">{item.startTime} - {item.endTime}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {routes.map(item => (
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
                        color="blue"
                        weight={4}
                        opacity={0.6}
                        dashArray="10, 10"
                    />
                </React.Fragment>
            ))}
        </>
    );
};

export const Map = () => {
    const { itinerary, language } = useSelector(state => state.trip);
    const t = LOCALES[language || 'en'];

    // Default position (Null Island or generic)
    const defaultPosition = [51.505, -0.09];

    return (
        <div className="animate-fadeIn h-full flex flex-col">
            <SectionTitle icon={MapIcon} title={t.map} subtitle={t.mapSubtitle} />
            <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden shadow-sm border border-slate-200 z-0 relative min-h-[400px]">
                <MapContainer center={defaultPosition} zoom={2} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapContent items={itinerary} t={t} />
                </MapContainer>
            </div>
        </div>
    );
};

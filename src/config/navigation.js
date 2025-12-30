import {
    Settings, Plane, Home, Wallet, CheckSquare, Calendar, Map as MapIcon
} from 'lucide-react';

export const getNavItems = (t) => [
    { id: 'overview', icon: Home, label: t.overview },
    { id: 'tasks', icon: CheckSquare, label: t.tasks },
    { id: 'packing', icon: Plane, label: t.packing },
    { id: 'itinerary', icon: Calendar, label: t.itinerary },
    { id: 'budget', icon: Wallet, label: t.budget },
    { id: 'map', icon: MapIcon, label: t.map },
];

import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { MapPin, Loader2 } from 'lucide-react';
import { formatAddress } from '../../services/geocoding';

export const LocationAutocomplete = ({ value, onChange, onSelect, onTimezoneSelect, onTimezoneLoading, placeholder, className }) => {
    const language = useSelector(state => state.trip.language || 'en');
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.length < 3 || !isOpen) return;

            setLoading(true);
            try {
                // Photon supported languages: en, de, fr (plus IT was removed, others might 400)
                const photonLangs = ['en', 'de', 'fr'];
                const searchLang = photonLangs.includes(language) ? language : 'en';

                // Using Photon API (OSM-based) which is more browser-friendly than Nominatim
                const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=${searchLang}`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data.features || []);
                }
            } catch (error) {
                console.error("Geocoding error:", error);
            } finally {
                setLoading(false);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(timeoutId);
    }, [query, isOpen]);

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        onChange(e.target.value);
        setIsOpen(true);
    };

    const handleSelect = (feature) => {
        const { properties, geometry } = feature;
        const [lng, lat] = geometry.coordinates;

        // Construct a display name using shared logic
        const fullAddress = formatAddress(properties, properties.display_name || properties.name);

        setQuery(fullAddress);
        setIsOpen(false);

        // Immediate Select Update (No blocking)
        onChange(fullAddress);
        onSelect({
            name: fullAddress, // Use the precise address as the primary name
            address: fullAddress,
            lat,
            lng
        });
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    className={`${className} pl-9`}
                    placeholder={placeholder}
                />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <Loader2 className="animate-spin text-indigo-600" size={16} />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                    {results.map((feature, idx) => {
                        const { properties } = feature;
                        const label = formatAddress(properties, properties.display_name || properties.name);
                        // If name is just the street, use the fuller label as the title
                        const isGenericName = properties.name === properties.street || !properties.name;
                        const title = isGenericName ? label : (properties.name || label);
                        const subtitle = isGenericName ? properties.country : label.replace(title + ', ', '');

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(feature);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0 transition-colors"
                            >
                                <p className="font-bold text-slate-700 truncate">{title}</p>
                                <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                            </button>
                        );
                    })}
                    <div className="px-2 py-1 bg-slate-50 text-[10px] text-slate-400 text-center">
                        Search via Photon (OpenStreetMap)
                    </div>
                </div>
            )}
        </div>
    );
};

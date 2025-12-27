import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

export const LocationAutocomplete = ({ value, onChange, onSelect, placeholder, className }) => {
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
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data);
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

    const handleSelect = (item) => {
        // Use full address to avoid truncation issues complained by user
        const fullAddress = item.display_name;
        setQuery(fullAddress);
        onChange(fullAddress);
        onSelect({
            name: fullAddress, // Use full address as the name
            address: fullAddress,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
        });
        setIsOpen(false);
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
                    {results.map((item) => (
                        <button
                            key={item.place_id}
                            onClick={() => handleSelect(item)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0 transition-colors"
                        >
                            <p className="font-bold text-slate-700 truncate">{item.display_name.split(',')[0]}</p>
                            <p className="text-xs text-slate-500 truncate">{item.display_name}</p>
                        </button>
                    ))}
                    <div className="px-2 py-1 bg-slate-50 text-[10px] text-slate-400 text-center">
                        Search via OpenStreetMap
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown } from 'lucide-react';

export const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", labelKey = "label", valueKey = "value", renderOption, variant = "dark" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            const isInsideWrapper = wrapperRef.current && wrapperRef.current.contains(event.target);
            const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);

            if (!isInsideWrapper && !isInsideDropdown) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const updatePosition = () => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const filteredOptions = searchTerm.length > 0
        ? options.filter(option =>
            option[labelKey].toLowerCase().includes(searchTerm.toLowerCase()) ||
            option[valueKey].toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    const selectedOption = options.find(o => o[valueKey] === value);

    const variants = {
        dark: "bg-white/10 border-white/20 text-white hover:bg-white/20",
        light: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
    };

    const textColors = {
        dark: "text-white",
        light: "text-slate-700"
    };

    const placeholderColors = {
        dark: "text-white/50",
        light: "text-slate-400"
    };

    const iconColors = {
        dark: "text-white/70",
        light: "text-slate-400"
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div
                className={`w-full border rounded-lg p-2 text-sm flex items-center justify-between cursor-pointer transition-colors ${variants[variant]}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? textColors[variant] : placeholderColors[variant]}>
                    {selectedOption ? (renderOption ? renderOption(selectedOption) : selectedOption[labelKey]) : placeholder}
                </span>
                <ChevronDown size={16} className={iconColors[variant]} />
            </div>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed mt-1 bg-white rounded-lg shadow-2xl z-[9999] max-h-64 overflow-hidden flex flex-col animate-fadeIn border border-slate-100"
                    style={{
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                    }}
                >
                    <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-500 text-slate-700"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 max-h-48 custom-scrollbar">
                        {searchTerm.length === 0 ? (
                            <div className="p-4 text-xs text-slate-400 text-center italic">Start typing to search...</div>
                        ) : filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <div
                                    key={option[valueKey]}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 text-slate-700 flex justify-between items-center ${value === option[valueKey] ? 'bg-indigo-50 text-indigo-700 font-medium' : ''}`}
                                    onClick={() => {
                                        onChange(option[valueKey]);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    {renderOption ? renderOption(option) : option[labelKey]}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-xs text-slate-400 text-center">No results found</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

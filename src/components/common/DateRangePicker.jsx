import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from './Button';

export const DateRangePicker = ({ startDate, endDate, onChange, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date(startDate || Date.now()));
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const handleDateClick = (day) => {
        const year = viewDate.getFullYear();
        const month = String(viewDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const clickedDate = `${year}-${month}-${dayStr}`;

        if (!startDate || (startDate && endDate)) {
            onChange({ startDate: clickedDate, endDate: '' });
        } else if (startDate && !endDate) {
            if (new Date(clickedDate) < new Date(startDate)) {
                onChange({ startDate: clickedDate, endDate: '' });
            } else {
                onChange({ startDate, endDate: clickedDate });
                setIsOpen(false);
            }
        }
    };

    const isSelected = (day) => {
        const dStr = String(day).padStart(2, '0');
        const mStr = String(viewDate.getMonth() + 1).padStart(2, '0');
        const dateStr = `${viewDate.getFullYear()}-${mStr}-${dStr}`;
        return dateStr === startDate || dateStr === endDate;
    };

    const isInRange = (day) => {
        if (!startDate || !endDate) return false;
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        return date > new Date(startDate) && date < new Date(endDate);
    };

    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const renderCalendar = () => {
        const days = [];
        const totalDays = daysInMonth(viewDate);
        const startDay = firstDayOfMonth(viewDate);

        // Padding for first week
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        for (let d = 1; d <= totalDays; d++) {
            const selected = isSelected(d);
            const inRange = isInRange(d);
            days.push(
                <button
                    key={d}
                    onClick={() => handleDateClick(d)}
                    className={`h-8 w-8 text-xs rounded-full flex items-center justify-center transition-all ${selected ? 'bg-indigo-600 text-white font-bold' :
                        inRange ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                >
                    {d}
                </button>
            );
        }
        return days;
    };

    const monthName = viewDate.toLocaleString(t?.localeCode || 'default', { month: 'long', year: 'numeric' });

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors text-white border border-white/20"
            >
                <CalendarIcon size={14} />
                <span className="text-xs font-medium">
                    {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString() : 'Start'}
                    <span className="mx-1">→</span>
                    {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString() : 'End'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[100] w-64 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{monthName}</span>
                        <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={`${d}-${i}`} className="h-8 w-8 flex items-center justify-center text-[10px] font-bold text-slate-400">{d}</div>
                        ))}
                        {renderCalendar()}
                    </div>

                    <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium">
                            {!startDate ? (t?.selectStart || 'Select start date') : (!endDate ? (t?.selectEnd || 'Select end date') : (t?.rangeSelected || 'Range selected'))}
                        </span>
                        <button
                            onClick={() => { onChange({ startDate: '', endDate: '' }); setIsOpen(false); }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
                        >
                            {t?.clear || 'Clear'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { forwardRef } from 'react';

export const Card = forwardRef(({ children, title, className = "", style }, ref) => (
    <div ref={ref} style={style} className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
        {title && (
            <div className="border-b border-slate-100 bg-slate-50/50 p-3 font-bold text-slate-700">
                {title}
            </div>
        )}
        {children}
    </div>
));

Card.displayName = 'Card';

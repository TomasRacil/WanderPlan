import React from 'react';
import { COLORS } from '../../data/uiConstants';

export const SectionTitle = ({ icon: Icon, title, subtitle, subtitleClassName = "" }) => (
    <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
            <div className={`p-2 rounded-lg bg-indigo-50 ${COLORS.accent}`}>
                <Icon size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>
        {subtitle && <p className={`text-slate-500 text-sm ml-11 ${subtitleClassName}`}>{subtitle}</p>}
    </div>
);

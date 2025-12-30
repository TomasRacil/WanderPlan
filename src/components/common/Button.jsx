import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, icon: Icon, component = "button", ...props }) => {
    const base = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
        ghost: "text-slate-500 hover:bg-slate-100 hover:text-indigo-600",
        danger: "text-red-500 hover:bg-red-50",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200",
    };

    if (component === "label") {
        return (
            <label className={`${base} ${variants[variant]} ${className} cursor-pointer`} {...props}>
                {Icon && <Icon size={18} />}
                {children}
            </label>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            type={onClick ? "button" : "submit"}
            className={`${base} ${variants[variant]} ${className}`}
            {...props}
        >
            {Icon && <Icon size={18} />}
            {children}
        </button>
    );
};

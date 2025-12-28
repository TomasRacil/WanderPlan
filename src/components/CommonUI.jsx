import React from 'react';
import { COLORS } from '../data/uiConstants';

export const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-1">
      <div className={`p-2 rounded-lg bg-indigo-50 ${COLORS.accent}`}>
        <Icon size={20} />
      </div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
    </div>
    {subtitle && <p className="text-slate-500 text-sm ml-11">{subtitle}</p>}
  </div>
);

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

export const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false, icon: Icon, component = "button" }) => {
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
      <label className={`${base} ${variants[variant]} ${className} cursor-pointer`}>
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
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "danger" }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className="space-y-4">
      <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="secondary" onClick={onClose} className="px-6">{cancelText}</Button>
        <Button variant={variant} onClick={() => { onConfirm(); onClose(); }} className="px-6">{confirmText}</Button>
      </div>
    </div>
  </Modal>
);

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col animate-scaleIn overflow-visible`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar" style={{ overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
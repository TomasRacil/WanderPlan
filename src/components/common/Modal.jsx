import React from 'react';
import ReactDOM from 'react-dom';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col animate-scaleIn overflow-visible`}>
                <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0">
                    <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        ✕
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar" style={{ overflowY: 'auto' }}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

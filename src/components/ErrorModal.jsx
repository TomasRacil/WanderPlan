import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './CommonUI';

export const ErrorModal = ({ error, onClose, onRetry }) => {
    if (!error) return null;

    const isQuotaError = error.code === 429 || error.message?.includes('Quota') || error.message?.includes('429');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-red-800">
                        {isQuotaError ? "Generation Limit Reached" : "Something went wrong"}
                    </h3>
                    <button onClick={onClose} className="ml-auto text-red-400 hover:text-red-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-600 mb-4">
                        {isQuotaError
                            ? "You've hit the daily limit for the free Gemini API. This is common with the free tier."
                            : error.message || "An unexpected error occurred while generating your trip content."}
                    </p>

                    {isQuotaError && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800 mb-6">
                            <strong>Tip:</strong> Try switching to a different model in Settings (e.g., from 'Flash' to 'Pro' or vice versa), or wait a few minutes.
                        </div>
                    )}

                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={onClose}>
                            Dismiss
                        </Button>
                        {onRetry && (
                            <Button onClick={() => { onClose(); onRetry(); }}>
                                Try Again
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

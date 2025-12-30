import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ErrorModal = ({ error, onClose, onRetry, t }) => {
    if (!error) return null;

    const isQuotaError = error.code === 429 || error.message?.includes('Quota') || error.message?.includes('429');
    const isAiError = error.isAiError || error.message?.includes('validation') || error.message?.includes('parse');

    let title = t.errorOccurred || "Something went wrong";
    let message = error.message || "An unexpected error occurred.";

    if (isQuotaError) {
        title = t.generationLimitTitle || "Generation Limit Reached";
        message = t.generationLimitMsg || "You've hit the daily limit for the free Gemini API.";
    } else if (isAiError) {
        if (error.message === "API Key missing") {
            title = t.apiKeyMissing || "API Key Missing";
            message = t.apiKeyMissingMsg || "Please set your API key in Settings.";
        } else {
            title = t.aiResponseError || "AI Response Error";
            message = t.aiMalformedMsg || "The AI generated a malformed response.";
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-red-800">
                        {title}
                    </h3>
                    <button onClick={onClose} className="ml-auto text-red-400 hover:text-red-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-600 mb-4 whitespace-pre-wrap">
                        {message}
                    </p>

                    {isQuotaError && t.quotaTip && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800 mb-6">
                            <strong>Tip:</strong> {t.quotaTip}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={onClose}>
                            {t.dismiss || "Dismiss"}
                        </Button>
                        {onRetry && (
                            <Button onClick={() => { onClose(); onRetry(); }}>
                                {t.tryAgain || "Try Again"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

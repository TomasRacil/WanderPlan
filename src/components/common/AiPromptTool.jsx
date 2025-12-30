import React, { useState } from 'react';
import { Sparkles, Paperclip, X } from 'lucide-react';
import { AttachmentManager } from './AttachmentManager';
import { Button } from './Button';

export const AiPromptTool = ({ onGenerate, loading, aiMode, setAiMode, t, placeholder = "AI Suggestions...", resetTrigger }) => {
    const [localPrompt, setLocalPrompt] = useState('');
    const [showAttachments, setShowAttachments] = useState(false);
    const [attachments, setAttachments] = useState([]); // This will now store IDs
    const [attachmentIds, setAttachmentIds] = useState([]); // Alignment

    // Links are not typically used for prompt context yet, but AttachmentManager handles them.
    // We can just ignore them or store them if we want to support URL context later.
    const [links, setLinks] = useState([]);

    React.useEffect(() => {
        if (resetTrigger) {
            setLocalPrompt('');
            setAttachmentIds([]);
            setShowAttachments(false);
        }
    }, [resetTrigger]);

    const handleGenerate = () => {
        onGenerate(localPrompt, aiMode, attachmentIds);
        // We probably don't clear prompt/attachments immediately in case user wants to retry or refine,
        // but typically generating consumes the intent. Let's keep them for now or clear?
        // Let's clear for fresh start usually.
        // setLocalPrompt('');
        // setAttachments([]);
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-stretch bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all overflow-hidden w-full">
                {/* Left Sidebar: Icon */}
                <div className="flex items-center justify-center px-4 bg-slate-50/50 border-r border-slate-100 flex-shrink-0">
                    <Sparkles size={16} className="text-indigo-500" />
                </div>

                {/* Center Content: Stacked Select + Input */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="border-b border-slate-100">
                        <select
                            value={aiMode}
                            onChange={(e) => setAiMode(e.target.value)}
                            className="bg-transparent px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 outline-none w-full cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                            <option value="add">{t?.addNew}</option>
                            <option value="update">{t?.updateExisting}</option>
                            <option value="fill">{t?.fillGaps}</option>
                            <option value="dedupe">{t?.removeDuplicates}</option>
                        </select>
                    </div>

                    <div className="flex flex-1 items-stretch min-h-[44px]">
                        <textarea
                            rows="1"
                            value={localPrompt}
                            onChange={(e) => {
                                setLocalPrompt(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder={placeholder}
                            className="bg-transparent px-3 py-3 text-xs outline-none w-full text-slate-700 placeholder:text-slate-400 font-medium resize-none overflow-hidden max-h-[200px] leading-relaxed"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                        />
                        {/* Attachment Toggle inside Prompt area */}
                        <div className="flex items-center pr-1 self-center">
                            <button
                                onClick={() => setShowAttachments(!showAttachments)}
                                className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${attachmentIds.length > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
                                title={t?.addAttachment}
                            >
                                <Paperclip size={12} />
                            </button>
                            {attachmentIds.length > 0 && (
                                <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full mr-2">
                                    {attachmentIds.length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className={`px-6 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 min-w-[100px] sm:min-w-[120px] self-stretch flex-shrink-0 ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'}`}
                >
                    {loading && (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    <span className="text-center leading-tight">
                        {loading ? "..." : (t?.generatePlan || "Generate")}
                    </span>
                </button>
            </div>

            {/* Expandable Attachment Area */}
            {showAttachments && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 animate-fadeIn relative">
                    <button
                        onClick={() => setShowAttachments(false)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    >
                        <X size={14} />
                    </button>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{t?.contextFiles}</p>
                    <AttachmentManager
                        attachmentIds={attachmentIds}
                        links={links}
                        onUpdate={(data) => {
                            if (data.attachmentIds) setAttachmentIds(data.attachmentIds);
                            if (data.links) setLinks(data.links);
                        }}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
};

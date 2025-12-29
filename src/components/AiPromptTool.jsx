import React, { useState } from 'react';
import { Sparkles, Paperclip, X } from 'lucide-react';
import { AttachmentManager } from './AttachmentManager';
import { Button } from './CommonUI';

export const AiPromptTool = ({ onGenerate, loading, aiMode, setAiMode, t, placeholder = "AI Suggestions...", resetTrigger }) => {
    const [localPrompt, setLocalPrompt] = useState('');
    const [showAttachments, setShowAttachments] = useState(false);
    const [attachments, setAttachments] = useState([]);

    // Links are not typically used for prompt context yet, but AttachmentManager handles them.
    // We can just ignore them or store them if we want to support URL context later.
    const [links, setLinks] = useState([]);

    React.useEffect(() => {
        if (resetTrigger) {
            setLocalPrompt('');
            setAttachments([]);
            setShowAttachments(false);
        }
    }, [resetTrigger]);

    const handleGenerate = () => {
        onGenerate(localPrompt, aiMode, attachments);
        // We probably don't clear prompt/attachments immediately in case user wants to retry or refine,
        // but typically generating consumes the intent. Let's keep them for now or clear?
        // Let's clear for fresh start usually.
        // setLocalPrompt('');
        // setAttachments([]);
    };

    return (
        <div className="flex flex-col gap-2 w-full md:w-auto">
            <div className="grid grid-cols-[auto_1fr_auto] grid-rows-2 md:flex md:flex-row items-stretch md:items-center bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all overflow-hidden w-full">
                <div className="row-start-1 col-start-1 flex items-center px-3 py-2 border-r border-b md:border-b-0 border-slate-100 bg-slate-50/50 h-full">
                    <Sparkles size={14} className="text-indigo-500" />
                </div>

                <select
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value)}
                    className="row-start-1 col-start-2 bg-transparent px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 outline-none border-b md:border-b-0 border-slate-100 h-full cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <option value="add">{t?.addNew}</option>
                    <option value="update">{t?.updateExisting}</option>
                    <option value="fill">{t?.fillGaps}</option>
                    <option value="dedupe">{t?.removeDuplicates}</option>
                </select>

                <div className="row-start-2 col-start-1 col-span-2 md:col-span-1 flex items-center flex-1 min-w-[200px] border-r md:border-r-0 border-slate-100">
                    <input
                        type="text"
                        value={localPrompt}
                        onChange={(e) => setLocalPrompt(e.target.value)}
                        placeholder={placeholder}
                        className="bg-transparent px-3 py-2 text-xs outline-none w-full text-slate-700 placeholder:text-slate-400 font-medium"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleGenerate();
                            }
                        }}
                    />
                    {/* Attachment Toggle */}
                    <button
                        onClick={() => setShowAttachments(!showAttachments)}
                        className={`p-2 mr-1 rounded-full transition-colors ${attachments.length > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
                        title={t?.addAttachment}
                    >
                        <Paperclip size={14} />
                    </button>
                    {attachments.length > 0 && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full mr-2">
                            {attachments.length}
                        </span>
                    )}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className={`row-start-1 row-span-2 col-start-3 md:col-auto px-4 py-2 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 h-full md:h-auto ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                >
                    {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    <span className={loading ? "" : "md:inline"}>{loading ? "" : (t?.generatePlan || "Generate")}</span>
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
                        attachments={attachments}
                        links={links}
                        onUpdate={(data) => {
                            if (data.attachments) setAttachments(data.attachments);
                            if (data.links) setLinks(data.links);
                        }}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
};

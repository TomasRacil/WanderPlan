import React, { useState } from 'react';
import { Paperclip, Link as LinkIcon, X, Plus, Image as ImageIcon, FileText, Trash2, ExternalLink, Download } from 'lucide-react';
import { Button } from './CommonUI';

export const AttachmentManager = ({ attachments = [], links = [], onUpdate, t }) => {
    const [activeTab, setActiveTab] = useState('files');
    const [inputUrl, setInputUrl] = useState('');
    const [inputLabel, setInputLabel] = useState('');
    const [error, setError] = useState(null);

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        let newAttachments = [];
        let errorMsg = null;

        files.forEach(file => {
            // 5MB Limit for IDB
            if (file.size > 5 * 1024 * 1024) {
                errorMsg = t?.fileTooLarge || "File too large (Max 5MB)";
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                const newAttachment = {
                    id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9)),
                    name: file.name,
                    type: file.type,
                    data: base64
                };

                // We need to accumulate attachments because FileReader is async
                // Ideally we use promises or just simple callback stacking, but since we want to batch update:
                // Let's rely on functional state update if possible, but here we invoke onUpdate.
                // Better approach for multiple async reads:

                newAttachments.push(newAttachment);

                if (newAttachments.length === files.length) {
                    onUpdate({ attachments: [...attachments, ...newAttachments], links });
                    setError(null);
                }
            };
            reader.readAsDataURL(file);
        });

        if (errorMsg) setError(errorMsg);
        e.target.value = ''; // Reset input
    };

    const handleDeleteAttachment = (id) => {
        onUpdate({
            attachments: attachments.filter(a => a.id !== id),
            links
        });
    };

    const handleAddLink = () => {
        if (!inputUrl) return;
        let url = inputUrl;
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        const newLink = {
            id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9)),
            url: url,
            label: inputLabel || new URL(url).hostname
        };

        onUpdate({ attachments, links: [...links, newLink] });
        setInputUrl('');
        setInputLabel('');
    };

    const handleDeleteLink = (id) => {
        onUpdate({
            attachments,
            links: links.filter(l => l.id !== id)
        });
    };

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <div className="flex border-b border-slate-200 bg-white">
                <button
                    type="button"
                    onClick={() => setActiveTab('files')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'files' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t?.files || 'Files'} ({attachments.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('links')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'links' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t?.links || 'Links'} ({links.length})
                </button>
            </div>

            <div className="p-4">
                {activeTab === 'files' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Paperclip className="w-6 h-6 text-slate-400 mb-1" />
                                    <p className="mb-1 text-xs text-slate-500"><span className="font-semibold">{t?.clickToUpload}</span> {t?.dropFiles}</p>
                                    <p className="text-[10px] text-slate-400">PDF, PNG, JPG (Max 5MB)</p>
                                </div>
                                <input type="file" className="hidden" accept="image/*,application/pdf,.zip" multiple onChange={handleFileUpload} />
                            </label>
                        </div>
                        {error && <p className="text-red-500 text-xs">{error}</p>}

                        <div className="space-y-2">
                            {attachments.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 shrink-0 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                                            {file.type.includes('image') ? (
                                                <img src={file.data} alt="thumb" className="w-full h-full object-cover rounded" />
                                            ) : (
                                                <FileText size={16} />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase">{file.type.split('/')[1]}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <a href={file.data} download={file.name} className="p-1 text-slate-400 hover:text-indigo-600">
                                            <Download size={14} />
                                        </a>
                                        <button onClick={() => handleDeleteAttachment(file.id)} className="p-1 text-slate-400 hover:text-red-500">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'links' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                placeholder={t?.urlPlaceholder}
                                value={inputUrl}
                                onChange={e => setInputUrl(e.target.value)}
                                className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                            <Button onClick={handleAddLink} disabled={!inputUrl} icon={Plus} className="px-3">{t?.add}</Button>
                        </div>
                        <input
                            placeholder={t?.labelPlaceholder}
                            value={inputLabel}
                            onChange={e => setInputLabel(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                        />

                        <div className="space-y-2 mt-2">
                            {links.map(link => (
                                <div key={link.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 shrink-0 bg-indigo-50 rounded flex items-center justify-center text-indigo-500">
                                            <LinkIcon size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline truncate block">
                                                {link.label || link.url}
                                            </a>
                                            <p className="text-[10px] text-slate-400 truncate">{link.url}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteLink(link.id)} className="p-1 text-slate-400 hover:text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

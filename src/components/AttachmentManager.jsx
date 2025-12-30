import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addDocuments } from '../store/resourceSlice';
import { generateId } from '../utils/idGenerator';
import { Paperclip, Link as LinkIcon, X, Plus, Image as ImageIcon, FileText, Trash2, ExternalLink, Download, Library, CheckSquare } from 'lucide-react';
import { Button } from './CommonUI';

export const AttachmentManager = ({ attachmentIds = [], links = [], onUpdate, t }) => {
    const dispatch = useDispatch();
    const allDocuments = useSelector(state => state.resources.documents || {});
    const [activeTab, setActiveTab] = useState('files');
    const [inputUrl, setInputUrl] = useState('');
    const [inputLabel, setInputLabel] = useState('');
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Resolve IDs to actual document objects for rendering
    const attachments = attachmentIds
        .map(id => allDocuments[id])
        .filter(Boolean);

    // Get documents that are NOT in the current item but exist in the project
    const libraryDocuments = Object.values(allDocuments)
        .filter(doc => !attachmentIds.includes(String(doc.id)));

    const processFiles = (files) => {
        if (!files || !files.length) return;

        let newDocsToStore = [];
        let newIdsForParent = [];
        let errorMsg = null;
        let processedCount = 0;

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                errorMsg = t?.fileTooLarge || "File too large (Max 5MB)";
                processedCount++;
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                const id = generateId('doc');

                const newDoc = {
                    id,
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    data: base64,
                    summary: '',
                    includeInPrint: true,
                    createdAt: new Date().toISOString()
                };

                newDocsToStore.push(newDoc);
                newIdsForParent.push(id);
                processedCount++;

                if (processedCount === files.length) {
                    if (newDocsToStore.length > 0) {
                        dispatch(addDocuments(newDocsToStore));
                        onUpdate({ attachmentIds: [...attachmentIds, ...newIdsForParent], links });
                    }
                    setError(null);
                }
            };
            reader.readAsDataURL(file);
        });

        if (errorMsg) setError(errorMsg);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        processFiles(files);
        e.target.value = '';
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragover" || e.type === "dragenter") {
            setIsDragging(true);
        } else if (e.type === "dragleave" || e.type === "drop") {
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        processFiles(files);
    };

    const handleDeleteAttachment = (id) => {
        // We only remove the REFERENCE from the item. 
        // The global file stays in the library.
        onUpdate({
            attachmentIds: attachmentIds.filter(aId => String(aId) !== String(id)),
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
            id: generateId('link'),
            url: url,
            label: inputLabel || new URL(url).hostname
        };

        onUpdate({ attachmentIds, links: [...links, newLink] });
        setInputUrl('');
        setInputLabel('');
    };

    const handleDeleteLink = (id) => {
        onUpdate({
            attachmentIds,
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
                    {t?.files || 'Files'} ({attachmentIds.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('links')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'links' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t?.links || 'Links'} ({links.length})
                </button>
                {libraryDocuments.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('library')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'library' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t?.library || 'Library'} ({libraryDocuments.length})
                    </button>
                )}
            </div>

            <div className="p-4">
                {activeTab === 'files' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                            <label
                                className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                                    <Paperclip className={`w-6 h-6 mb-1 ${isDragging ? 'text-indigo-500 animate-bounce' : 'text-slate-400'}`} />
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

                {activeTab === 'library' && (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-500 italic mb-2">{t?.libraryDesc || "Select documents previously uploaded to other items in your trip."}</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {libraryDocuments.map(file => {
                                return (
                                    <div key={file.id} className="flex items-center justify-between p-2 border bg-white border-slate-200 hover:border-indigo-300 rounded-lg group">
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
                                        <button
                                            onClick={() => {
                                                // Add reference to existing file from library
                                                onUpdate({ attachmentIds: [...attachmentIds, String(file.id)], links });
                                            }}
                                            className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

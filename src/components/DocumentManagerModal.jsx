import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Modal, Button, ConfirmModal } from './CommonUI';
import { Trash2, FileText, Image as ImageIcon, Eye, AlertCircle, Sparkles, Download } from 'lucide-react';
import { deleteGlobalAttachment } from '../store/tripSlice';
import { LOCALES } from '../i18n/locales';
import { FilePreviewModal } from './FilePreviewModal';

export const DocumentManagerModal = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const { itinerary, preTripTasks, packingList, distilledContext, language } = useSelector(state => state.trip);
    const t = LOCALES[language || 'en'];

    // State for viewing distilled info
    const [viewingDistilled, setViewingDistilled] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);

    const handleDownload = (doc) => {
        if (!doc.data) return;
        const link = document.createElement('a');
        link.href = doc.data;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Derive the list of all unique attachments
    const documents = useMemo(() => {
        const docMap = new Map();

        const processItem = (item, source) => {
            if (item.attachments) {
                item.attachments.forEach(att => {
                    if (!docMap.has(att.id)) {
                        docMap.set(att.id, {
                            ...att,
                            refs: 0,
                            sources: new Set()
                        });
                    }
                    const doc = docMap.get(att.id);
                    doc.refs++;
                    doc.sources.add(source);
                });
            }
        };

        itinerary.forEach(i => processItem(i, t?.itinerary));
        preTripTasks.forEach(task => processItem(task, t?.tasks));
        packingList.forEach(cat => (cat.items || []).forEach(item => processItem(item, t?.packing)));

        const allDocs = Array.from(docMap.values());
        console.log("📂 Document Manager - All Docs:", allDocs);
        console.log("⚗️ Document Manager - Distilled Context:", distilledContext);
        console.log("🔍 Matching Keys:", allDocs.filter(d => distilledContext && distilledContext[d.id]).map(d => d.id));

        return allDocs;
    }, [itinerary, preTripTasks, packingList, t, distilledContext]);

    const handleDelete = (id) => {
        dispatch(deleteGlobalAttachment(id));
        setConfirmDelete(null);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t?.manageDocuments || "Manage Documents"} maxWidth="max-w-4xl">
                <div className="space-y-4">
                    {documents.length === 0 ? (
                        <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            {t?.noDocuments || "No documents attached to any items."}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {documents.map(doc => (
                                <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div
                                            className="flex items-center gap-3 overflow-hidden cursor-pointer group"
                                            onClick={() => setPreviewFile(doc)}
                                        >
                                            <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                                                {doc.type.includes('image') ? (
                                                    <img src={doc.data} alt="thumb" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <FileText size={20} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors" title={doc.name}>{doc.name}</p>
                                                <p className="text-[10px] text-slate-400 uppercase">{doc.type.split('/')[1] || 'FILE'} • {Math.round((doc.data?.length || 0) / 1024)}KB</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleDownload(doc)}
                                                className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                                                title={t?.download || "Download"}
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(doc.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                title={t?.delete}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
                                        <div className="flex gap-1 flex-wrap">
                                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                                {doc.refs} {t?.refs || 'Refs'}
                                            </span>
                                            {Array.from(doc.sources).map(src => (
                                                <span key={src} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                                                    {src}
                                                </span>
                                            ))}
                                        </div>

                                        {distilledContext && distilledContext[doc.id] && (
                                            <button
                                                onClick={() => setViewingDistilled({ id: doc.id, name: doc.name, info: distilledContext[doc.id] })}
                                                className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                                            >
                                                <Eye size={10} /> {t?.viewAiData || "View AI Data"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button variant="secondary" onClick={onClose}>{t?.close}</Button>
                    </div>
                </div>
            </Modal>

            {/* View Distilled Info Modal */}
            <Modal
                isOpen={!!viewingDistilled}
                onClose={() => setViewingDistilled(null)}
                title={viewingDistilled?.name || "AI Analyzed Data"}
            >
                <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-start gap-2">
                        <Sparkles className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                        <div className="text-xs text-emerald-800">
                            <p className="font-bold mb-1">AI Extracted Information</p>
                            <p>The AI uses this summary to understand the document without re-reading it.</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs text-slate-600 whitespace-pre-wrap max-h-96 overflow-auto">
                        {viewingDistilled?.info?.extractedInfo || "No data available."}
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={() => setViewingDistilled(null)}>{t?.close}</Button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => handleDelete(confirmDelete)}
                title={t?.confirmDelete || "Delete Document"}
                message={t?.confirmDeleteDocMsg || "Are you sure you want to delete this document? It will be removed from ALL events and tasks that reference it."}
            />

            <FilePreviewModal
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
            />
        </>
    );
};

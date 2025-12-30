import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Modal } from './Modal';
import { Button } from './Button';
import { ConfirmModal } from './ConfirmModal';
import { Trash2, FileText, Image as ImageIcon, Eye, AlertCircle, Sparkles, Download, Edit2, Check, X } from 'lucide-react';
import { deleteGlobalAttachment } from '../../store/tripSlice';
import { updateDocument } from '../../store/resourceSlice';
import { removeUnusedDocuments } from '../../store/thunks';
import { LOCALES } from '../../i18n/locales';
import { FilePreviewModal } from './FilePreviewModal';

export const DocumentManagerModal = ({ isOpen, onClose }) => {
    const dispatch = useDispatch();
    const { items: itinerary } = useSelector(state => state.itinerary);
    const { list: packingList } = useSelector(state => state.packing);
    const { tasks: preTripTasks, documents: storedDocuments = {} } = useSelector(state => state.resources);
    const { language } = useSelector(state => state.ui);
    const t = LOCALES[language || 'en'];

    const [viewingDistilled, setViewingDistilled] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [summaryDraft, setSummaryDraft] = useState('');

    const handleDownload = (doc) => {
        if (!doc.data) return;
        const link = document.createElement('a');
        link.href = doc.data;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate metadata for each stored document (refs, sources)
    const documents = useMemo(() => {
        const docList = Object.values(storedDocuments).map(doc => ({
            ...doc,
            refs: 0,
            sources: new Set()
        }));

        const incrementRef = (id, source) => {
            const doc = docList.find(d => String(d.id) === String(id));
            if (doc) {
                doc.refs++;
                doc.sources.add(source);
            }
        };

        itinerary.forEach(i => (i.attachmentIds || []).forEach(id => incrementRef(id, t?.itinerary || 'Itinerary')));
        preTripTasks.forEach(task => (task.attachmentIds || []).forEach(id => incrementRef(id, t?.tasks || 'Tasks')));
        packingList.forEach(cat => (cat.items || []).forEach(item => (item.attachmentIds || []).forEach(id => incrementRef(id, t?.packing || 'Packing List'))));

        return docList;
    }, [itinerary, preTripTasks, packingList, storedDocuments, t]);

    const handleDelete = (id) => {
        dispatch(deleteGlobalAttachment(id));
        setConfirmDelete(null);
    };

    const handleTogglePrint = (id, current) => {
        dispatch(updateDocument({ id, updates: { includeInPrint: !current } }));
    };

    const handleCleanup = () => {
        if (window.confirm(t?.confirmCleanup || "Remove all documents that are not referenced by any itinerary item or task?")) {
            dispatch(removeUnusedDocuments());
        }
    };

    const startEditing = (doc) => {
        setEditingId(doc.id);
        setEditingName(doc.name);
    };

    const saveRename = () => {
        if (editingName.trim() && editingId) {
            dispatch(updateDocument({ id: editingId, updates: { name: editingName.trim() } }));
        }
        setEditingId(null);
    };

    const handleRenameKeyDown = (e) => {
        if (e.key === 'Enter') saveRename();
        if (e.key === 'Escape') setEditingId(null);
    };

    const handleSaveSummary = () => {
        if (viewingDistilled?.id) {
            dispatch(updateDocument({ id: viewingDistilled.id, updates: { summary: summaryDraft } }));
            setViewingDistilled(null);
        }
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
                                            <div className="min-w-0 flex-1">
                                                {editingId === doc.id ? (
                                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            onBlur={saveRename}
                                                            onKeyDown={handleRenameKeyDown}
                                                            className="text-sm font-bold text-indigo-600 bg-indigo-50 border-b-2 border-indigo-500 focus:outline-none w-full px-1"
                                                        />
                                                        <button onClick={saveRename} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded">
                                                            <Check size={14} />
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 group/name">
                                                        <p
                                                            className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors"
                                                            title={doc.name}
                                                        >
                                                            {doc.name}
                                                        </p>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); startEditing(doc); }}
                                                            className="opacity-0 group-hover/name:opacity-100 p-0.5 text-slate-400 hover:text-indigo-500 transition-all"
                                                            title={t?.rename}
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-slate-400 uppercase">{doc.type.split('/')[1] || 'FILE'} • {doc.size ? `${Math.round(doc.size / 1024)}KB` : `${Math.round((doc.data?.length || 0) / 1024)}KB`}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <div className="flex items-center bg-slate-50 px-2 py-1 rounded border border-slate-200 mr-2">
                                                <input
                                                    type="checkbox"
                                                    id={`print-${doc.id}`}
                                                    checked={doc.includeInPrint}
                                                    onChange={() => handleTogglePrint(doc.id, doc.includeInPrint)}
                                                    className="w-3 h-3 rounded text-indigo-600 mr-1.5"
                                                />
                                                <label htmlFor={`print-${doc.id}`} className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">
                                                    {t?.includeInPrint || "Include in Print"}
                                                </label>
                                            </div>
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
                                                {doc.refs} {t?.refs || 'References'}
                                            </span>
                                            {Array.from(doc.sources).map(src => (
                                                <span key={src} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                                                    {src}
                                                </span>
                                            ))}
                                        </div>

                                        {doc.summary && (
                                            <button
                                                onClick={() => {
                                                    setViewingDistilled({ id: doc.id, name: doc.name, info: doc.summary });
                                                    setSummaryDraft(typeof doc.summary === 'string' ? doc.summary : doc.summary?.extractedInfo || '');
                                                }}
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

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={handleCleanup} icon={Trash2} className="text-red-500 hover:bg-red-50 border-red-100">
                            {t?.cleanupUnused || "Cleanup Unused"}
                        </Button>
                        <Button variant="secondary" onClick={onClose}>{t?.close}</Button>
                    </div>
                </div>
            </Modal>

            {/* Edit AI Data Modal */}
            <Modal
                isOpen={!!viewingDistilled}
                onClose={() => setViewingDistilled(null)}
                title={viewingDistilled?.name ? `${t?.editAiData || "Edit AI Data"}: ${viewingDistilled.name}` : (t?.editAiData || "Edit AI Data")}
            >
                <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-start gap-2">
                        <Sparkles className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                        <div className="text-xs text-emerald-800">
                            <p className="font-bold mb-1">{t?.aiExtractedInfo || "AI Extracted Information"}</p>
                            <p className="mb-2">{t?.aiSummaryUsage || "The AI uses this summary to understand the document without re-reading it."}</p>
                            <p className="italic bg-white/50 p-2 rounded border border-emerald-100 text-[10px]">
                                <AlertCircle size={10} className="inline mr-1 mb-0.5" />
                                {t?.aiDataDescription || "Information Gemini uses to understand this document."}
                            </p>
                        </div>
                    </div>

                    <textarea
                        value={summaryDraft}
                        onChange={(e) => setSummaryDraft(e.target.value)}
                        className="w-full h-64 p-4 rounded-lg border border-slate-200 font-mono text-xs text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                        placeholder={t?.noDataAvailable || "No data available."}
                    />

                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setViewingDistilled(null)}>{t?.cancel}</Button>
                        <Button onClick={handleSaveSummary} icon={Sparkles} className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700">
                            {t?.saveChanges || "Save Changes"}
                        </Button>
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

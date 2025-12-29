import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, CheckSquare, Trash2, CheckCircle, Sparkles, Paperclip, Link as LinkIcon, Download, Edit2, FileText } from 'lucide-react';
import { BUDGET_CATEGORIES } from '../data/budgetConstants';
import { SearchableSelect } from './SearchableSelect';
import { ALL_CURRENCIES } from '../data/currencies';
import { SectionTitle, Modal, Button, ConfirmModal } from './CommonUI';
import { setPreTripTasks, updateTripDetails, generateTrip } from '../store/tripSlice';
import { AttachmentManager } from './AttachmentManager';
import { FilePreviewModal } from './FilePreviewModal';
import { AiPromptTool } from './AiPromptTool';
import { LOCALES } from '../i18n/locales';
import { getBudgetCategory } from '../utils/helpers';

export const PreTripTasks = () => {
    const dispatch = useDispatch();
    const { preTripTasks, tripDetails, language, exchangeRates = {}, loading } = useSelector(state => state.trip);

    // Filtered list of currencies allowed (Home + Added)
    const activeCurrencies = ALL_CURRENCIES.filter(c =>
        c.code === tripDetails.homeCurrency ||
        Object.keys(exchangeRates).includes(c.code)
    );

    const t = LOCALES[language || 'en'];

    const [modal, setModal] = useState({ isOpen: false, type: 'add', taskId: null });
    const [taskForm, setTaskForm] = useState({
        text: '',
        deadline: '',
        cost: '',
        currency: tripDetails.lastUsedCurrency || tripDetails.homeCurrency || 'USD',
        category: 'Documents',
        isPaid: false,
        timeToComplete: '',
        notes: '',
        attachments: [],
        links: []
    });
    const [localPrompt, setLocalPrompt] = useState('');
    const [aiMode, setAiMode] = useState('add');
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
    const [previewFile, setPreviewFile] = useState(null);

    const openModal = (type, task = null) => {
        if (type === 'edit' && task) {
            setTaskForm({
                text: task.text,
                deadline: task.deadline || '',
                cost: task.cost || '',
                currency: task.currency || tripDetails.homeCurrency,
                category: task.category || 'Documents',
                isPaid: task.isPaid || false,
                timeToComplete: task.timeToComplete || '',
                notes: task.notes || '',
                attachments: task.attachments || [],
                links: task.links || []
            });
            setModal({ isOpen: true, type: 'edit', taskId: task.id });
        } else {
            setTaskForm({
                text: '',
                deadline: '',
                cost: '',
                currency: tripDetails.lastUsedCurrency || tripDetails.homeCurrency || 'USD',
                category: 'Documents',
                isPaid: false,
                timeToComplete: '',
                notes: '',
                attachments: [],
                links: []
            });
            setModal({ isOpen: true, type: 'add', taskId: null });
        }
    };

    const handleModalSubmit = (e) => {
        e.preventDefault();
        if (!taskForm.text.trim()) return;

        const costValue = parseFloat(taskForm.cost) || 0;

        if (modal.type === 'add') {
            const newTask = {
                id: Date.now(),
                text: taskForm.text,
                deadline: taskForm.deadline,
                done: false,
                attachments: taskForm.attachments,
                links: taskForm.links,
                cost: costValue,
                currency: taskForm.currency,
                category: getBudgetCategory(null, taskForm.category),
                isPaid: taskForm.isPaid,
                timeToComplete: taskForm.timeToComplete,
                notes: taskForm.notes
            };
            dispatch(setPreTripTasks([...preTripTasks, newTask]));
        } else {
            dispatch(setPreTripTasks(preTripTasks.map(t =>
                t.id === modal.taskId
                    ? { ...t, text: taskForm.text, deadline: taskForm.deadline, cost: costValue, currency: taskForm.currency, category: getBudgetCategory(null, taskForm.category), isPaid: taskForm.isPaid, timeToComplete: taskForm.timeToComplete, notes: taskForm.notes, attachments: taskForm.attachments, links: taskForm.links }
                    : t
            )));
        }
        setModal({ isOpen: false, type: 'add', taskId: null });
    };

    const toggleTask = (taskId) => {
        dispatch(setPreTripTasks(preTripTasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)));
    };

    const deleteTask = (id) => {
        setConfirmDelete({ isOpen: true, id });
    };

    const confirmDeleteTask = () => {
        if (confirmDelete.id === 'ALL') {
            dispatch(setPreTripTasks([]));
        } else if (confirmDelete.id) {
            dispatch(setPreTripTasks(preTripTasks.filter(t => t.id !== confirmDelete.id)));
        }
        setConfirmDelete({ isOpen: false, id: null });
    };

    return (
        <div className="animate-fadeIn w-full">
            <div className="mb-6">
                <SectionTitle
                    icon={CheckSquare}
                    title={t.preTrip}
                    subtitle={t.preTripSubtitle}
                />
            </div>

            {/* AI Generation Tool Section - Full Width */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                        <AiPromptTool
                            onGenerate={(prompt, mode, attachments) => dispatch(generateTrip({ targetArea: 'tasks', customPrompt: prompt, aiMode: mode, promptAttachments: attachments }))}
                            loading={loading}
                            aiMode={aiMode}
                            setAiMode={setAiMode}
                            t={t}
                            placeholder={t.customPrompt}
                        />
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto">
                        <Button onClick={() => openModal('add')} icon={Plus} className="flex-1 h-10 text-xs px-6" variant="secondary">{t.addItem}</Button>
                        {preTripTasks.length > 0 && (
                            <Button
                                onClick={() => setConfirmDelete({ isOpen: true, id: 'ALL' })}
                                className="flex-1 h-10 text-xs px-6 text-red-600 hover:bg-red-50 border-red-200"
                                variant="secondary"
                            >
                                <Trash2 size={14} className="mr-1" /> {t.clearList}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {preTripTasks.length === 0 && (
                    <div className="p-12 text-center text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">
                        {t.emptyTasks}
                    </div>
                )}
                {[...preTripTasks].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1)).map(task => (
                    <div key={task.id} className={`group bg-white rounded-xl p-4 border transition-all duration-200 ${task.done ? 'border-slate-100 opacity-75' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-100'}`}>
                        <div className="flex items-start gap-4">
                            <div className="flex items-center h-6">
                                <input
                                    type="checkbox"
                                    checked={task.done}
                                    onChange={() => toggleTask(task.id)}
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-colors"
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className={`text-base font-semibold leading-tight ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {task.text}
                                    </h4>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => openModal('edit', task)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title={t.editEvent}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title={t.confirmDelete}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${task.done ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-700'} `}>
                                                    {task.category || 'General'}
                                                </span>
                                                {task.cost > 0 && (
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${task.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'} `}>
                                                        {task.currency} {task.cost.toLocaleString()} {task.isPaid ? t.paidSuffix : t.estSuffix}
                                                    </span>
                                                )}
                                                {task.deadline && (
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${new Date(task.deadline) < new Date() && !task.done
                                                        ? 'bg-red-50 text-red-600 border-red-100'
                                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                        } `}>
                                                        <FileText size={10} />
                                                        {new Date(task.deadline).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {task.timeToComplete && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                                        ⏱ {task.timeToComplete}
                                                    </span>
                                                )}
                                            </div>

                                            {task.notes && (
                                                <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg italic border-l-2 border-slate-200 whitespace-pre-wrap">
                                                    {task.notes}
                                                </p>
                                            )}

                                            {/* Attachments & Links Preview */}
                                            {(task.attachments?.length > 0 || task.links?.length > 0) && (
                                                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                                    {task.attachments?.map(a => (
                                                        <button key={a.id} onClick={() => setPreviewFile(a)} className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 hover:text-indigo-600 border border-slate-200 transition-colors" title="Preview File">
                                                            <Paperclip size={10} /> {a.name}
                                                        </button>
                                                    ))}
                                                    {task.links?.map(l => (
                                                        <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-indigo-50 px-2 py-1 rounded text-indigo-600 hover:underline border border-indigo-100">
                                                            <LinkIcon size={10} /> {l.label}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                                {task.cost > 0 && (
                                                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50">
                                                        <button
                                                            onClick={() => {
                                                                dispatch(setPreTripTasks(preTripTasks.map(t =>
                                                                    t.id === task.id ? { ...t, isPaid: !t.isPaid } : t
                                                                )));
                                                            }}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${task.isPaid
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                                                } `}
                                                        >
                                                            <CheckCircle size={14} className={task.isPaid ? 'text-emerald-500' : 'text-slate-300'} />
                                                            {task.isPaid ? t.paid : t.markPaid}
                                                        </button>
                                                    </div>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.type === 'add' ? t.addItem : t.editTask}
            >
                <form onSubmit={handleModalSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.title}</label>
                            <input
                                autoFocus
                                className="w-full p-2 bg-slate-50 border border-slate-200 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder={t.taskPlaceholder}
                                value={taskForm.text}
                                onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.deadline}</label>
                            <input
                                type="date"
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                value={taskForm.deadline}
                                onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.category}</label>
                            <select
                                value={taskForm.category}
                                onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            >
                                {BUDGET_CATEGORIES.map(c => (
                                    <option key={c} value={c}>
                                        {t[`cat_${c.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_')}`] || c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.timeToComplete}</label>
                            <input
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder={t.timePlaceholder}
                                value={taskForm.timeToComplete}
                                onChange={(e) => setTaskForm({ ...taskForm, timeToComplete: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t.cost}</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="number"
                                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm min-w-0 font-bold"
                                placeholder="0"
                                value={taskForm.cost}
                                onChange={(e) => setTaskForm({ ...taskForm, cost: e.target.value })}
                            />
                            <div className="w-28 shrink-0">
                                <select
                                    value={taskForm.currency}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setTaskForm({ ...taskForm, currency: val });
                                        dispatch(updateTripDetails({ lastUsedCurrency: val }));
                                    }}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {activeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shrink-0 h-[38px]">
                                <input
                                    type="checkbox"
                                    id="modal-paid"
                                    checked={taskForm.isPaid}
                                    onChange={(e) => setTaskForm({ ...taskForm, isPaid: e.target.checked })}
                                    className="w-4 h-4 rounded text-indigo-600 mr-2"
                                />
                                <label htmlFor="modal-paid" className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">
                                    {t.paid}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.notes}</label>
                        <textarea
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder={t.notesPlaceholder}
                            value={taskForm.notes}
                            onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                            rows="2"
                        />
                    </div>

                    {/* Attachments */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.attachments} & {t.links}</label>
                        <AttachmentManager
                            attachments={taskForm.attachments || []}
                            links={taskForm.links || []}
                            onUpdate={(data) => setTaskForm({ ...taskForm, ...data })}
                            t={t}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setModal({ ...modal, isOpen: false })}>{t.cancel}</Button>
                        <Button type="submit" className="flex-1" icon={modal.type === 'add' ? Plus : CheckCircle}>{modal.type === 'add' ? t.addItem : t.saveChanges}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={confirmDeleteTask}
                title={confirmDelete.id === 'ALL' ? t.clearList : (t.confirmDelete || 'Confirm Delete')}
                message={confirmDelete.id === 'ALL' ? t.confirmClear : (t.confirmDeleteTask || "Are you sure you want to delete this task? This action cannot be undone.")}
            />

            <FilePreviewModal
                file={previewFile}
                onClose={() => setPreviewFile(null)}
            />
        </div >
    );
};

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, CheckSquare, Trash2 } from 'lucide-react';
import { BUDGET_CATEGORIES } from '../data/budgetConstants';
import { ALL_CURRENCIES } from '../data/currencies';
import { SectionTitle } from './common/SectionTitle';
import { Button } from './common/Button';
import { ConfirmModal } from './common/ConfirmModal';
import { updateTripDetails, generateTrip } from '../store/tripSlice';
import { setTasks as setPreTripTasks } from '../store/resourceSlice';
import { FilePreviewModal } from './common/FilePreviewModal';
import { AiPromptTool } from './common/AiPromptTool';
import { LOCALES } from '../i18n/locales';
import { getBudgetCategory } from '../utils/helpers';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { reorderTasks } from '../store/resourceSlice';

// Sub-components
import { TaskItem } from './tasks/TaskItem';
import { TaskFormModal } from './tasks/TaskFormModal';

export const PreTripTasks = () => {
    const dispatch = useDispatch();
    const { tripDetails, exchangeRates = {} } = useSelector(state => state.trip);
    const { tasks: preTripTasks, documents = {} } = useSelector(state => state.resources);
    const { language, loading } = useSelector(state => state.ui);
    const t = LOCALES[language || 'en'];

    // Filtered list of currencies allowed (Home + Added)
    const activeCurrencies = ALL_CURRENCIES.filter(c =>
        c.code === tripDetails.homeCurrency ||
        Object.keys(exchangeRates).includes(c.code)
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [aiMode, setAiMode] = useState('add');
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
    const [previewFile, setPreviewFile] = useState(null);
    const [promptResetTrigger, setPromptResetTrigger] = useState(0);

    const openAddModal = () => {
        setEditingTask(null);
        setModalOpen(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setModalOpen(true);
    };

    const handleModalSubmit = (formData) => {
        const costValue = parseFloat(formData.cost) || 0;

        // Ensure currency update
        if (formData.currency && formData.currency !== tripDetails.lastUsedCurrency) {
            dispatch(updateTripDetails({ lastUsedCurrency: formData.currency }));
        }

        if (!editingTask) {
            // Add
            const newTask = {
                id: Date.now(),
                text: formData.text,
                deadline: formData.deadline,
                done: false,
                attachmentIds: formData.attachmentIds,
                links: formData.links,
                cost: costValue,
                currency: formData.currency,
                category: getBudgetCategory(null, formData.category),
                isPaid: formData.isPaid,
                timeToComplete: formData.timeToComplete,
                notes: formData.notes
            };
            dispatch(setPreTripTasks([...preTripTasks, newTask]));
        } else {
            // Edit
            dispatch(setPreTripTasks(preTripTasks.map(t =>
                t.id === editingTask.id
                    ? {
                        ...t,
                        text: formData.text,
                        deadline: formData.deadline,
                        cost: costValue,
                        currency: formData.currency,
                        category: getBudgetCategory(null, formData.category),
                        isPaid: formData.isPaid,
                        timeToComplete: formData.timeToComplete,
                        notes: formData.notes,
                        attachmentIds: formData.attachmentIds,
                        links: formData.links
                    }
                    : t
            )));
        }
        setModalOpen(false);
        setEditingTask(null);
    };

    const toggleTask = (taskId) => {
        dispatch(setPreTripTasks(preTripTasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)));
    };

    const deleteTask = (id) => {
        setConfirmDelete({ isOpen: true, id });
    };

    const togglePaid = (task) => {
        dispatch(setPreTripTasks(preTripTasks.map(t =>
            t.id === task.id ? { ...t, isPaid: !t.isPaid } : t
        )));
    };

    const confirmDeleteTask = () => {
        if (confirmDelete.id === 'ALL') {
            dispatch(setPreTripTasks([]));
        } else if (confirmDelete.id) {
            dispatch(setPreTripTasks(preTripTasks.filter(t => t.id !== confirmDelete.id)));
        }
        setConfirmDelete({ isOpen: false, id: null });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Allow some movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = preTripTasks.findIndex((t) => t.id === active.id);
            const newIndex = preTripTasks.findIndex((t) => t.id === over.id);
            dispatch(reorderTasks({ startIndex: oldIndex, endIndex: newIndex }));
        }
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

            {/* AI Generation Tool Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                        <AiPromptTool
                            onGenerate={(prompt, mode, attachments) =>
                                dispatch(generateTrip({ targetArea: 'tasks', customPrompt: prompt, aiMode: mode, promptAttachments: attachments }))
                                    .unwrap().then(() => setPromptResetTrigger(p => p + 1))
                            }
                            loading={loading}
                            aiMode={aiMode}
                            setAiMode={setAiMode}
                            t={t}
                            placeholder={t.customPrompt}
                            resetTrigger={promptResetTrigger}
                        />
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto">
                        <Button onClick={openAddModal} icon={Plus} className="flex-1 h-10 text-xs px-6" variant="secondary">{t.addItem}</Button>
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
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    {(() => {
                        const sortedTasks = [...preTripTasks].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
                        return (
                            <SortableContext
                                items={sortedTasks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {sortedTasks.map(task => (
                                    <TaskItem
                                        key={task.id}
                                        task={task}
                                        onToggle={toggleTask}
                                        onEdit={openEditModal}
                                        onDelete={deleteTask}
                                        onTogglePaid={togglePaid}
                                        onPreviewFile={setPreviewFile}
                                        documents={documents}
                                        t={t}
                                    />
                                ))}
                            </SortableContext>
                        );
                    })()}
                </DndContext>
            </div>

            <TaskFormModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingTask(null); }}
                onSubmit={handleModalSubmit}
                initialData={editingTask}
                activeCurrencies={activeCurrencies}
                categories={BUDGET_CATEGORIES}
                t={t}
            />

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

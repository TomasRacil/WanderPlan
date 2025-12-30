import { Edit2, Trash2, CheckCircle, FileText, Paperclip, Link as LinkIcon, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const TaskItem = ({
    task,
    onToggle,
    onEdit,
    onDelete,
    onTogglePaid,
    onPreviewFile,
    documents = {},
    t
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-white rounded-xl p-4 border transition-all duration-200 ${isDragging ? 'opacity-50 border-indigo-500 shadow-xl' : (task.done ? 'border-slate-100 opacity-75' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-100')}`}
        >
            <div className="flex items-start gap-4">
                <div className="flex items-center gap-2 h-6">
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-400 transition-colors opacity-40 hover:opacity-100 touch-none"
                    >
                        <GripVertical size={16} />
                    </div>
                    <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => onToggle(task.id)}
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
                                onClick={() => onEdit(task)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title={t.editEvent}
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => onDelete(task.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title={t.confirmDelete}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="flex justify-between items-start w-full">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                {(task.attachmentIds?.length > 0 || task.links?.length > 0) && (
                                    <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                        {task.attachmentIds?.map(id => {
                                            const doc = documents[id];
                                            if (!doc) return null;
                                            return (
                                                <button key={id} onClick={() => onPreviewFile(doc)} className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 hover:text-indigo-600 border border-slate-200 transition-colors" title="Preview File">
                                                    <Paperclip size={10} /> {doc.name}
                                                </button>
                                            );
                                        })}
                                        {task.links?.map(l => (
                                            <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-indigo-50 px-2 py-1 rounded text-indigo-600 hover:underline border border-indigo-100">
                                                <LinkIcon size={10} /> {l.label}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                    {task.cost > 0 && (
                                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-50 w-full">
                                            <button
                                                onClick={() => onTogglePaid(task)}
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
    );
};

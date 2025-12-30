import React from 'react';
import { Plus, Trash2, Luggage } from 'lucide-react';
import { AiPromptTool } from '../../common/AiPromptTool';
import { Button } from '../../common/Button';

export const PackingListHeader = ({
    loading,
    aiMode,
    setAiMode,
    viewMode,
    setViewMode,
    onGenerate,
    onAddCategory,
    onClearList,
    packingListLength,
    t
}) => {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                    <AiPromptTool
                        onGenerate={onGenerate}
                        loading={loading}
                        aiMode={aiMode}
                        setAiMode={setAiMode}
                        t={t}
                        placeholder={t.customPrompt}
                    />
                </div>
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl whitespace-nowrap">
                    <button
                        onClick={() => setViewMode('category')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'category' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t.byCategory}
                    </button>
                    <button
                        onClick={() => setViewMode('bag')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'bag' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t.byBag}
                    </button>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    <Button onClick={onAddCategory} icon={Plus} className="flex-1 h-10 text-xs px-6" variant="secondary">{t.addCategory}</Button>
                    {packingListLength > 0 && (
                        <Button
                            onClick={onClearList}
                            className="flex-1 h-10 text-xs px-6 text-red-600 hover:bg-red-50 border-red-200"
                            variant="secondary"
                        >
                            <Trash2 size={14} className="mr-1" /> {t.clearList}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

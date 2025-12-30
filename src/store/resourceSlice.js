import { createSlice } from '@reduxjs/toolkit';
import { generateId } from '../utils/idGenerator';
import { generateTrip, initializeTrip } from './thunks';

const initialState = {
    documents: {},
    tasks: [],
    distilledContext: {},
    phrasebook: []
};

export const resourceSlice = createSlice({
    name: 'resources',
    initialState,
    reducers: {
        setDocuments: (state, action) => {
            state.documents = action.payload || {};
        },
        addDocuments: (state, action) => {
            const docs = action.payload;
            docs.forEach(doc => {
                const id = String(doc.id);
                if (!state.documents[id]) {
                    state.documents[id] = {
                        ...doc,
                        size: doc.size || 0,
                        summary: doc.summary || '',
                        includeInPrint: doc.includeInPrint ?? true,
                        createdAt: doc.createdAt || new Date().toISOString()
                    };
                }
            });
        },
        updateDocument: (state, action) => {
            const { id, updates } = action.payload;
            if (state.documents[id]) {
                state.documents[id] = { ...state.documents[id], ...updates };
            }
        },
        deleteDocument: (state, action) => {
            const id = String(action.payload);
            delete state.documents[id];
        },
        setDistilledContext: (state, action) => {
            state.distilledContext = action.payload || {};
        },
        updateDistilledContext: (state, action) => {
            const { id, extractedInfo } = action.payload;
            if (!state.distilledContext[id]) state.distilledContext[id] = {};
            state.distilledContext[id].extractedInfo = extractedInfo;
            if (state.documents[id]) {
                state.documents[id].summary = extractedInfo;
            }
        },
        setTasks: (state, action) => {
            state.tasks = (action.payload || []).map(t => ({
                ...t,
                id: t.id || generateId('task'),
                attachmentIds: t.attachmentIds || [],
                attachments: undefined
            }));
        },
        addTask: (state, action) => {
            state.tasks.push({
                ...action.payload,
                id: action.payload.id || generateId('task'),
                done: false,
                cost: action.payload.cost || 0,
                attachmentIds: action.payload.attachmentIds || []
            });
        },
        updateTask: (state, action) => {
            const { id, updates } = action.payload;
            const index = state.tasks.findIndex(t => String(t.id) === String(id));
            if (index > -1) {
                state.tasks[index] = { ...state.tasks[index], ...updates };
            }
        },
        deleteTask: (state, action) => {
            const id = String(action.payload);
            state.tasks = state.tasks.filter(t => String(t.id) !== id);
        },
        reorderTasks: (state, action) => {
            const { startIndex, endIndex } = action.payload;
            const result = Array.from(state.tasks);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            state.tasks = result;
        },
        removeAttachmentReference: (state, action) => {
            const docId = String(action.payload);
            state.tasks.forEach(t => {
                if (t.attachmentIds) {
                    t.attachmentIds = t.attachmentIds.filter(id => String(id) !== docId);
                }
            });
        },
        applyTaskChanges: (state, action) => {
            const { adds = [], updates = [], deletes = [] } = action.payload;

            adds.forEach(t => {
                state.tasks.push({
                    ...t,
                    id: t.id || generateId('ai-task'),
                    done: false,
                    cost: t.cost || 0,
                    attachmentIds: t.attachmentIds || []
                });
            });

            updates.forEach(upd => {
                const index = state.tasks.findIndex(t => String(t.id) === String(upd.id));
                if (index > -1) {
                    state.tasks[index] = { ...state.tasks[index], ...upd.fields };
                }
            });

            const idsToDelete = deletes.map(String);
            state.tasks = state.tasks.filter(t => !idsToDelete.includes(String(t.id)));
        },
        setPhrasebook: (state, action) => {
            state.phrasebook = action.payload || [];
        },
        addToPhrasebook: (state, action) => {
            state.phrasebook.push({
                ...action.payload,
                id: action.payload.id || generateId('phrase')
            });
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(initializeTrip.fulfilled, (state, action) => {
                if (action.payload) {
                    const { resources } = action.payload;
                    state.documents = resources.documents;
                    state.tasks = resources.tasks;
                    state.distilledContext = resources.distilledContext;
                    state.phrasebook = resources.phrasebook || [];
                }
            })
            .addCase(generateTrip.fulfilled, (state, action) => {
                const data = action.payload.data;
                if (data && data.newDistilledData) {
                    const newDistilled = data.newDistilledData;
                    Object.entries(newDistilled).forEach(([docId, info]) => {
                        const id = String(docId);
                        if (id && info.extractedInfo && state.documents[id]) {
                            state.documents[id].summary = info.extractedInfo;
                        }
                    });
                }
            });
    }
});

export const {
    setDocuments, addDocuments, updateDocument, deleteDocument,
    setDistilledContext, updateDistilledContext,
    setTasks, addTask, updateTask, deleteTask, applyTaskChanges,
    reorderTasks,
    removeAttachmentReference,
    setPhrasebook, addToPhrasebook
} = resourceSlice.actions;

export default resourceSlice.reducer;

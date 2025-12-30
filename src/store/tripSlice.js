import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { generateTripContent, AVAILABLE_MODELS } from '../services/gemini';
import { get } from 'idb-keyval';

// Async thunk to generate trip content using Gemini
export const generateTrip = createAsyncThunk(
    'trip/generate',
    async ({ targetArea, customPrompt, aiMode = 'add', promptAttachments = [] }, { getState, rejectWithValue }) => {
        const state = getState().trip;
        const { apiKey, tripDetails, itinerary, preTripTasks, packingList, language, selectedModel, documents } = state;

        if (!apiKey && selectedModel !== 'local-nano') return rejectWithValue("API Key missing");

        try {
            const data = await generateTripContent(
                apiKey, tripDetails, customPrompt, itinerary, preTripTasks, packingList,
                language, targetArea, aiMode, selectedModel, documents, promptAttachments
            );

            return { data, targetArea, aiMode };
        } catch (error) {
            if (error.status === 429 || error.message.includes('429') || error.message.includes('Quota')) {
                return rejectWithValue({ code: 429, message: "Quota Exceeded: Daily limit reached for this model." });
            }
            return rejectWithValue({ message: error.message });
        }
    }
);

// Async thunk to fetch a specific currency rate (targeted)
export const fetchPairRate = createAsyncThunk(
    'trip/fetchPairRate',
    async ({ base, target }, { rejectWithValue }) => {
        try {
            // Using frankfurter for targeted pairs as it's cleaner for single pairs
            const response = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${target}`);
            const data = await response.json();
            if (data.rates && data.rates[target]) {
                return { currency: target, rate: data.rates[target] };
            }
            // Fallback to open.er-api if frankfurter fails or doesn't support the pair
            const response2 = await fetch(`https://open.er-api.com/v6/latest/${base}`);
            const data2 = await response2.json();
            if (data2.result === 'success' && data2.rates[target]) {
                return { currency: target, rate: data2.rates[target] };
            }
            return rejectWithValue('Failed to fetch rate');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk to fetch exchange rates
export const fetchExchangeRates = createAsyncThunk(
    'trip/fetchExchangeRates',
    async (baseCurrency, { rejectWithValue }) => {
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            const data = await response.json();
            if (data.result === 'success') {
                return data.rates;
            }
            return rejectWithValue('Failed to fetch rates');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Helper to migrate legacy data (ensure attachments have IDs)
const ensureAttachmentIds = (items) => {
    if (!items) return [];
    return items.map(item => ({
        ...item,
        attachments: (item.attachments || []).map(att => ({
            ...att,
            id: att.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9))
        })),
        links: (item.links || []).map(link => ({
            ...link,
            id: link.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9))
        }))
    }));
};

// Helper: Garbage Collection for Document Library
// Removes documents that are not referenced anywhere ONLY when explicitly called by user
const cleanupDocuments = (state) => {
    if (!state.documents) state.documents = {};
    const validIds = new Set();
    state.itinerary.forEach(i => (i.attachmentIds || []).forEach(id => validIds.add(String(id))));
    state.preTripTasks.forEach(t => (t.attachmentIds || []).forEach(id => validIds.add(String(id))));
    // Don't forget proposed changes
    if (state.proposedChanges && state.proposedChanges.data) {
        const { adds, updates } = state.proposedChanges.data;
        if (adds) adds.forEach(item => (item.attachmentIds || []).forEach(id => validIds.add(String(id))));
        if (updates) updates.forEach(upd => {
            if (upd.fields && upd.fields.attachmentIds) upd.fields.attachmentIds.forEach(id => validIds.add(String(id)));
        });
    }

    Object.keys(state.documents).forEach(id => {
        if (!validIds.has(String(id))) {
            delete state.documents[id];
        }
    });
};

// Migration helper: Moves decentralized attachments to central store
const migrateToCentralStore = (state) => {
    if (!state.documents) state.documents = {};

    // 1. First pass: Pull from distilledContext to ensure all summarized files are registered
    if (state.distilledContext) {
        Object.entries(state.distilledContext).forEach(([id, info]) => {
            const docId = String(id);
            if (!state.documents[docId]) {
                state.documents[docId] = {
                    id: docId,
                    name: "Attachment",
                    type: "unknown",
                    summary: info.extractedInfo || info.summary || '',
                    includeInPrint: true,
                    createdAt: new Date().toISOString()
                };
            } else if (!state.documents[docId].summary) {
                state.documents[docId].summary = info.extractedInfo || info.summary || '';
            }
        });
    }

    const processItem = (item) => {
        if (!item) return;

        // Ensure attachmentIds is initialized
        if (!item.attachmentIds) item.attachmentIds = [];

        // 2. Migrate from legacy attachments array
        if (item.attachments && Array.isArray(item.attachments)) {
            item.attachments.forEach(att => {
                const id = String(att.id);
                const distilledSummary = state.distilledContext?.[id]?.extractedInfo || '';
                const itemSummary = att.summary || att.aisummary || '';

                if (!state.documents[id]) {
                    state.documents[id] = {
                        ...att,
                        summary: distilledSummary || itemSummary || '',
                        includeInPrint: att.includeInPrint ?? true,
                        createdAt: att.createdAt || new Date().toISOString()
                    };
                } else {
                    const doc = state.documents[id];
                    // Prioritize actual data
                    if (!doc.data && att.data) doc.data = att.data;

                    // Prioritize actual summary
                    if (!doc.summary && itemSummary) doc.summary = itemSummary;
                    if (!doc.summary && distilledSummary) doc.summary = distilledSummary;

                    // Prioritize real names over placeholders like "Attachment" or "unknown"
                    if ((!doc.name || doc.name === 'Attachment' || doc.name === 'unknown') && att.name && att.name !== 'Attachment') {
                        doc.name = att.name;
                    }
                    if ((!doc.type || doc.type === 'unknown' || doc.type === 'application/octet-stream') && att.type && att.type !== 'unknown') {
                        doc.type = att.type;
                    }

                    if (att.includeInPrint !== undefined) doc.includeInPrint = att.includeInPrint;
                }

                if (!item.attachmentIds.includes(id)) {
                    item.attachmentIds.push(id);
                }
            });
            delete item.attachments;
        }
    };

    // Process all potential item containers
    state.itinerary.forEach(processItem);
    state.preTripTasks.forEach(processItem);
    if (state.packingList) {
        state.packingList.forEach(cat => {
            if (cat.items) cat.items.forEach(processItem);
        });
    }

    // Handle proposed changes too
    if (state.proposedChanges && state.proposedChanges.data) {
        const { adds, updates } = state.proposedChanges.data;
        if (adds) adds.forEach(processItem);
        if (updates) updates.forEach(upd => {
            if (upd.fields) processItem(upd.fields);
        });
    }

    // Cleanup distilledContext
    state.distilledContext = {};
};


// Helper to get default state
const getDefaultState = () => ({
    activeTab: 'overview',
    language: 'en',
    showSettings: false,
    selectedModel: 'gemini-3-flash-preview', // Default model
    documents: {}, // Centralized storage for ALL documents/attachments
    apiKey: localStorage.getItem('wanderplan_api_key') || '', // API Key can stay in localStorage for now as it is small/global
    loading: false,
    quotaError: null, // Specific state for 429 errors
    isInitialized: false,
    customPrompt: '',
    proposedChanges: null, // Store changes for review { data, targetArea, aiMode }
    tripDetails: {
        destination: '',
        origin: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        travelStyle: 'Balanced',
        budget: '2000',
        homeCurrency: 'USD',
        tripCurrency: 'USD',
        exchangeRate: 1,
        coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
        lastUsedCurrency: 'USD',
        travelers: 1
    },
    expenses: [],
    itinerary: [],
    preTripTasks: [
        { id: 1, text: 'Check passport validity', done: false, cost: 0, currency: 'USD', category: 'Documents', isPaid: false, attachments: [] },
        { id: 2, text: 'Book flights', done: false, cost: 0, currency: 'USD', category: 'Transport', isPaid: false, attachments: [] }
    ],
    packingList: [],
    phrasebook: null,
    exchangeRates: {}
});

const initialState = getDefaultState();

// Async thunk to load state from IndexedDB
export const initializeTrip = createAsyncThunk(
    'trip/initialize',
    async (_, { rejectWithValue }) => {
        try {
            const saved = await get('wanderplan_current_trip');
            if (saved) {
                return saved;
            }
            return null;
        } catch (error) {
            console.error("Failed to load from IDB", error);
            return rejectWithValue(error.message);
        }
    }
);

export const tripSlice = createSlice({
    name: 'trip',
    initialState,
    reducers: {
        setActiveTab: (state, action) => {
            state.activeTab = action.payload;
        },
        setLanguage: (state, action) => {
            state.language = action.payload;
        },
        setShowSettings: (state, action) => {
            state.showSettings = action.payload;
        },
        setApiKey: (state, action) => {
            state.apiKey = action.payload;
            localStorage.setItem('wanderplan_api_key', action.payload);
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setCustomPrompt: (state, action) => {
            state.customPrompt = action.payload;
        },
        clearQuotaError: (state) => {
            state.quotaError = null;
        },
        updateTripDetails: (state, action) => {
            state.tripDetails = { ...state.tripDetails, ...action.payload };
        },
        setSelectedModel: (state, action) => {
            state.selectedModel = action.payload;
        },
        addDocuments: (state, action) => {
            if (!state.documents) state.documents = {};
            const docs = action.payload; // Array of document objects
            docs.forEach(doc => {
                const id = String(doc.id);
                if (!state.documents[id]) {
                    state.documents[id] = {
                        ...doc,
                        summary: doc.summary || '',
                        includeInPrint: doc.includeInPrint ?? true,
                        createdAt: doc.createdAt || new Date().toISOString()
                    };
                }
            });
        },
        updateDocument: (state, action) => {
            if (!state.documents) state.documents = {};
            const { id, updates } = action.payload;
            if (state.documents[id]) {
                state.documents[id] = { ...state.documents[id], ...updates };
            }
        },
        removeUnusedDocuments: (state) => {
            cleanupDocuments(state);
        },
        setPreTripTasks: (state, action) => {
            state.preTripTasks = action.payload;
        },
        setItinerary: (state, action) => {
            state.itinerary = action.payload;
        },
        setExpenses: (state, action) => {
            state.expenses = action.payload;
        },
        setPackingList: (state, action) => {
            state.packingList = (action.payload || []).map(cat => ({
                ...cat,
                id: cat.id || `pcat-${Date.now()}-${Math.random()}`,
                items: (cat.items || []).map(item => ({
                    ...item,
                    id: item.id || `pack-${Date.now()}-${Math.random()}`
                }))
            }));
        },
        loadFullTrip: (state, action) => {
            const data = action.payload;
            if (data.tripDetails) state.tripDetails = data.tripDetails;
            if (data.preTripTasks) state.preTripTasks = ensureAttachmentIds(data.preTripTasks);
            if (data.itinerary) state.itinerary = ensureAttachmentIds(data.itinerary);
            if (data.expenses) state.expenses = data.expenses;
            if (data.packingList) {
                state.packingList = data.packingList.map(cat => ({
                    ...cat,
                    id: cat.id || `pcat-${Date.now()}-${Math.random()}`,
                    items: (cat.items || []).map(item => ({
                        ...item,
                        id: item.id || `pack-${Date.now()}-${Math.random()}`
                    }))
                }));
            }
            if (data.phrasebook) state.phrasebook = data.phrasebook;
            if (data.language) state.language = data.language;
            if (data.exchangeRates) state.exchangeRates = data.exchangeRates;
            if (data.selectedModel) state.selectedModel = data.selectedModel;
            if (data.documents) state.documents = data.documents;
            if (data.distilledContext) state.distilledContext = data.distilledContext;

            // Migrate if needed
            migrateToCentralStore(state);
        },
        setExchangeRates: (state, action) => {
            state.exchangeRates = action.payload;
        },
        updateExchangeRate: (state, action) => {
            const { currency, rate } = action.payload;
            state.exchangeRates = { ...(state.exchangeRates || {}), [currency]: rate };
        },
        discardProposedChanges: (state) => {
            state.proposedChanges = null;
        },
        // Global Document Deletion
        deleteGlobalAttachment: (state, action) => {
            if (!state.documents) state.documents = {};
            const documentId = String(action.payload);

            // 1. Remove from Document Library
            delete state.documents[documentId];

            // 2. Scrub from all items
            const removeRef = (item) => {
                if (item.attachmentIds) {
                    item.attachmentIds = item.attachmentIds.filter(id => String(id) !== documentId);
                }
                // Legacy support
                if (item.attachments) {
                    item.attachments = item.attachments.filter(a => String(a.id) !== documentId);
                }
                return item;
            };

            state.itinerary = state.itinerary.map(removeRef);
            state.preTripTasks = state.preTripTasks.map(removeRef);
            state.packingList = state.packingList.map(cat => ({
                ...cat,
                items: (cat.items || []).map(removeRef)
            }));
        },
        toggleProposedChange: (state, action) => {
            const { type, id } = action.payload; // type: 'adds', 'updates', 'deletes'
            if (!state.proposedChanges || !state.proposedChanges.data) return;

            const list = state.proposedChanges.data[type];
            if (!list) return;

            if (type === 'deletes') {
                // Deletes is just a list of IDs, so we need a parallel list or change structure
                // Let's convert deletes to objects if it's not already
                if (typeof list[0] === 'string') {
                    state.proposedChanges.data.deletes = list.map(dId => ({ id: dId, ignored: false }));
                }
                const index = state.proposedChanges.data.deletes.findIndex(d => d.id === id);
                if (index > -1) {
                    state.proposedChanges.data.deletes[index].ignored = !state.proposedChanges.data.deletes[index].ignored;
                }
            } else {
                const index = list.findIndex(item => item.id === id || (type === 'adds' && JSON.stringify(item) === id));
                if (index > -1) {
                    list[index].ignored = !list[index].ignored;
                }
            }
        },
        applyProposedChanges: (state) => {
            const { data, targetArea, aiMode } = state.proposedChanges || {};
            if (!data) return;

            // Filter out ignored changes
            const adds = (data.adds || []).filter(item => !item.ignored);
            const updates = (data.updates || []).filter(item => !item.ignored);
            const deletes = (data.deletes || []).filter(item => !item.ignored).map(d => typeof d === 'string' ? d : d.id);

            // Handle Adds
            if (adds.length > 0) {
                if (targetArea === 'itinerary') {
                    adds.forEach(e => {
                        state.itinerary.push({
                            ...e,
                            id: `ai-itinerary-${Date.now()}-${Math.random()}`,
                            cost: e.estimatedCost || e.cost || 0,
                            currency: e.currency || state.tripDetails.tripCurrency || state.tripDetails.homeCurrency,
                            isPaid: false,
                            isEditing: false,
                            category: e.category || 'Activities',
                            duration: e.duration || 60,
                            category: e.category || 'Activities',
                            duration: e.duration || 60,
                            timeZone: e.timeZone || '',
                            attachments: e.attachments || []
                        });
                    });
                    state.itinerary.sort((a, b) => new Date(a.startDate + ' ' + (a.startTime || '00:00')) - new Date(b.startDate + ' ' + (b.startTime || '00:00')));
                } else if (targetArea === 'tasks') {
                    adds.forEach(t => {
                        state.preTripTasks.push({
                            id: `ai-task-${Date.now()}-${Math.random()}`,
                            text: t.text,
                            done: false,
                            cost: t.cost || 0,
                            currency: t.currency || state.tripDetails.homeCurrency,
                            category: t.category || 'Documents',
                            isPaid: false,
                            isPaid: false,
                            attachments: t.attachments || [],
                            notes: t.notes || '',
                            dueDate: t.dueDate || '',
                            timeToComplete: t.timeToComplete || ''
                        });
                    });
                } else if (targetArea === 'packing') {
                    adds.forEach(newCat => {
                        const existingCat = state.packingList.find(c => c.category === newCat.category);
                        if (existingCat) {
                            newCat.items.forEach(newItem => {
                                if (!existingCat.items.find(i => i.text.toLowerCase() === newItem.toLowerCase())) {
                                    existingCat.items.push({
                                        id: `ai-pack-${Date.now()}-${Math.random()}`,
                                        text: newItem,
                                        done: false
                                    });
                                }
                            });
                        } else {
                            state.packingList.push({
                                id: `ai-pcat-${Date.now()}-${Math.random()}`,
                                category: newCat.category,
                                items: newCat.items.map(i => ({
                                    id: `ai-pack-${Date.now()}-${Math.random()}`,
                                    text: i,
                                    done: false
                                }))
                            });
                        }
                    });
                }
            }

            // Handle Updates
            if (updates.length > 0) {
                if (targetArea === 'itinerary') {
                    updates.forEach(upd => {
                        const index = state.itinerary.findIndex(i => String(i.id) === String(upd.id));
                        if (index > -1) {
                            state.itinerary[index] = { ...state.itinerary[index], ...upd.fields };
                        }
                    });
                    state.itinerary.sort((a, b) => new Date(a.startDate + ' ' + (a.startTime || '00:00')) - new Date(b.startDate + ' ' + (b.startTime || '00:00')));
                } else if (targetArea === 'tasks') {
                    updates.forEach(upd => {
                        const index = state.preTripTasks.findIndex(t => String(t.id) === String(upd.id));
                        if (index > -1) {
                            state.preTripTasks[index] = { ...state.preTripTasks[index], ...upd.fields };
                        }
                    });
                } else if (targetArea === 'packing') {
                    updates.forEach(upd => {
                        const catIndex = state.packingList.findIndex(c => String(c.id) === String(upd.id));
                        if (catIndex > -1) {
                            const cat = state.packingList[catIndex];
                            if (upd.newItems) {
                                upd.newItems.forEach(ni => {
                                    if (!cat.items.find(i => i.text.toLowerCase() === ni.toLowerCase())) {
                                        cat.items.push({ id: `ai-pack-${Date.now()}-${Math.random()}`, text: ni, done: false });
                                    }
                                });
                            }
                            if (upd.removeItems) {
                                cat.items = cat.items.filter(i => !upd.removeItems.includes(String(i.id)) && !upd.removeItems.includes(i.text.toLowerCase()));
                            }
                        }
                    });
                }
            }

            // Handle Deletes
            if (deletes.length > 0) {
                if (targetArea === 'itinerary') {
                    const idsToDelete = deletes.map(String);
                    state.itinerary = state.itinerary.filter(i => !idsToDelete.includes(String(i.id)));
                } else if (targetArea === 'tasks') {
                    const idsToDelete = deletes.map(String);
                    state.preTripTasks = state.preTripTasks.filter(t => !idsToDelete.includes(String(t.id)));
                } else if (targetArea === 'packing') {
                    const idsToDelete = deletes.map(String);
                    // Filter categories by ID
                    state.packingList = state.packingList.filter(c => !idsToDelete.includes(String(c.id)));
                    // Also filter items inside all remaining categories by ID
                    state.packingList.forEach(category => {
                        category.items = category.items.filter(item => !idsToDelete.includes(String(item.id)));
                    });
                }
            }

            // Handle Phrasebook (Legacy/Direct)
            if (data.phrasebook) {
                state.phrasebook = data.phrasebook;
            }

            state.proposedChanges = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(generateTrip.pending, (state) => {
                state.loading = true;
            })
            .addCase(generateTrip.fulfilled, (state, action) => {
                state.loading = false;

                // Handle Lazy Distillation logic:
                // If newDistilledData returned, save it to state immediately
                if (action.payload.data && action.payload.data.newDistilledData) {
                    console.log("⚗️ New Distilled Data Received:", action.payload.data.newDistilledData);
                    // newDistilledData is an object map: { [attachmentId]: { extractedInfo: string } }
                    Object.entries(action.payload.data.newDistilledData).forEach(([docId, info]) => {
                        const id = String(docId);
                        if (id && info.extractedInfo && state.documents[id]) {
                            state.documents[id].summary = info.extractedInfo;
                        }
                    });
                    // Remove from proposedChanges so it doesn't clutter review
                    delete action.payload.data.newDistilledData;
                }

                state.proposedChanges = action.payload;
            })
            .addCase(generateTrip.rejected, (state, action) => {
                state.loading = false;
                // Check if it's a quota error object
                if (action.payload && action.payload.code === 429) {
                    state.quotaError = action.payload;
                } else {
                    const msg = action.payload?.message || action.payload || "Unknown error";
                    alert(`Failed to generate trip: ${msg}`);
                }
            })
            .addCase(fetchExchangeRates.fulfilled, (state, action) => {
                const refreshedRates = {};
                // Only update currencies that are already in our tracked list
                Object.keys(state.exchangeRates || {}).forEach(curr => {
                    if (action.payload[curr]) {
                        refreshedRates[curr] = action.payload[curr];
                    } else {
                        refreshedRates[curr] = state.exchangeRates[curr];
                    }
                });
            })
            .addCase(fetchPairRate.fulfilled, (state, action) => {
                const { currency, rate } = action.payload;
                state.exchangeRates = { ...(state.exchangeRates || {}), [currency]: rate };
            })
            .addCase(initializeTrip.fulfilled, (state, action) => {
                if (action.payload) {
                    const data = action.payload;
                    // Merge saved data with defaults to ensure new fields (like attachments) exist
                    const defaultSt = getDefaultState();

                    if (data.tripDetails) state.tripDetails = { ...defaultSt.tripDetails, ...data.tripDetails };
                    if (data.preTripTasks) state.preTripTasks = ensureAttachmentIds(data.preTripTasks);
                    if (data.itinerary) state.itinerary = ensureAttachmentIds(data.itinerary);
                    if (data.expenses) state.expenses = data.expenses;
                    if (data.packingList) state.packingList = data.packingList;
                    if (data.phrasebook) state.phrasebook = data.phrasebook;
                    if (data.language) state.language = data.language;
                    if (data.exchangeRates) state.exchangeRates = data.exchangeRates;
                    if (data.documents) state.documents = data.documents;
                    if (data.distilledContext) state.distilledContext = data.distilledContext;

                    // Migrate legacy data to centralized store
                    migrateToCentralStore(state);
                }
                state.isInitialized = true;
            })
            .addCase(initializeTrip.rejected, (state) => {
                state.isInitialized = true;
            });
    }
});

export const {
    setActiveTab, setShowSettings, setApiKey, setLoading,
    setCustomPrompt, updateTripDetails, setPreTripTasks,
    setItinerary, setExpenses, setPackingList, setPhrasebook,
    loadFullTrip, setLanguage, setExchangeRates, updateExchangeRate,
    applyProposedChanges, discardProposedChanges, toggleProposedChange,
    setSelectedModel, clearQuotaError, deleteGlobalAttachment,
    addDocuments, updateDocument, removeUnusedDocuments
} = tripSlice.actions;

export default tripSlice.reducer;

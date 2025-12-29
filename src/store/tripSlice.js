import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { generateTripContent, AVAILABLE_MODELS } from '../services/gemini';
import { get } from 'idb-keyval';

// Async thunk to generate trip content using Gemini
export const generateTrip = createAsyncThunk(
    'trip/generate',
    async ({ targetArea, customPrompt, aiMode = 'add' }, { getState, rejectWithValue }) => {
        const state = getState().trip;
        const { apiKey, tripDetails, itinerary, preTripTasks, packingList, language, selectedModel, distilledContext } = state;

        if (!apiKey && selectedModel !== 'local-nano') return rejectWithValue("API Key missing");

        try {
            const data = await generateTripContent(apiKey, tripDetails, customPrompt, itinerary, preTripTasks, packingList, language, targetArea, aiMode, selectedModel, distilledContext);
            return { data, targetArea, aiMode };
        } catch (error) {
            // Check for 429 (Quota Exceeded)
            if (error.status === 429 || error.message.includes('429') || error.message.includes('Quota')) {
                // Pass a specific error object structure that our reducer can recognize
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

// Helper: Garbage Collection for Distilled Data
// Removes extracted info for attachments that no longer exist in the trip
const cleanupDistilledContext = (state) => {
    const validIds = new Set();
    // Collect all active attachment IDs
    state.itinerary.forEach(i => (i.attachments || []).forEach(a => validIds.add(String(a.id))));
    state.preTripTasks.forEach(t => (t.attachments || []).forEach(a => validIds.add(String(a.id))));

    // Remove stale keys from distilledContext
    Object.keys(state.distilledContext).forEach(distilledId => {
        if (!validIds.has(String(distilledId))) {
            delete state.distilledContext[distilledId];
        }
    });
};


// Helper to get default state
const getDefaultState = () => ({
    activeTab: 'overview',
    language: 'en',
    showSettings: false,
    selectedModel: 'gemini-3-flash-preview', // Default model
    distilledContext: {}, // Cache for distilled attachment info
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
        updateDistilledContext: (state, action) => {
            state.distilledContext = { ...state.distilledContext, ...action.payload };
        },
        setPreTripTasks: (state, action) => {
            state.preTripTasks = action.payload;
            cleanupDistilledContext(state);
        },
        setItinerary: (state, action) => {
            state.itinerary = action.payload;
            cleanupDistilledContext(state);
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
            if (data.distilledContext) state.distilledContext = data.distilledContext;
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
                            timeZone: e.timeZone || ''
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
                            attachments: [],
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
                    state.distilledContext = { ...state.distilledContext, ...action.payload.data.newDistilledData };
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
    setSelectedModel, updateDistilledContext, clearQuotaError
} = tripSlice.actions;

export default tripSlice.reducer;

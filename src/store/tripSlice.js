import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { generateTripContent } from '../services/gemini';
import { get } from 'idb-keyval';

export const generateTrip = createAsyncThunk(
    'trip/generate',
    async ({ targetArea, customPrompt, aiMode = 'add' }, { getState, rejectWithValue }) => {
        const { apiKey, tripDetails, itinerary, preTripTasks, language } = getState().trip;
        if (!apiKey) return rejectWithValue("API Key missing");

        try {
            const data = await generateTripContent(apiKey, tripDetails, customPrompt, itinerary, preTripTasks, language, targetArea, aiMode);
            return { data, targetArea, aiMode };
        } catch (error) {
            return rejectWithValue(error.message);
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


// Helper to get default state
const getDefaultState = () => ({
    activeTab: 'overview',
    language: 'en',
    showSettings: false,
    apiKey: localStorage.getItem('wanderplan_api_key') || '', // API Key can stay in localStorage for now as it is small/global
    loading: false,
    isInitialized: false,
    customPrompt: '',
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
        updateTripDetails: (state, action) => {
            state.tripDetails = { ...state.tripDetails, ...action.payload };
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
            state.packingList = action.payload;
        },
        // ... (reducers content)
        loadFullTrip: (state, action) => {
            const data = action.payload;
            if (data.tripDetails) state.tripDetails = data.tripDetails;
            if (data.preTripTasks) state.preTripTasks = data.preTripTasks;
            if (data.itinerary) state.itinerary = data.itinerary;
            if (data.expenses) state.expenses = data.expenses;
            if (data.packingList) state.packingList = data.packingList;
            if (data.phrasebook) state.phrasebook = data.phrasebook;
            if (data.language) state.language = data.language;
            if (data.exchangeRates) state.exchangeRates = data.exchangeRates;
        },
        setExchangeRates: (state, action) => {
            state.exchangeRates = action.payload;
        },
        updateExchangeRate: (state, action) => {
            const { currency, rate } = action.payload;
            state.exchangeRates = { ...(state.exchangeRates || {}), [currency]: rate };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(generateTrip.pending, (state) => {
                state.loading = true;
            })
            .addCase(generateTrip.fulfilled, (state, action) => {
                state.loading = false;
                const { data, targetArea, aiMode } = action.payload;

                // Handle Trip Currency if returned
                if (data.tripCurrency) {
                    state.tripDetails.tripCurrency = data.tripCurrency;
                }

                // Merge Pre-Trip Tasks (if area is tasks or all)
                if (data.newPreTrip) {
                    if (aiMode === 'dedupe') {
                        // In dedupe mode, AI returns the CLEANED list. We replace the current tasks.
                        // We try to preserve 'done' status if possible by matching text.
                        const currentTasksMap = new Map(state.preTripTasks.map(t => [t.text.toLowerCase(), t]));

                        state.preTripTasks = data.newPreTrip.map(t => {
                            const existing = currentTasksMap.get(t.text.toLowerCase());
                            return {
                                id: existing ? existing.id : Date.now() + Math.random(),
                                text: t.text,
                                done: existing ? existing.done : false,
                                attachments: existing ? existing.attachments : [],
                                cost: t.cost || (existing ? existing.cost : 0),
                                currency: t.currency || (existing ? existing.currency : state.tripDetails.homeCurrency),
                                isPaid: existing ? existing.isPaid : false,
                                category: t.category || (existing ? existing.category : 'Documents'),
                                isEditing: false,
                                timeToComplete: t.timeToComplete || (existing ? existing.timeToComplete : ''),
                                dueDate: t.dueDate || (existing ? existing.dueDate : ''),
                                notes: t.notes || (existing ? existing.notes : '')
                            };
                        });
                    } else {
                        data.newPreTrip.forEach(t => {
                            const existingIndex = state.preTripTasks.findIndex(
                                et => et.text.toLowerCase() === t.text.toLowerCase()
                            );

                            if (existingIndex > -1) {
                                // Enrich existing task
                                const et = state.preTripTasks[existingIndex];
                                // Strict update only if mode is update or fill
                                if (aiMode === 'update' || aiMode === 'fill' || !aiMode) {
                                    state.preTripTasks[existingIndex] = {
                                        ...et,
                                        cost: t.cost || et.cost,
                                        currency: t.currency || et.currency,
                                        category: t.category || et.category,
                                        timeToComplete: t.timeToComplete || et.timeToComplete,
                                        dueDate: t.dueDate || et.dueDate,
                                        notes: t.notes || et.notes
                                    };
                                }
                            } else if (aiMode !== 'update') {
                                // Add new task
                                state.preTripTasks.push({
                                    id: Date.now() + Math.random(),
                                    text: t.text,
                                    done: false,
                                    attachments: [],
                                    cost: t.cost || 0,
                                    currency: t.currency || state.tripDetails.homeCurrency,
                                    isPaid: false,
                                    category: t.category || 'Documents',
                                    isEditing: false,
                                    timeToComplete: t.timeToComplete || '',
                                    dueDate: t.dueDate || '',
                                    notes: t.notes || ''
                                });
                            }
                        });
                    }
                }

                // Merge Packing List (if area is packing or all)
                if (data.newPacking) {
                    if (aiMode === 'dedupe') {
                        // In dedupe mode for packing, we rebuild the structure based on AI return
                        // trying to preserve 'done' status.
                        const currentItemsMap = new Map();
                        state.packingList.forEach(cat => {
                            cat.items.forEach(item => currentItemsMap.set(item.text.toLowerCase(), item.done));
                        });

                        state.packingList = data.newPacking.map(cat => ({
                            id: Date.now() + Math.random(),
                            category: cat.category,
                            items: cat.items.map(itemName => ({
                                id: Date.now() + Math.random(),
                                text: itemName,
                                done: currentItemsMap.get(itemName.toLowerCase()) || false
                            }))
                        }));
                    } else {
                        data.newPacking.forEach(newCat => {
                            const existingCat = state.packingList.find(c => c.category === newCat.category);
                            if (existingCat) {
                                const existingItems = new Set(existingCat.items.map(i => i.text.toLowerCase()));
                                // Only add new items if mode is NOT 'update'
                                if (aiMode !== 'update') {
                                    const itemsToAdd = newCat.items
                                        .filter(i => !existingItems.has(i.toLowerCase()))
                                        .map(i => ({ id: Date.now() + Math.random(), text: i, done: false }));
                                    existingCat.items.push(...itemsToAdd);
                                }
                            } else if (aiMode !== 'update') {
                                state.packingList.push({
                                    id: Date.now() + Math.random(),
                                    category: newCat.category,
                                    items: newCat.items.map(i => ({ id: Date.now() + Math.random(), text: i, done: false }))
                                });
                            }
                        });
                    }
                }

                // Merge Itinerary (if area is itinerary or all)
                if (data.newItinerary) {
                    data.newItinerary.forEach(e => {
                        // Look for existing event to enrich
                        const existingEventIndex = state.itinerary.findIndex(
                            ei => ei.title.toLowerCase() === e.title.toLowerCase() && ei.startDate === e.startDate
                        );

                        if (existingEventIndex > -1 && (aiMode === 'update' || aiMode === 'fill')) {
                            const ei = state.itinerary[existingEventIndex];
                            state.itinerary[existingEventIndex] = {
                                ...ei,
                                cost: ei.cost || e.estimatedCost || e.cost || 0,
                                currency: ei.currency || e.currency || state.tripDetails.tripCurrency,
                                notes: ei.notes || e.notes || '',
                                category: ei.category || e.category || 'Activities',
                                endTime: ei.endTime || e.endTime || '',
                                location: ei.location || e.location || '',
                                endLocation: ei.endLocation || e.endLocation || ''
                            };
                        } else if (aiMode !== 'update') {
                            // Only add new if not strictly updating
                            state.itinerary.push({
                                ...e,
                                id: Date.now() + Math.random(),
                                image: null,
                                cost: e.estimatedCost || e.cost || 0,
                                currency: e.currency || state.tripDetails.tripCurrency,
                                isPaid: false,
                                isEditing: false,
                                category: e.category || 'Activities'
                            });
                        }
                    });
                    state.itinerary.sort((a, b) => new Date(a.startDate + ' ' + (a.startTime || '00:00')) - new Date(b.startDate + ' ' + (b.startTime || '00:00')));
                }

                // Phrasebook (if area is phrasebook or all)
                if (data.phrasebook) {
                    state.phrasebook = data.phrasebook;
                }
            })
            .addCase(generateTrip.rejected, (state, action) => {
                state.loading = false;
                alert(`Failed to generate trip: ${action.payload}`);
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
                    if (data.preTripTasks) state.preTripTasks = data.preTripTasks;
                    if (data.itinerary) state.itinerary = data.itinerary;
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
    loadFullTrip, setLanguage, setExchangeRates, updateExchangeRate
} = tripSlice.actions;

export default tripSlice.reducer;

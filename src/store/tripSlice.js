import { createSlice } from '@reduxjs/toolkit';
import {
    generateTrip,
    finalizeTripData,
    initializeTrip,
    fetchExchangeRates,
    fetchPairRate,
    implementProposedChanges,
    loadFullTrip,
    deleteGlobalAttachment
} from './thunks';

// Actions re-export for compatibility
export {
    generateTrip,
    finalizeTripData,
    initializeTrip,
    fetchExchangeRates,
    fetchPairRate,
    implementProposedChanges,
    loadFullTrip,
    deleteGlobalAttachment
};

const initialState = {
    tripDetails: {
        destination: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        budget: '2000',
        homeCurrency: 'USD',
        tripCurrency: 'USD',
        exchangeRate: 1,
        coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
        lastUsedCurrency: 'USD',
        travelers: 1
    },
    expenses: [],
    exchangeRates: {},
    apiKey: localStorage.getItem('wanderplan_api_key') || '',
    selectedModel: 'gemini-3-flash-preview',
    customPrompt: '',
    proposedChanges: null
};

export const tripSlice = createSlice({
    name: 'trip',
    initialState,
    reducers: {
        updateTripDetails: (state, action) => {
            state.tripDetails = { ...state.tripDetails, ...action.payload };
        },
        setExpenses: (state, action) => {
            state.expenses = action.payload;
        },
        setApiKey: (state, action) => {
            state.apiKey = action.payload;
            localStorage.setItem('wanderplan_api_key', action.payload);
        },
        setSelectedModel: (state, action) => {
            state.selectedModel = action.payload;
        },
        setCustomPrompt: (state, action) => {
            state.customPrompt = action.payload;
        },
        updateExchangeRate: (state, action) => {
            const { currency, rate } = action.payload;
            state.exchangeRates = { ...(state.exchangeRates || {}), [currency]: rate };
        },
        setExchangeRates: (state, action) => {
            state.exchangeRates = action.payload;
        },
        discardProposedChanges: (state) => {
            state.proposedChanges = null;
        },
        toggleProposedChange: (state, action) => {
            const { type, id } = action.payload;
            if (!state.proposedChanges || !state.proposedChanges.data) return;

            if (type === 'deletes') {
                const deletes = state.proposedChanges.data.deletes;
                if (Array.isArray(deletes) && typeof deletes[0] === 'string') {
                    state.proposedChanges.data.deletes = deletes.map(dId => ({ id: dId, ignored: false }));
                }
                const index = state.proposedChanges.data.deletes.findIndex(d => d.id === id);
                if (index > -1) state.proposedChanges.data.deletes[index].ignored = !state.proposedChanges.data.deletes[index].ignored;
            } else {
                const list = state.proposedChanges.data[type];
                if (list) {
                    const index = list.findIndex(item => item.id === id);
                    if (index > -1) list[index].ignored = !list[index].ignored;
                }
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(initializeTrip.fulfilled, (state, action) => {
                if (action.payload) {
                    const { trip } = action.payload;
                    state.tripDetails = { ...state.tripDetails, ...trip.tripDetails };
                    state.expenses = trip.expenses || [];
                    state.exchangeRates = trip.exchangeRates || {};
                    state.apiKey = trip.apiKey || state.apiKey;
                }
            })
            .addCase(generateTrip.fulfilled, (state, action) => {
                state.proposedChanges = action.payload;
            })
            .addCase(finalizeTripData.fulfilled, (state, action) => {
                if (state.proposedChanges && state.proposedChanges.data) {
                    const newData = action.payload.data;
                    if (newData.adds) {
                        newData.adds.forEach(newItem => {
                            const existing = state.proposedChanges.data.adds.find(e => e.id === newItem.id);
                            if (existing) existing.location = newItem.location;
                        });
                    }
                    if (newData.updates) {
                        newData.updates.forEach(newItem => {
                            const existing = state.proposedChanges.data.updates.find(e => e.id === newItem.id);
                            if (existing && existing.fields) existing.fields.location = newItem.fields.location;
                        });
                    }
                }
            })
            .addCase(implementProposedChanges.fulfilled, (state) => {
                state.proposedChanges = null;
            })
            .addCase(fetchExchangeRates.fulfilled, (state, action) => {
                const refreshed = {};
                Object.keys(state.exchangeRates).forEach(k => {
                    refreshed[k] = action.payload[k] || state.exchangeRates[k];
                });
                state.exchangeRates = refreshed;
            })
            .addCase(fetchPairRate.fulfilled, (state, action) => {
                state.exchangeRates = { ...state.exchangeRates, [action.payload.currency]: action.payload.rate };
            });
    }
});

export const {
    updateTripDetails, setExpenses, setApiKey, setSelectedModel,
    setCustomPrompt, updateExchangeRate, setExchangeRates,
    discardProposedChanges, toggleProposedChange
} = tripSlice.actions;

export default tripSlice.reducer;

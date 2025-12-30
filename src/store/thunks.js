import { createAsyncThunk } from '@reduxjs/toolkit';
import { generateTripContent, enhanceWithGeocoding } from '../services/gemini';
import { get } from 'idb-keyval';
import { migrateLegacyState } from './migration';
import { applyItineraryChanges, setItinerary } from './itinerarySlice';
import { applyPackingChanges, setPackingList } from './packingSlice';
import { applyTaskChanges, deleteDocument, removeAttachmentReference as removeTaskRef, setTasks, setDocuments, setDistilledContext, setPhrasebook } from './resourceSlice';
import { updateTripDetails, setExpenses, setApiKey, setExchangeRates, setSelectedModel, setCustomPrompt } from './tripSlice';
import { setLanguage } from './uiSlice';

export const finalizeTripData = createAsyncThunk(
    'trip/finalize',
    async ({ data, tripDetails, itinerary }, { dispatch }) => {
        await enhanceWithGeocoding(data, tripDetails, itinerary);
        return { data };
    }
);

export const generateTrip = createAsyncThunk(
    'trip/generate',
    async ({ targetArea, customPrompt, aiMode = 'add', promptAttachments = [] }, { getState, dispatch, rejectWithValue }) => {
        const state = getState();
        const { trip, itinerary, resources, packing, ui } = state;
        const { apiKey, tripDetails, selectedModel } = trip;
        const { language } = ui;

        if (!apiKey && selectedModel !== 'local-nano') return rejectWithValue("API Key missing");

        try {
            const data = await generateTripContent(
                apiKey,
                tripDetails,
                customPrompt,
                itinerary.items,
                resources.tasks,
                packing.list,
                language,
                targetArea,
                aiMode,
                selectedModel,
                resources.documents,
                promptAttachments
            );

            dispatch(finalizeTripData({ data, tripDetails, itinerary: itinerary.items }));

            return { data, targetArea, aiMode };
        } catch (error) {
            if (error.status === 429 || error.message?.includes('429')) {
                return rejectWithValue({ code: 429, message: "Quota Exceeded" });
            }
            return rejectWithValue({ message: error.message });
        }
    }
);

export const initializeTrip = createAsyncThunk(
    'trip/initialize',
    async (_, { rejectWithValue }) => {
        try {
            const saved = await get('wanderplan_current_trip');
            if (saved) {
                return migrateLegacyState(saved);
            }
            return null;
        } catch (error) {
            console.error("Failed to load/migrate", error);
            return rejectWithValue(error.message);
        }
    }
);

export const fetchExchangeRates = createAsyncThunk(
    'trip/fetchExchangeRates',
    async (baseCurrency, { rejectWithValue }) => {
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            const data = await response.json();
            return data.result === 'success' ? data.rates : rejectWithValue('Failed');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPairRate = createAsyncThunk(
    'trip/fetchPairRate',
    async ({ base, target }, { rejectWithValue }) => {
        try {
            const response = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${target}`);
            const data = await response.json();
            if (data.rates && data.rates[target]) return { currency: target, rate: data.rates[target] };

            const response2 = await fetch(`https://open.er-api.com/v6/latest/${base}`);
            const data2 = await response2.json();
            if (data2.result === 'success' && data2.rates[target]) return { currency: target, rate: data2.rates[target] };

            return rejectWithValue('Failed to fetch rate');
        } catch (e) { return rejectWithValue(e.message); }
    }
);

export const implementProposedChanges = createAsyncThunk(
    'trip/implement',
    async (_, { getState, dispatch }) => {
        const { proposedChanges } = getState().trip;
        if (!proposedChanges || !proposedChanges.data) return;

        const { data } = proposedChanges;

        dispatch(applyItineraryChanges(data));
        dispatch(applyTaskChanges(data));
        dispatch(applyPackingChanges(data));

        return;
    }
);

export const deleteGlobalAttachment = createAsyncThunk(
    'resources/deleteGlobal',
    async (docId, { dispatch }) => {
        dispatch(deleteDocument(docId));
        dispatch(removeItineraryRef(docId));
        dispatch(removePackingRef(docId));
        dispatch(removeTaskRef(docId));
    }
);

export const loadFullTrip = (inputData) => (dispatch) => {
    if (!inputData) return;

    // Normalize data (migration)
    const tripData = migrateLegacyState(inputData);
    if (!tripData) return;

    // Trip Slice
    const { trip } = tripData;
    if (trip.tripDetails) dispatch(updateTripDetails(trip.tripDetails));
    if (trip.expenses) dispatch(setExpenses(trip.expenses));
    if (trip.exchangeRates) dispatch(setExchangeRates(trip.exchangeRates));
    if (trip.apiKey) dispatch(setApiKey(trip.apiKey));
    if (trip.selectedModel) dispatch(setSelectedModel(trip.selectedModel));
    if (trip.customPrompt) dispatch(setCustomPrompt(trip.customPrompt));

    // Itinerary Slice
    if (tripData.itinerary?.items) dispatch(setItinerary(tripData.itinerary.items));

    // Packing Slice
    if (tripData.packing?.list) dispatch(setPackingList(tripData.packing.list));

    // Resource Slice
    const { resources } = tripData;
    if (resources.tasks) dispatch(setTasks(resources.tasks));
    if (resources.documents) dispatch(setDocuments(resources.documents));
    if (resources.distilledContext) dispatch(setDistilledContext(resources.distilledContext));
    if (resources.phrasebook) dispatch(setPhrasebook(resources.phrasebook));

    // UI Slice
    if (tripData.ui?.language) dispatch(setLanguage(tripData.ui.language));
};

export const removeUnusedDocuments = () => (dispatch, getState) => {
    const state = getState();
    const { items: itinerary } = state.itinerary;
    const { list: packingList } = state.packing;
    const { tasks: preTripTasks, documents } = state.resources;

    const usedIds = new Set();
    itinerary.forEach(i => (i.attachmentIds || []).forEach(id => usedIds.add(id)));
    preTripTasks.forEach(t => (t.attachmentIds || []).forEach(id => usedIds.add(id)));
    packingList.forEach(c => (c.items || []).forEach(i => (i.attachmentIds || []).forEach(id => usedIds.add(id))));

    const newDocs = {};
    Object.entries(documents).forEach(([id, doc]) => {
        if (usedIds.has(id)) {
            newDocs[id] = doc;
        }
    });

    dispatch(setDocuments(newDocs));
};

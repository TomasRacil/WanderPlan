import { createSlice } from '@reduxjs/toolkit';
import { generateId } from '../utils/idGenerator';
import { initializeTrip } from './thunks';

const initialState = {
    items: []
};

export const itinerarySlice = createSlice({
    name: 'itinerary',
    initialState,
    reducers: {
        setItinerary: (state, action) => {
            state.items = action.payload;
        },
        addItineraryItem: (state, action) => {
            const item = {
                ...action.payload,
                id: action.payload.id || generateId('event'),
                attachmentIds: action.payload.attachmentIds || []
            };
            state.items.push(item);
            state.items.sort((a, b) => new Date(a.startDate + ' ' + (a.startTime || '00:00')) - new Date(b.startDate + ' ' + (b.startTime || '00:00')));
        },
        updateItineraryItem: (state, action) => {
            const { id, updates } = action.payload;
            const index = state.items.findIndex(i => String(i.id) === String(id));
            if (index > -1) {
                state.items[index] = { ...state.items[index], ...updates };
                state.items.sort((a, b) => new Date(a.startDate + ' ' + (a.startTime || '00:00')) - new Date(b.startDate + ' ' + (b.startTime || '00:00')));
            }
        },
        deleteItineraryItem: (state, action) => {
            const id = String(action.payload);
            state.items = state.items.filter(i => String(i.id) !== id);
        },
        // Remove attachment reference
        removeAttachmentReference: (state, action) => {
            const docId = String(action.payload);
            state.items.forEach(item => {
                if (item.attachmentIds) {
                    item.attachmentIds = item.attachmentIds.filter(id => String(id) !== docId);
                }
            });
        },
        applyItineraryChanges: (state, action) => {
            const { adds = [], updates = [], deletes = [] } = action.payload;

            adds.forEach(e => {
                state.items.push({
                    ...e,
                    id: e.id || generateId('ai-event'),
                    cost: e.cost || 0,
                    isPaid: false,
                    isEditing: false,
                    attachmentIds: e.attachmentIds || []
                });
            });

            updates.forEach(upd => {
                const index = state.items.findIndex(i => String(i.id) === String(upd.id));
                if (index > -1) {
                    state.items[index] = { ...state.items[index], ...upd.fields };
                }
            });

            const idsToDelete = deletes.map(String);
            state.items = state.items.filter(i => !idsToDelete.includes(String(i.id)));

            state.items.sort((a, b) => new Date(a.startDate + ' ' + (a.startTime || '00:00')) - new Date(b.startDate + ' ' + (b.startTime || '00:00')));
        }
    },
    extraReducers: (builder) => {
        builder.addCase(initializeTrip.fulfilled, (state, action) => {
            if (action.payload && action.payload.itinerary) {
                state.items = action.payload.itinerary.items;
            }
        });
    }
});

export const {
    setItinerary,
    addItineraryItem,
    updateItineraryItem,
    deleteItineraryItem,
    removeAttachmentReference,
    applyItineraryChanges
} = itinerarySlice.actions;

export default itinerarySlice.reducer;

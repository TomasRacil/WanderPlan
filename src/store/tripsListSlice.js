import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storage } from '../services/storage';

export const loadTripsList = createAsyncThunk(
    'tripsList/load',
    async () => {
        return await storage.getTripsList();
    }
);

export const deleteTrip = createAsyncThunk(
    'tripsList/delete',
    async (id, { dispatch }) => {
        await storage.deleteTrip(id);
        return id;
    }
);

const tripsListSlice = createSlice({
    name: 'tripsList',
    initialState: {
        trips: [],
        loading: false,
        error: null
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(loadTripsList.pending, (state) => {
                state.loading = true;
            })
            .addCase(loadTripsList.fulfilled, (state, action) => {
                state.loading = false;
                state.trips = action.payload;
            })
            .addCase(loadTripsList.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(deleteTrip.fulfilled, (state, action) => {
                state.trips = state.trips.filter(t => t.id !== action.payload);
            });
    }
});

export default tripsListSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';
import { generateTrip, initializeTrip } from './thunks';

const initialState = {
    activeTab: 'overview',
    language: 'en',
    showSettings: false,
    loading: false,
    quotaError: null,
    isInitialized: false
};

export const uiSlice = createSlice({
    name: 'ui',
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
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setQuotaError: (state, action) => {
            state.quotaError = action.payload;
        },
        clearQuotaError: (state) => {
            state.quotaError = null;
        },
        setInitialized: (state, action) => {
            state.isInitialized = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(initializeTrip.pending, (state) => {
                // state.loading = true; // Maybe not block UI on init?
            })
            .addCase(initializeTrip.fulfilled, (state, action) => {
                state.isInitialized = true;
                if (action.payload) {
                    const { ui } = action.payload;
                    state.activeTab = ui.activeTab || state.activeTab;
                    state.language = ui.language || state.language;
                    state.showSettings = ui.showSettings || state.showSettings;
                }
            })
            .addCase(initializeTrip.rejected, (state) => {
                state.isInitialized = true;
            })
            .addCase(generateTrip.pending, (state) => {
                state.loading = true;
                state.quotaError = null;
            })
            .addCase(generateTrip.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(generateTrip.rejected, (state, action) => {
                state.loading = false;
                if (action.payload && action.payload.code === 429) {
                    state.quotaError = action.payload;
                }
            });
    }
});

export const {
    setActiveTab,
    setLanguage,
    setShowSettings,
    setLoading,
    setQuotaError,
    clearQuotaError,
    setInitialized
} = uiSlice.actions;

export default uiSlice.reducer;

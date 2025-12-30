import { configureStore } from '@reduxjs/toolkit';
import tripReducer from './tripSlice';
import itineraryReducer from './itinerarySlice';
import packingReducer from './packingSlice';
import resourceReducer from './resourceSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    trip: tripReducer,
    itinerary: itineraryReducer,
    packing: packingReducer,
    resources: resourceReducer,
    ui: uiReducer
  },
});
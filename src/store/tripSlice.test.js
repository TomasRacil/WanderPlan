import { describe, it, expect, beforeEach } from 'vitest';
import tripReducer, {
    updateTripDetails,
    setItinerary,
    setPreTripTasks,
    setLanguage,
    setActiveTab
} from './tripSlice';

describe('tripSlice reducer', () => {
    let initialState;

    beforeEach(() => {
        initialState = {
            activeTab: 'overview',
            language: 'en',
            tripDetails: {
                destination: '',
                lastUsedCurrency: 'USD'
            },
            itinerary: [],
            preTripTasks: []
        };
    });

    it('should handle updateTripDetails', () => {
        const payload = { destination: 'Paris', lastUsedCurrency: 'EUR' };
        const state = tripReducer(initialState, updateTripDetails(payload));
        expect(state.tripDetails.destination).toBe('Paris');
        expect(state.tripDetails.lastUsedCurrency).toBe('EUR');
    });

    it('should handle setItinerary', () => {
        const events = [{ id: 1, title: 'Visit Eiffel Tower' }];
        const state = tripReducer(initialState, setItinerary(events));
        expect(state.itinerary).toEqual(events);
    });

    it('should handle setPreTripTasks', () => {
        const tasks = [{ id: 1, text: 'Get Passport' }];
        const state = tripReducer(initialState, setPreTripTasks(tasks));
        expect(state.preTripTasks).toEqual(tasks);
    });

    it('should handle setLanguage', () => {
        const state = tripReducer(initialState, setLanguage('cs'));
        expect(state.language).toBe('cs');
    });

    it('should handle setActiveTab', () => {
        const state = tripReducer(initialState, setActiveTab('budget'));
        expect(state.activeTab).toBe('budget');
    });
});

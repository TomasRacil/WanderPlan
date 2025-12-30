import { describe, it, expect, beforeEach } from 'vitest';
import tripReducer, {
    updateTripDetails,
    setApiKey,
    toggleProposedChange
} from './tripSlice';

describe('tripSlice reducer', () => {
    let initialState;

    beforeEach(() => {
        initialState = {
            tripDetails: {
                destination: '',
                lastUsedCurrency: 'USD'
            },
            expenses: [],
            exchangeRates: {},
            apiKey: '',
            selectedModel: 'gemini-3-flash-preview',
            customPrompt: '',
            proposedChanges: null
        };
    });

    it('should handle updateTripDetails', () => {
        const payload = { destination: 'Paris', lastUsedCurrency: 'EUR' };
        const state = tripReducer(initialState, updateTripDetails(payload));
        expect(state.tripDetails.destination).toBe('Paris');
        expect(state.tripDetails.lastUsedCurrency).toBe('EUR');
    });

    it('should handle setApiKey', () => {
        const state = tripReducer(initialState, setApiKey('test-key'));
        expect(state.apiKey).toBe('test-key');
    });

    // Add more tests for trip-specific reducers if needed
});

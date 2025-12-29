import { describe, it, expect, beforeEach } from 'vitest';
import tripReducer, {
    updateTripDetails,
    setItinerary,
    setPreTripTasks,
    setLanguage,
    setActiveTab,
    deleteGlobalAttachment
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
            preTripTasks: [],
            documents: {},
            distilledContext: {}
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

    it('should handle deleteGlobalAttachment', () => {
        const stateWithAttachments = {
            ...initialState,
            documents: {
                'att1': { id: 'att1', name: 'File 1' },
                'att2': { id: 'att2', name: 'File 2' }
            },
            itinerary: [{ id: 1, attachments: [{ id: 'att1' }, { id: 'att2' }], attachmentIds: ['att1', 'att2'] }],
            preTripTasks: [{ id: 2, attachments: [{ id: 'att1' }], attachmentIds: ['att1'] }],
            packingList: [{ category: 'Clothes', items: [{ id: 3, attachments: [{ id: 'att1' }], attachmentIds: ['att1'] }] }],
            distilledContext: { 'att1': { extractedInfo: 'Test' } }
        };
        const state = tripReducer(stateWithAttachments, deleteGlobalAttachment('att1'));

        // Check documents store
        expect(state.documents['att1']).toBeUndefined();
        expect(state.documents['att2']).toBeDefined();

        // Check references
        expect(state.itinerary[0].attachmentIds).toHaveLength(1);
        expect(state.itinerary[0].attachmentIds[0]).toBe('att2');
        expect(state.preTripTasks[0].attachmentIds).toHaveLength(0);
        expect(state.packingList[0].items[0].attachmentIds).toHaveLength(0);

        // Verification of legacy support (if still in reducer)
        expect(state.itinerary[0].attachments).toHaveLength(1);
        expect(state.itinerary[0].attachments[0].id).toBe('att2');
    });
});

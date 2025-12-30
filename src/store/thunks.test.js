import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFullTrip } from './thunks';
import { updateTripDetails, setExpenses, setApiKey, setExchangeRates, setSelectedModel, setCustomPrompt } from './tripSlice';
import { setItinerary } from './itinerarySlice';
import { setPackingList } from './packingSlice';
import { setTasks, setDocuments, setDistilledContext, setPhrasebook } from './resourceSlice';
import { setLanguage } from './uiSlice';

vi.mock('./tripSlice', () => ({
    updateTripDetails: vi.fn(),
    setExpenses: vi.fn(),
    setApiKey: vi.fn(),
    setExchangeRates: vi.fn(),
    setSelectedModel: vi.fn(),
    setCustomPrompt: vi.fn(),
    initializeTrip: { fulfilled: { type: 'trip/initialize/fulfilled' } }
}));

vi.mock('./itinerarySlice', () => ({
    setItinerary: vi.fn()
}));

vi.mock('./packingSlice', () => ({
    setPackingList: vi.fn(),
    setBags: vi.fn()
}));

vi.mock('./resourceSlice', () => ({
    setTasks: vi.fn(),
    setDocuments: vi.fn(),
    setDistilledContext: vi.fn(),
    setPhrasebook: vi.fn(),
    initializeTrip: { fulfilled: { type: 'trip/initialize/fulfilled' } }
}));

vi.mock('./uiSlice', () => ({
    setLanguage: vi.fn()
}));

describe('thunks.js', () => {
    describe('loadFullTrip', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should dispatch actions for legacy flat trip data', () => {
            const dispatch = vi.fn();
            const legacyData = {
                tripDetails: { destination: 'Paris' },
                itinerary: [{ id: '1', location: 'Eiffel Tower' }],
                packingList: [{ category: 'Clothes', items: [] }],
                preTripTasks: [{ text: 'Books flight' }],
                phrasebook: [{ id: 'ph1', phrase: 'Hello' }],
                language: 'fr'
            };

            loadFullTrip(legacyData)(dispatch);

            expect(updateTripDetails).toHaveBeenCalledWith(expect.objectContaining(legacyData.tripDetails));
            expect(setItinerary).toHaveBeenCalled();
            expect(setPackingList).toHaveBeenCalled();
            expect(setTasks).toHaveBeenCalled();
            expect(setPhrasebook).toHaveBeenCalledWith(legacyData.phrasebook);
            expect(setLanguage).toHaveBeenCalledWith('fr');
        });

        it('should dispatch actions for already migrated data', () => {
            const dispatch = vi.fn();
            const migratedData = {
                trip: { tripDetails: { destination: 'Tokyo' } },
                itinerary: { items: [{ id: '1' }] },
                packing: { list: [] },
                resources: {
                    tasks: [],
                    documents: {},
                    phrasebook: [{ id: 'ph1' }]
                },
                ui: { language: 'ja' }
            };

            loadFullTrip(migratedData)(dispatch);

            expect(updateTripDetails).toHaveBeenCalledWith(expect.objectContaining(migratedData.trip.tripDetails));
            expect(setPhrasebook).toHaveBeenCalledWith(migratedData.resources.phrasebook);
            expect(setLanguage).toHaveBeenCalledWith('ja');
        });
    });
});

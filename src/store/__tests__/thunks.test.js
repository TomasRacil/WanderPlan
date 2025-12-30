import { describe, it, expect, vi, beforeEach } from 'vitest';
import { implementProposedChanges } from '../thunks';
import * as itinerarySlice from '../itinerarySlice';
import * as resourceSlice from '../resourceSlice';
import * as packingSlice from '../packingSlice';

// Mock the action creators
vi.mock('../itinerarySlice', () => ({
    applyItineraryChanges: vi.fn(() => ({ type: 'itinerary/applyChanges' })),
}));

vi.mock('../resourceSlice', () => ({
    applyTaskChanges: vi.fn(() => ({ type: 'resources/applyTaskChanges' })),
}));

vi.mock('../packingSlice', () => ({
    applyPackingChanges: vi.fn(() => ({ type: 'packing/applyChanges' })),
}));

describe('implementProposedChanges', () => {
    let dispatch;
    let getState;

    beforeEach(() => {
        dispatch = vi.fn();
        vi.clearAllMocks();
    });

    it('should dispatch ONLY applyTaskChanges when targetArea is "tasks"', async () => {
        getState = () => ({
            trip: {
                proposedChanges: {
                    data: { some: 'data' },
                    targetArea: 'tasks'
                }
            }
        });

        const thunk = implementProposedChanges();
        await thunk(dispatch, getState, undefined);

        expect(resourceSlice.applyTaskChanges).toHaveBeenCalled();
        expect(itinerarySlice.applyItineraryChanges).not.toHaveBeenCalled();
        expect(packingSlice.applyPackingChanges).not.toHaveBeenCalled();
    });

    it('should dispatch ONLY applyItineraryChanges when targetArea is "itinerary"', async () => {
        getState = () => ({
            trip: {
                proposedChanges: {
                    data: { some: 'data' },
                    targetArea: 'itinerary'
                }
            }
        });

        const thunk = implementProposedChanges();
        await thunk(dispatch, getState, undefined);

        expect(itinerarySlice.applyItineraryChanges).toHaveBeenCalled();
        expect(resourceSlice.applyTaskChanges).not.toHaveBeenCalled();
        expect(packingSlice.applyPackingChanges).not.toHaveBeenCalled();
    });

    it('should dispatch ONLY applyPackingChanges when targetArea is "packing"', async () => {
        getState = () => ({
            trip: {
                proposedChanges: {
                    data: { some: 'data' },
                    targetArea: 'packing'
                }
            }
        });

        const thunk = implementProposedChanges();
        await thunk(dispatch, getState, undefined);

        expect(packingSlice.applyPackingChanges).toHaveBeenCalled();
        expect(itinerarySlice.applyItineraryChanges).not.toHaveBeenCalled();
        expect(resourceSlice.applyTaskChanges).not.toHaveBeenCalled();
    });

    it('should dispatch ALL actions when targetArea is "all"', async () => {
        getState = () => ({
            trip: {
                proposedChanges: {
                    data: { some: 'data' },
                    targetArea: 'all'
                }
            }
        });

        const thunk = implementProposedChanges();
        await thunk(dispatch, getState, undefined);

        expect(itinerarySlice.applyItineraryChanges).toHaveBeenCalled();
        expect(resourceSlice.applyTaskChanges).toHaveBeenCalled();
        expect(packingSlice.applyPackingChanges).toHaveBeenCalled();
    });

    it('should do nothing if no proposedChanges exist', async () => {
        getState = () => ({
            trip: {
                proposedChanges: null
            }
        });

        const thunk = implementProposedChanges();
        await thunk(dispatch, getState, undefined);

        expect(itinerarySlice.applyItineraryChanges).not.toHaveBeenCalled();
        expect(resourceSlice.applyTaskChanges).not.toHaveBeenCalled();
        expect(packingSlice.applyPackingChanges).not.toHaveBeenCalled();
    });
});

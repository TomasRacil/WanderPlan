import { describe, it, expect } from 'vitest';
import { migrateLegacyState } from './migration';

describe('migrateLegacyState', () => {
    it('should migrate a fully legacy state correctly', () => {
        const legacyState = {
            tripDetails: { destination: 'Paris', startDate: '2024-01-01' },
            activeTab: 'budget',
            language: 'fr',
            expenses: [{ id: 1, cost: 100 }],
            itinerary: [{ id: 1, title: 'Visit Eiffel Tower' }],
            packingList: [{ category: 'Clothes', items: [] }],
            preTripTasks: [{ id: 1, text: 'Buy tickets', attachmentIds: ['doc1'] }],
            documents: {
                'doc1': { id: 'doc1', name: 'Ticket.pdf' }
            },
            distilledContext: { 'doc1': { extractedInfo: 'Context' } },
            phrasebook: [{ id: 'ph1', phrase: 'Hello', translation: 'Bonjour' }]
        };

        const migrated = migrateLegacyState(legacyState);

        // Check structure
        expect(migrated).toHaveProperty('trip');
        expect(migrated).toHaveProperty('itinerary');
        expect(migrated).toHaveProperty('packing');
        expect(migrated).toHaveProperty('resources');
        expect(migrated).toHaveProperty('ui');

        // Check Data Integrity
        expect(migrated.trip.tripDetails.destination).toBe('Paris');
        expect(migrated.ui.activeTab).toBe('budget');
        expect(migrated.ui.language).toBe('fr');
        expect(migrated.trip.expenses[0].cost).toBe(100);

        // Check Itinerary (array wrapped in items object if that's the new state)
        // Wait, migration.js puts itinerary into { items: ... }
        expect(migrated.itinerary.items).toHaveLength(1);
        expect(migrated.itinerary.items[0].title).toBe('Visit Eiffel Tower');

        // Check Resources
        expect(migrated.resources.documents['doc1']).toBeDefined();
        expect(migrated.resources.tasks).toHaveLength(1);
        expect(migrated.resources.tasks[0].attachmentIds).toContain('doc1');
        expect(migrated.resources.phrasebook).toHaveLength(1);
        expect(migrated.resources.phrasebook[0].phrase).toBe('Hello');
    });

    it('should return null for null input', () => {
        expect(migrateLegacyState(null)).toBeNull();
    });

    it('should handle partial legacy state (missing optional fields)', () => {
        const partial = {
            tripDetails: { destination: 'London' }
        };
        const migrated = migrateLegacyState(partial);

        expect(migrated.trip.tripDetails.destination).toBe('London');
        expect(migrated.resources.documents).toEqual({});
        expect(migrated.itinerary.items).toEqual([]);
    });

    it('should preserve an ALREADY migrated state', () => {
        // This simulates a state that has already been saved in the new structure
        const alreadyMigrated = {
            trip: {
                tripDetails: { destination: 'Tokyo' },
                expenses: []
            },
            itinerary: {
                items: [{ id: 'evt1', title: 'Sushi' }]
            },
            resources: {
                documents: { 'doc1': { id: 'doc1' } },
                tasks: []
            },
            packing: { list: [] },
            ui: { language: 'jp' }
        };

        const result = migrateLegacyState(alreadyMigrated);

        // This test expects the function to be idempotent or smart enough to detect valid structure
        expect(result.trip.tripDetails.destination).toBe('Tokyo');
        expect(result.itinerary.items).toHaveLength(1);
        expect(result.resources.documents['doc1']).toBeDefined();
    });
});

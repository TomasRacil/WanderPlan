
import { describe, it, expect } from 'vitest';
import packingReducer, { applyPackingChanges, addBag } from '../packingSlice';

describe('packingSlice', () => {
    const initialState = {
        list: [
            {
                id: 'cat1',
                category: 'Existing Cat',
                items: [
                    { id: 'item1', text: 'Existing Item', done: false },
                    { id: 'item2', text: { item: 'Corrupt Item', quantity: 1 }, done: false } // Simulating legacy corrupt item
                ]
            }
        ],
        bags: [
            { id: 'bag1', name: 'My Suitcase', type: 'Checked' },
            { id: 'bag2', name: 'Backpack', type: 'Carry-on' }
        ]
    };

    it('should add new items from AI with structure', () => {
        const aiResponse = {
            adds: [
                {
                    category: 'Existing Cat',
                    items: [
                        { item: 'New Item', quantity: 2, bagId: 'bag1' }
                    ]
                }
            ]
        };

        const newState = packingReducer(initialState, applyPackingChanges(aiResponse));
        const cat = newState.list.find(c => c.id === 'cat1');
        const newItem = cat.items.find(i => i.text === 'New Item');

        expect(newItem).toBeDefined();
        expect(newItem.quantity).toBe(2);
        expect(newItem.bagId).toBe('bag1');
    });

    it('should not add duplicates (safe check with corrupt data)', () => {
        const aiResponse = {
            adds: [
                {
                    category: 'Existing Cat',
                    items: [
                        { item: 'Existing Item', quantity: 1 },
                        { item: 'Corrupt Item', quantity: 1 } // Should match despite object in state
                    ]
                }
            ]
        };

        const newState = packingReducer(initialState, applyPackingChanges(aiResponse));
        const cat = newState.list[0];

        // Length should remain 2 (start) + 0 (added) = 2
        // If duplicate check works, it shouldn't add them again
        expect(cat.items.length).toBe(2);
    });

    it('should create new category if not exists', () => {
        const aiResponse = {
            adds: [
                {
                    category: 'New Cat',
                    items: [
                        { item: 'Thing', quantity: 1 }
                    ]
                }
            ]
        };

        const newState = packingReducer(initialState, applyPackingChanges(aiResponse));
        const newCat = newState.list.find(c => c.category === 'New Cat');
        expect(newCat).toBeDefined();
        expect(newCat.items[0].text).toBe('Thing');
    });
    it('should honor direct bagId provided by AI', () => {
        const initialState = {
            list: [],
            bags: [{ id: 'bag-123', name: 'Checked Suitcase', type: 'Checked' }]
        };

        const aiPayload = {
            adds: [{
                category: 'Clothes',
                items: [{
                    item: 'Winter Jacket',
                    quantity: 1,
                    bagId: 'bag-123'
                }]
            }]
        };

        const nextState = packingReducer(initialState, applyPackingChanges(aiPayload));
        const item = nextState.list[0].items[0];

        expect(item.bagId).toBe('bag-123');
        expect(item.text).toBe('Winter Jacket');
    });
    it('should add NEW item if bagId differs during category update (dedupe strictness)', () => {
        const initialState = {
            list: [
                {
                    id: 'cat-1',
                    category: 'Clothes',
                    items: [
                        { id: 'item-1', text: 'T-shirt', quantity: 1, bagId: null }
                    ]
                }
            ],
            bags: [{ id: 'bag-1', name: 'Main', type: 'Checked' }]
        };

        const aiPayload = {
            categoryUpdates: [{ // Changed from updates to categoryUpdates for clarity, though reducer handles both mapped
                categoryId: 'cat-1',
                newItems: [{
                    item: 'T-shirt',
                    quantity: 5,
                    bagId: 'bag-1'
                }]
            }]
        };

        const nextState = packingReducer(initialState, applyPackingChanges(aiPayload));
        const items = nextState.list[0].items;

        expect(items.length).toBe(2); // Should have added new one
        const newItem = items[1]; // The new one
        expect(newItem.text).toBe('T-shirt');
        expect(newItem.quantity).toBe(5);
        expect(newItem.bagId).toBe('bag-1');

        // precise check on original
        expect(items[0].quantity).toBe(1);
    });
});

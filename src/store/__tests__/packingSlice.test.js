
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
                        { item: 'New Item', quantity: 2, recommendedBagType: 'My Suitcase' }
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

    it('should match bags by type if name not found', () => {
        const aiResponse = {
            adds: [
                {
                    category: 'Existing Cat',
                    items: [
                        { item: 'Liquid', quantity: 1, recommendedBagType: 'Carry-on' }
                    ]
                }
            ]
        };

        const newState = packingReducer(initialState, applyPackingChanges(aiResponse));
        const newItem = newState.list[0].items.find(i => i.text === 'Liquid');
        expect(newItem.bagId).toBe('bag2');
    });

    it('should persist recommendedBagType when no matching bag found', () => {
        const aiResponse = {
            adds: [
                {
                    category: 'Existing Cat',
                    items: [
                        { item: 'Unique item', quantity: 1, recommendedBagType: 'Strange Bag' } // Bag doesn't exist
                    ]
                }
            ]
        };

        const newState = packingReducer(initialState, applyPackingChanges(aiResponse));
        const newItem = newState.list[0].items.find(i => i.text === 'Unique item');

        expect(newItem.bagId).toBeNull();
        expect(newItem.recommendedBagType).toBe('Strange Bag');
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
});

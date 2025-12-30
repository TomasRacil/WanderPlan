import { createSlice } from '@reduxjs/toolkit';
import { generateId } from '../utils/idGenerator';
import { initializeTrip } from './thunks';

const initialState = {
    list: [],
    bags: []
};

export const packingSlice = createSlice({
    name: 'packing',
    initialState,
    reducers: {
        setPackingList: (state, action) => {
            state.list = (action.payload || []).map(cat => ({
                ...cat,
                id: cat.id || generateId('pcat'),
                items: (cat.items || []).map(item => {
                    const { recommendedBagType, ...rest } = item;
                    return {
                        ...rest,
                        id: rest.id || generateId('pack')
                    };
                })
            }));
        },
        setBags: (state, action) => {
            state.bags = action.payload || [];
        },
        addPackingCategory: (state, action) => {
            state.list.push({
                ...action.payload,
                id: action.payload.id || generateId('pcat'),
                items: action.payload.items || []
            });
        },
        addPackingItem: (state, action) => {
            const { categoryId, item } = action.payload;
            const cat = state.list.find(c => c.id === categoryId);
            if (cat) {
                cat.items.push({
                    ...item,
                    id: item.id || generateId('pack'),
                    done: false
                });
            }
        },
        togglePackingItem: (state, action) => {
            const { categoryId, itemId } = action.payload;
            const cat = state.list.find(c => c.id === categoryId);
            if (cat) {
                const item = cat.items.find(i => i.id === itemId);
                if (item) item.done = !item.done;
            }
        },
        deletePackingItem: (state, action) => {
            const { categoryId, itemId } = action.payload;
            const cat = state.list.find(c => c.id === categoryId);
            if (cat) {
                cat.items = cat.items.filter(i => i.id !== itemId);
            }
        },
        deletePackingCategory: (state, action) => {
            const id = action.payload;
            state.list = state.list.filter(c => c.id !== id);
        },
        removeAttachmentReference: (state, action) => {
            const docId = String(action.payload);
            state.list.forEach(cat => {
                cat.items.forEach(item => {
                    if (item.attachmentIds) {
                        item.attachmentIds = item.attachmentIds.filter(id => String(id) !== docId);
                    }
                });
            });
        },
        applyPackingChanges: (state, action) => {
            const { adds = [], categoryUpdates = [], itemUpdates = [], removeItems = [], updates = [], deletes = [] } = action.payload;

            // Helper to process AI item (string or object)
            const processAiItem = (aiItem) => {
                let text = aiItem;
                let quantity = 1;
                let bagId = null;

                if (typeof aiItem === 'object') {
                    text = aiItem.item || aiItem.text;
                    quantity = aiItem.quantity || 1;

                    // STRICTLY Prioritize direct bagId if provided by AI
                    if (aiItem.bagId && String(aiItem.bagId).trim().length > 0) {
                        bagId = String(aiItem.bagId);
                    }
                }
                return { text, quantity, bagId };
            };

            // 1. New Categories (adds)
            adds.forEach(newCat => {
                const existingCat = state.list.find(c => c.category === newCat.category);
                if (existingCat) {
                    newCat.items.forEach(newItem => {
                        const { text, quantity, bagId } = processAiItem(newItem);
                        if (!existingCat.items.find(i => {
                            const iText = typeof i.text === 'string' ? i.text : (i.text?.item || i.text?.text || '');
                            const textMatch = iText.toLowerCase() === text.toLowerCase();
                            if (textMatch) {
                                if (i.bagId && bagId && i.bagId !== bagId) return false;
                                if (!i.bagId && bagId) return false;
                                return true;
                            }
                            return false;
                        })) {
                            existingCat.items.push({
                                id: generateId('ai-pack'),
                                text,
                                quantity,
                                bagId,
                                done: false
                            });
                        }
                    });
                } else {
                    state.list.push({
                        id: generateId('ai-pcat'),
                        category: newCat.category,
                        items: newCat.items.map(i => {
                            const { text, quantity, bagId } = processAiItem(i);
                            return {
                                id: generateId('ai-pack'),
                                text,
                                quantity,
                                bagId,
                                done: false
                            };
                        })
                    });
                }
            });

            // 2. Add items to existing categories (categoryUpdates)
            categoryUpdates.forEach(update => {
                const cat = state.list.find(c => String(c.id) === String(update.categoryId));
                if (cat && update.newItems) {
                    update.newItems.forEach(newItem => {
                        const { text, quantity, bagId } = processAiItem(newItem);

                        // Check duplicates: Allow same item text if it's for a different bag
                        const exists = cat.items.find(i => {
                            const iText = typeof i.text === 'string' ? i.text : (i.text?.item || i.text?.text || '');
                            const textMatch = iText.toLowerCase() === text.toLowerCase();

                            // If bagIds are involved, they must also match to be considered a "duplicate"
                            // If I have "Socks" in Bag A, and adding "Socks" to Bag B -> Not a duplicate.
                            // If I have "Socks" in Bag A, and adding "Socks" to Bag A -> Duplicate.
                            if (textMatch) {
                                if (i.bagId && bagId && i.bagId !== bagId) return false; // Different bags = Not duplicate
                                if (!i.bagId && bagId) return false; // Existing has no bag, new has bag = Not duplicate (usually)
                                return true; // Same name, same (or no) bag = Duplicate
                            }
                            return false;
                        });

                        if (!exists) {
                            cat.items.push({
                                id: generateId('ai-pack'),
                                text,
                                quantity,
                                bagId,
                                done: false
                            });
                        }
                    });
                }
            });

            // 3. Update specific items (itemUpdates)
            itemUpdates.forEach(update => {
                const { itemId, updates: itemChanges } = update;
                if (!itemId) return;

                // Find item in any category
                for (const cat of state.list) {
                    const item = cat.items.find(i => String(i.id) === String(itemId));
                    if (item) {
                        if (itemChanges.quantity !== undefined && itemChanges.quantity !== null) {
                            item.quantity = itemChanges.quantity;
                        }
                        if (itemChanges.bagId !== undefined) item.bagId = itemChanges.bagId; // Allow clearing with null
                        if (itemChanges.text) item.text = itemChanges.text;
                        break; // Stop after finding item
                    }
                }
            });

            // 4. Legacy Support (updates) - handle mixed bag if AI slips up, but prioritize explicit fields
            // Only run if categoryUpdates/itemUpdates were empty to avoid double processing
            if (categoryUpdates.length === 0 && itemUpdates.length === 0 && updates.length > 0) {
                updates.forEach(upd => {
                    // Try to match category first
                    const cat = state.list.find(c => String(c.id) === String(upd.id));
                    if (cat) {
                        // Treat as category update
                        if (upd.newItems) {
                            upd.newItems.forEach(newItem => {
                                const { text, quantity, bagId } = processAiItem(newItem);
                                if (!cat.items.find(i => (typeof i.text === 'string' ? i.text : i.text.text) === text)) {
                                    cat.items.push({
                                        id: generateId('ai-pack'), text, quantity, bagId, done: false
                                    });
                                }
                            });
                        }
                    } else {
                        // Try to match item
                        for (const c of state.list) {
                            const item = c.items.find(i => String(i.id) === String(upd.id));
                            if (item && upd.newItems) {
                                // Treat as item update via "newItems" array
                                upd.newItems.forEach(ni => {
                                    const p = processAiItem(ni);
                                    if (p.bagId) item.bagId = p.bagId;
                                    if (p.quantity) item.quantity = p.quantity;
                                });
                                break;
                            }
                        }
                    }
                });
            }

            // 5. Deletions
            // Merge "removeItems" (flat array) and "deletes" (legacy array of strings or objects)
            const allDeletes = new Set([...removeItems]);
            deletes.forEach(d => {
                if (typeof d === 'string') allDeletes.add(d);
                else if (d.id) allDeletes.add(d.id);
            });

            // Also check for legacy "updates.removeItems" if present
            if (updates.length > 0) {
                updates.forEach(u => {
                    if (u.removeItems) u.removeItems.forEach(id => allDeletes.add(id));
                });
            }

            if (allDeletes.size > 0) {
                const idsToDelete = Array.from(allDeletes).map(String);
                state.list = state.list.filter(c => !idsToDelete.includes(String(c.id)));
                state.list.forEach(category => {
                    category.items = category.items.filter(item => !idsToDelete.includes(String(item.id)));
                });
            }
        },

        addBag: (state, action) => {
            if (!state.bags) state.bags = [];
            const { quantity, ...bagData } = action.payload;
            const count = parseInt(quantity) || 1;

            if (count > 1) {
                for (let i = 1; i <= count; i++) {
                    state.bags.push({
                        ...bagData,
                        id: generateId('bag'),
                        name: `${bagData.name} ${i}`,
                        travelerId: bagData.travelerId || null
                    });
                }
            } else {
                state.bags.push({
                    ...bagData,
                    id: bagData.id || generateId('bag'),
                    travelerId: bagData.travelerId || null
                });
            }
        },
        updateBag: (state, action) => {
            const { id, ...updates } = action.payload;
            const index = state.bags.findIndex(b => b.id === id);
            if (index > -1) {
                state.bags[index] = { ...state.bags[index], ...updates };
            }
        },
        clearTravelerFromBags: (state, action) => {
            const travelerId = action.payload;
            state.bags.forEach(bag => {
                if (bag.travelerId === travelerId) bag.travelerId = null;
            });
        },
        deleteBag: (state, action) => {
            const id = action.payload;
            state.bags = state.bags.filter(b => b.id !== id);
            // Optionally clear bag assigment from items
            state.list.forEach(cat => {
                cat.items.forEach(item => {
                    if (item.bagId === id) item.bagId = null;
                });
            });
        },
        // Update item with quantity and bagId
        updatePackingItem: (state, action) => {
            const { categoryId, itemId, updates } = action.payload;
            const cat = state.list.find(c => c.id === categoryId);
            if (cat) {
                const itemIndex = cat.items.findIndex(i => i.id === itemId);
                if (itemIndex > -1) {
                    cat.items[itemIndex] = { ...cat.items[itemIndex], ...updates };
                }
            }
        },
        reorderCategories: (state, action) => {
            const { startIndex, endIndex } = action.payload;
            const result = Array.from(state.list);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            state.list = result;
        },
        reorderItemsInCategory: (state, action) => {
            const { categoryId, startIndex, endIndex } = action.payload;
            const cat = state.list.find(c => c.id === categoryId);
            if (cat) {
                const result = Array.from(cat.items);
                const [removed] = result.splice(startIndex, 1);
                result.splice(endIndex, 0, removed);
                cat.items = result;
            }
        },
        moveItemBetweenCategories: (state, action) => {
            const { sourceCategoryId, destinationCategoryId, sourceIndex, destinationIndex, itemId } = action.payload;
            const sourceCat = state.list.find(c => c.id === sourceCategoryId);
            const destCat = state.list.find(c => c.id === destinationCategoryId);

            if (sourceCat && destCat) {
                const item = sourceCat.items.find(i => i.id === itemId);
                if (item) {
                    sourceCat.items = sourceCat.items.filter(i => i.id !== itemId);
                    destCat.items.splice(destinationIndex, 0, item);
                }
            }
        },
        setItemBag: (state, action) => {
            const { itemId, bagId } = action.payload;
            state.list.forEach(cat => {
                const item = cat.items.find(i => i.id === itemId);
                if (item) item.bagId = bagId;
            });
        },
    },
    extraReducers: (builder) => {
        builder.addCase(initializeTrip.fulfilled, (state, action) => {
            if (action.payload && action.payload.packing) {
                // Migration: Remove recommendedBagType from loaded data
                state.list = (action.payload.packing.list || []).map(cat => ({
                    ...cat,
                    items: (cat.items || []).map(item => {
                        const { recommendedBagType, ...rest } = item;
                        return rest;
                    })
                }));
                state.bags = action.payload.packing.bags || [];
            }
        });
    }
});

export const {
    setPackingList, setBags,
    addPackingCategory,

    addPackingItem,
    togglePackingItem,
    deletePackingItem,
    deletePackingCategory,
    removeAttachmentReference,
    applyPackingChanges,
    addBag, updateBag, deleteBag, updatePackingItem, clearTravelerFromBags,
    reorderCategories, reorderItemsInCategory, moveItemBetweenCategories, setItemBag
} = packingSlice.actions;

export default packingSlice.reducer;

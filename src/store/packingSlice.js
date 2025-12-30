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
                items: (cat.items || []).map(item => ({
                    ...item,
                    id: item.id || generateId('pack')
                }))
            }));
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
            const { adds = [], updates = [], deletes = [] } = action.payload;

            // Helper to process AI item (string or object)
            const processAiItem = (aiItem) => {
                let text = aiItem;
                let quantity = 1;
                let bagId = null;
                let recommendedBagType = null;

                if (typeof aiItem === 'object') {
                    text = aiItem.item || aiItem.text;
                    quantity = aiItem.quantity || 1;
                    recommendedBagType = aiItem.recommendedBagType || null;

                    // Prioritize direct bagId if provided by AI
                    if (aiItem.bagId) {
                        bagId = aiItem.bagId;
                    } else if (recommendedBagType && state.bags) {
                        // Try to find matching bag by name (fuzzy) or type
                        const targetBag = state.bags.find(b =>
                            b.name.toLowerCase().includes(recommendedBagType.toLowerCase()) ||
                            b.type.toLowerCase() === recommendedBagType.toLowerCase()
                        );
                        if (targetBag) bagId = targetBag.id;
                    }
                }
                return { text, quantity, bagId, recommendedBagType };
            };

            adds.forEach(newCat => {
                const existingCat = state.list.find(c => c.category === newCat.category);
                if (existingCat) {
                    newCat.items.forEach(newItem => {
                        const { text, quantity, bagId, recommendedBagType } = processAiItem(newItem);
                        if (!existingCat.items.find(i => {
                            const iText = typeof i.text === 'string' ? i.text : (i.text?.item || i.text?.text || '');
                            return iText.toLowerCase() === text.toLowerCase();
                        })) {
                            existingCat.items.push({
                                id: generateId('ai-pack'),
                                text,
                                quantity,
                                bagId,
                                recommendedBagType,
                                done: false
                            });
                        }
                    });
                } else {
                    state.list.push({
                        id: generateId('ai-pcat'),
                        category: newCat.category,
                        items: newCat.items.map(i => {
                            const { text, quantity, bagId, recommendedBagType } = processAiItem(i);
                            return {
                                id: generateId('ai-pack'),
                                text,
                                quantity,
                                bagId,
                                recommendedBagType,
                                done: false
                            };
                        })
                    });
                }
            });

            updates.forEach(upd => {
                const catIndex = state.list.findIndex(c => String(c.id) === String(upd.id));
                if (catIndex > -1) {
                    const cat = state.list[catIndex];
                    if (upd.newItems) {
                        upd.newItems.forEach(ni => {
                            const { text, quantity, bagId, recommendedBagType } = processAiItem(ni);
                            const existingItem = cat.items.find(i => {
                                const iText = typeof i.text === 'string' ? i.text : (i.text?.item || i.text?.text || '');
                                return iText.toLowerCase() === text.toLowerCase();
                            });

                            if (existingItem) {
                                // Update existing item properties
                                existingItem.quantity = quantity;
                                existingItem.bagId = bagId;
                                existingItem.recommendedBagType = recommendedBagType;
                            } else {
                                // Add as new item
                                cat.items.push({
                                    id: generateId('ai-pack'),
                                    text,
                                    quantity,
                                    bagId,
                                    recommendedBagType,
                                    done: false
                                });
                            }
                        });
                    }
                    if (upd.removeItems) {
                        cat.items = cat.items.filter(i => !upd.removeItems.includes(String(i.id)) && !upd.removeItems.includes(i.text.toLowerCase()));
                    }
                }
            });

            if (deletes.length > 0) {
                const idsToDelete = deletes.map(String);
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
                state.list = action.payload.packing.list;
                state.bags = action.payload.packing.bags || [];
            }
        });
    }
});

export const {
    setPackingList,
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


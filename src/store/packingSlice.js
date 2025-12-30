import { createSlice } from '@reduxjs/toolkit';
import { generateId } from '../utils/idGenerator';
import { initializeTrip } from './thunks';

const initialState = {
    list: []
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
            const { ads = [], updates = [], deletes = [] } = action.payload;

            ads.forEach(newCat => {
                const existingCat = state.list.find(c => c.category === newCat.category);
                if (existingCat) {
                    newCat.items.forEach(newItem => {
                        if (!existingCat.items.find(i => i.text.toLowerCase() === newItem.toLowerCase())) {
                            existingCat.items.push({
                                id: generateId('ai-pack'),
                                text: newItem,
                                done: false
                            });
                        }
                    });
                } else {
                    state.list.push({
                        id: generateId('ai-pcat'),
                        category: newCat.category,
                        items: newCat.items.map(i => ({
                            id: generateId('ai-pack'),
                            text: i,
                            done: false
                        }))
                    });
                }
            });

            updates.forEach(upd => {
                const catIndex = state.list.findIndex(c => String(c.id) === String(upd.id));
                if (catIndex > -1) {
                    const cat = state.list[catIndex];
                    if (upd.newItems) {
                        upd.newItems.forEach(ni => {
                            if (!cat.items.find(i => i.text.toLowerCase() === ni.toLowerCase())) {
                                cat.items.push({ id: generateId('ai-pack'), text: ni, done: false });
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
        }
    },
    extraReducers: (builder) => {
        builder.addCase(initializeTrip.fulfilled, (state, action) => {
            if (action.payload && action.payload.packing) {
                state.list = action.payload.packing.list;
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
    applyPackingChanges
} = packingSlice.actions;

export default packingSlice.reducer;

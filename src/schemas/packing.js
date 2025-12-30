import { commonProperties } from './common';

export const getPackingSchema = (aiMode) => {
    const schemas = {};

    if (aiMode === 'add' || aiMode === 'fill') {
        schemas.adds = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    category: { type: "STRING" },
                    items: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                item: { type: "STRING" },
                                quantity: { type: "INTEGER" },
                                bagId: { type: "STRING", description: "Internal ID of the bag from context (e.g., 'bag-123'). Use ONLY if certain." }
                            },
                            required: ["item"]
                        }
                    },
                    attachmentIds: commonProperties.attachmentIds
                },
                required: ["category", "items"]
            }
        };
    }

    if (aiMode === 'update' || aiMode === 'fill') {
        schemas.categoryUpdates = {
            type: "ARRAY",
            description: "Use this to ADD NEW items to existing categories.",
            items: {
                type: "OBJECT",
                properties: {
                    categoryId: commonProperties.ids,
                    newItems: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                item: { type: "STRING" },
                                quantity: { type: "INTEGER" },
                                bagId: { type: "STRING", description: "Internal ID of the bag from context (e.g., 'bag-123'). Use ONLY if certain." }
                            },
                            required: ["item"]
                        }
                    }
                },
                required: ["categoryId", "newItems"]
            }
        };

        schemas.itemUpdates = {
            type: "ARRAY",
            description: "Use this to MODIFY existing items (e.g. assign to bag, change quantity).",
            items: {
                type: "OBJECT",
                properties: {
                    itemId: { type: "STRING", description: "The distinct ID of the item to update." },
                    updates: {
                        type: "OBJECT",
                        properties: {
                            quantity: { type: "INTEGER" },
                            bagId: { type: "STRING", description: "Internal ID of the bag from context (e.g., 'bag-123'). Use ONLY if certain." },
                            text: { type: "STRING" }
                        }
                    }
                },
                required: ["itemId", "updates"]
            }
        };

        schemas.removeItems = {
            type: "ARRAY",
            items: { type: "STRING", description: "IDs of items to remove." }
        };
    }

    if (aiMode === 'dedupe') {
        schemas.deletes = { type: "ARRAY", items: { type: "STRING" } };
    }

    return schemas;
};

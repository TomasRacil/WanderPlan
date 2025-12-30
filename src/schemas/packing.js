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
                                bagId: { type: "STRING", description: "Internal ID of the bag from context (e.g., 'bag-123'). Use ONLY if certain." },
                                recommendedBagType: { type: "STRING", description: "e.g., 'Carry-on', 'Checked', 'Personal Item'" }
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
        schemas.updates = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    id: commonProperties.ids,
                    newItems: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                item: { type: "STRING" },
                                quantity: { type: "INTEGER" },
                                bagId: { type: "STRING" },
                                recommendedBagType: { type: "STRING" }
                            },
                            required: ["item"]
                        }
                    },
                    removeItems: { type: "ARRAY", items: { type: "STRING" } },
                    attachmentIds: commonProperties.attachmentIds
                },
                required: ["id"]
            }
        };
    }

    if (aiMode === 'dedupe') {
        schemas.deletes = { type: "ARRAY", items: { type: "STRING" } };
    }

    return schemas;
};

import { commonProperties } from './common';

export const getTasksSchema = (aiMode) => {
    const schemas = {};

    if (aiMode === 'add' || aiMode === 'fill') {
        schemas.adds = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    text: { type: "STRING" },
                    cost: commonProperties.cost,
                    currency: commonProperties.currency,
                    category: { type: "STRING" },
                    dueDate: { type: "STRING" },
                    notes: commonProperties.notes,
                    timeToComplete: { type: "STRING" }
                },
                required: ["text"]
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
                    fields: {
                        type: "OBJECT",
                        properties: {
                            text: { type: "STRING" },
                            cost: commonProperties.cost,
                            done: { type: "BOOLEAN" },
                            notes: commonProperties.notes
                        }
                    }
                },
                required: ["id", "fields"]
            }
        };
    }

    if (aiMode === 'dedupe') {
        schemas.deletes = { type: "ARRAY", items: { type: "STRING" } };
    }

    return schemas;
};

import { commonProperties } from './common';
import { BUDGET_CATEGORIES } from '../data/budgetConstants';

export const getTasksSchema = (aiMode) => {
    const schemas = {};

    const catDesc = `Must be one of: ${BUDGET_CATEGORIES.join(', ')}`;

    if (aiMode === 'add' || aiMode === 'fill') {
        schemas.adds = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    text: { type: "STRING", description: "What needs to be done (e.g., 'Book flight', 'Get visa')" },
                    cost: { ...commonProperties.cost, description: "Estimated cost if any" },
                    currency: { ...commonProperties.currency, description: "Currency for the cost" },
                    category: { type: "STRING", description: catDesc },
                    dueDate: { type: "STRING", description: "Due date in YYYY-MM-DD format. Recommended for time-sensitive preparation." },
                    notes: commonProperties.notes,
                    timeToComplete: { type: "STRING", description: "Estimated time to perform the task (e.g., '30 mins', '2 hours')" },
                    attachmentIds: { ...commonProperties.attachmentIds, description: "MANDATORY: Document IDs containing task info." }
                },
            },
            required: ["text"]
        }
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
                            text: { type: "STRING", description: "What needs to be done" },
                            cost: { ...commonProperties.cost, description: "Estimated cost" },
                            currency: { ...commonProperties.currency, description: "Currency" },
                            category: { type: "STRING", description: catDesc },
                            dueDate: { type: "STRING", description: "Due date in YYYY-MM-DD format." },
                            done: { type: "BOOLEAN" },
                            notes: commonProperties.notes,
                            timeToComplete: { type: "STRING" },
                            attachmentIds: { ...commonProperties.attachmentIds, description: "MANDATORY: Document IDs that justify these changes." }
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

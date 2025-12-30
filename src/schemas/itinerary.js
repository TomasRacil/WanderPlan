import { commonProperties } from './common';
import { EVENT_TYPES } from '../data/eventConstants';
import { BUDGET_CATEGORIES } from '../data/budgetConstants';

export const getItinerarySchema = (aiMode) => {
    const schemas = {};

    const typeDesc = `Must be one of: ${EVENT_TYPES.join(', ')}`;
    const catDesc = `Must be one of: ${BUDGET_CATEGORIES.join(', ')}`;
    // Helper to generate location description - centralized string
    const locDesc = "Place name or full address (preferably in local language or internationally understandable format)";
    const endLocDesc = "Destination location if applicable (preferably in local language or internationally understandable format)";

    if (aiMode === 'add' || aiMode === 'fill') {
        schemas.adds = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING", description: "Name of the activity (e.g., 'Flight to Tokyo', 'Museum Visit')" },
                    startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format" },
                    startTime: { type: "STRING", description: "Start time in HH:mm format" },
                    duration: { type: "NUMBER", description: "Duration in minutes" },
                    type: { type: "STRING", description: typeDesc },
                    cost: { type: "NUMBER", description: "Cost of the activity" },
                    currency: commonProperties.currency,
                    location: { ...commonProperties.location, description: "Exact address or place name" },
                    endLocation: { type: "STRING", description: "Arrival address for transport items" },
                    notes: commonProperties.notes,
                    category: { type: "STRING", description: catDesc },
                    attachmentIds: { ...commonProperties.attachmentIds, description: "MANDATORY: List of unique document IDs used to create this item." }
                },
                required: ["title", "startDate", "startTime", "type", "duration", "location"]
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
                            title: { type: "STRING", description: "Updated name of the activity" },
                            startDate: { type: "STRING", description: "YYYY-MM-DD" },
                            startTime: { type: "STRING", description: "HH:mm" },
                            duration: { type: "NUMBER", description: "Minutes" },
                            type: { type: "STRING", description: typeDesc },
                            cost: { type: "NUMBER", description: "Cost of the activity" },
                            currency: commonProperties.currency,
                            location: { ...commonProperties.location, description: locDesc },
                            endLocation: { type: "STRING", description: endLocDesc },
                            category: { type: "STRING", description: catDesc },
                            notes: commonProperties.notes,
                            attachmentIds: { ...commonProperties.attachmentIds, description: "MANDATORY: Document IDs that support this update." }
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

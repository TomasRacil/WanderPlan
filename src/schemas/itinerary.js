import { commonProperties } from './common';

export const getItinerarySchema = (aiMode) => {
    const schemas = {};

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
                    type: { type: "STRING", description: "e.g., transport, stay, activity, meal" },
                    cost: { type: "NUMBER", description: "Cost of the activity" },
                    currency: commonProperties.currency,
                    location: { ...commonProperties.location, description: "Exact address or place name" },
                    endLocation: { type: "STRING", description: "Arrival address for transport items" },
                    timeZone: { type: "STRING", description: "Valid IANA timezone (e.g., 'Asia/Tokyo')" },
                    notes: commonProperties.notes,
                    category: { type: "STRING" },
                    attachmentIds: { ...commonProperties.attachmentIds, description: "MANDATORY: List of unique document IDs used to create this item." }
                },
                required: ["title", "startDate", "cost"]
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
                            cost: commonProperties.cost,
                            currency: commonProperties.currency,
                            location: { ...commonProperties.location, description: "Place name or full address" },
                            endLocation: { type: "STRING", description: "Destination location if applicable" },
                            timeZone: { type: "STRING" },
                            category: { type: "STRING" },
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

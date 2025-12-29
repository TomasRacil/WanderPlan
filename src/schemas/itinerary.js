import { commonProperties } from './common';

export const getItinerarySchema = (aiMode) => {
    const schemas = {};

    if (aiMode === 'add' || aiMode === 'fill') {
        schemas.adds = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    title: { type: "STRING" },
                    startDate: { type: "STRING" },
                    startTime: { type: "STRING" },
                    duration: { type: "NUMBER" },
                    type: { type: "STRING" },
                    estimatedCost: { type: "NUMBER" },
                    currency: commonProperties.currency,
                    location: commonProperties.location,
                    endLocation: { type: "STRING" },
                    timeZone: { type: "STRING" },
                    notes: commonProperties.notes,
                    category: { type: "STRING" },
                    attachmentIds: commonProperties.attachmentIds
                },
                required: ["title", "startDate", "type"]
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
                            title: { type: "STRING" },
                            startDate: { type: "STRING" },
                            startTime: { type: "STRING" },
                            duration: { type: "NUMBER" },
                            cost: commonProperties.cost,
                            location: commonProperties.location,
                            notes: commonProperties.notes,
                            attachmentIds: commonProperties.attachmentIds
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

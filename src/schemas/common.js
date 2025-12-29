export const commonProperties = {
    ids: { type: "STRING" },
    currency: { type: "STRING" },
    cost: { type: "NUMBER" },
    notes: { type: "STRING" },
    location: { type: "STRING" },
    attachmentIds: { type: "ARRAY", items: { type: "STRING" } }
};

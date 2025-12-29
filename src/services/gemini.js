export const AVAILABLE_MODELS = {
    'gemini-3-flash-preview': { type: 'cloud', multimodal: true },
    'gemini-2.5-flash': { type: 'cloud', multimodal: true },
    'gemini-2.5-flash-lite': { type: 'cloud', multimodal: true },
    'gemma-3-27b-it': { type: 'cloud', multimodal: false },
    'gemma-3-12b-it': { type: 'cloud', multimodal: false },
    'local-nano': { type: 'local', multimodal: false }
};

export const logAvailableModels = async (apiKey) => {
    if (!apiKey) return;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        const genModels = data.models?.filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));
        console.log("🚀 WanderPlan: Available Gemini Models:", genModels);
    } catch (e) {
        console.error("Failed to list models:", e);
    }
};

import { getItinerarySchema } from '../schemas/itinerary';
import { getTasksSchema } from '../schemas/tasks';
import { getPackingSchema } from '../schemas/packing';
import { getPhrasebookSchema } from '../schemas/phrasebook';

const getSchemaForArea = (targetArea, aiMode) => {
    switch (targetArea) {
        case 'itinerary': return getItinerarySchema(aiMode);
        case 'tasks': return getTasksSchema(aiMode);
        case 'packing': return getPackingSchema(aiMode);
        case 'phrasebook': return getPhrasebookSchema();
        default: return {};
    }
};

export const generateTripContent = async (apiKey, tripDetails, customPrompt, itinerary, preTripTasks, packingList, language = 'en', targetArea = 'all', aiMode = 'add', selectedModel = 'gemini-3-flash-preview', distilledContext = {}) => {
    const existingItinerary = (itinerary || []).map(i =>
        `{"id": "${i.id}", "title": "${i.title}", "date": "${i.startDate}", "time": "${i.startTime}", "duration": ${i.duration || 60}, "type": "${i.type}", "category": "${i.category}", "cost": ${i.cost || 0}, "currency": "${i.currency}", "location": "${i.location}"}`
    ).join('\n');

    const existingTasks = (preTripTasks || []).map(t =>
        `{"id": "${t.id}", "text": "${t.text}", "status": "${t.done ? 'Done' : 'Pending'}", "cost": ${t.cost || 0}, "currency": "${t.currency}", "category": "${t.category}"}`
    ).join('\n');

    const existingPacking = JSON.stringify((packingList || []).map(cat => ({
        id: cat.id,
        category: cat.category,
        items: (cat.items || []).map(i => ({ id: i.id, text: i.text }))
    })));

    // Prepare Distilled Context String
    let distilledInfoString = "";
    if (Object.keys(distilledContext).length > 0) {
        console.log("ℹ️ Using Distilled Context for:", Object.keys(distilledContext));
        distilledInfoString = "DISTILLED ATTACHMENT DATA (Do NOT request these files again):\n" +
            Object.entries(distilledContext).map(([id, info]) => `Attachment ${id}: ${info.extractedInfo}`).join('\n');
    }

    const context = `
        Current Trip: ${tripDetails.destination} (${tripDetails.startDate} to ${tripDetails.endDate})
        Origin: ${tripDetails.origin || 'Unknown'}
        Travel Style: ${tripDetails.travelStyle}
        Travelers: ${tripDetails.travelers || 1}
        Preferred Language for Response: ${language}
        
        CRITICAL: All existing items have unique IDs. Use these IDs to refer to items for updates or deletions.
        Existing Itinerary (JSON): ${existingItinerary}
        Existing Tasks (JSON): ${existingTasks}
        Existing Packing (JSON): ${existingPacking}

        ${distilledInfoString}
    `;

    const instructions = {
        add: "Focus ONLY on suggesting NEW items that are not in the list. Suggest 3-5 high quality items.",
        update: "Focus ONLY on UPDATING existing items. Used their 'id' to specify which item you are changing. Return ONLY the fields that changed.",
        fill: "Look for gaps and return NEW items or UPDATES to existing placeholders to fill those gaps.",
        dedupe: "Identify exact or semantic duplicates. Return ONLY a list of IDs to remove."
    };

    // Identify Fresh Attachments (Lazy Distillation)
    const allAttachments = [];
    const collectAttachments = (items) => {
        if (!items) return;
        items.forEach(item => {
            if (item.attachments && item.attachments.length > 0) {
                item.attachments.forEach(att => {
                    // Check if already distilled
                    if (att.id && distilledContext[att.id]) return;

                    const base64Data = att.data.split(',')[1];
                    if (base64Data) {
                        allAttachments.push({ text: `[Attachment ID: ${att.id}]` });
                        allAttachments.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: att.type
                            },
                        });
                    }
                });
            }
        });
    };

    collectAttachments(itinerary);
    collectAttachments(preTripTasks);

    let systemInstruction = "";
    if (allAttachments.length > 0) {
        systemInstruction = `You are in Hybrid-Extraction mode. For any provided raw files, perform the requested task AND extract a dense, comprehensive summary of ALL information relevant to planning and executing a trip. 
Let your intelligence decide what is important, but prioritize details that impact:
- ITINERARY: Dates, times, addresses, and sequence of events.
- BUDGET: Total costs, currencies, payment status, and pending balances.
- PACKING: Included equipment, clothing requirements, or provided amenities.
- PREPARATION: Confirmation numbers, check-in/out rules, required documents, and specific technical or legal constraints.
Reflect this extraction in the 'newDistilledData' array.
`;
    }

    // --- Schema Construction ---
    const baseSchemaProperties = getSchemaForArea(targetArea, aiMode);

    // Add 'deletes' globally if not phrasebook and not already handled by specific schema (though specific schemas handle dedupe now)
    // Actually, modular schemas handle dedupe internally now. 
    // We can just rely on baseSchemaProperties.

    // Add 'newDistilledData' if needed
    if (allAttachments.length > 0) {
        baseSchemaProperties.newDistilledData = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    attachmentId: { type: "STRING" },
                    summary: { type: "STRING" }
                },
                required: ["attachmentId", "summary"]
            }
        };
    }

    // Filter allowed keys based on aiMode if strictly needed, but for Schema it's often better to allow the structure and just prompt effectively.
    // However, we can enforce strictness by only including relevant keys in the schema.
    // simpler approach: The schema defines the *shape* of the output. The *prompt* defines the *intent*.

    const finalSchema = {
        type: "OBJECT",
        properties: baseSchemaProperties,
        // Make 'newDistilledData' required if we have attachments to force the model to fill it
        required: allAttachments.length > 0 ? ["newDistilledData"] : []
    };

    const prompt = `
        SYSTEM INSTRUCTION: ${systemInstruction}
    
        CONTEXT:
        ${context}

        USER REQUEST: ${customPrompt || "No special requests."}

        GOAL: ${aiMode.toUpperCase()} mode. ${instructions[aiMode] || instructions.add}
        Target Area: ${targetArea}. 

        Provide your response matching the defined JSON schema.
    `;

    // Local Nano Implementation (Parsing Fallback)
    if (selectedModel === 'local-nano') {
        if (!window.ai || !window.ai.languageModel) {
            throw new Error("Local Gemini Nano is not available in this browser.");
        }
        const session = await window.ai.languageModel.create({
            systemPrompt: systemInstruction
        });
        if (allAttachments.length > 0) console.warn("Local Nano may not support image attachments yet.");
        const result = await session.prompt(prompt + " Return valid JSON.");
        // Nano needs manual parsing
        let text = result;
        text = text.replace(/```json|```/gi, '');
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            text = text.substring(firstOpen, lastClose + 1);
        }
        return JSON.parse(text);
    }

    // Cloud Implementation
    const promptParts = [{ text: prompt }];
    if (allAttachments.length > 0) {
        promptParts.push(...allAttachments);
    }

    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;

    const response = await fetch(`${baseUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: promptParts }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: finalSchema
            }
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 429) {
            const err = new Error("Quota Exceeded");
            err.status = 429;
            throw err;
        }
        console.error("API Request Failed:", response.status, response.statusText, errorBody);
        throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("No content generated");

    try {
        const json = JSON.parse(text);

        // Adapter: Convert newDistilledData Array -> Object Map if present
        if (json.newDistilledData && Array.isArray(json.newDistilledData)) {
            const distilledMap = {};
            json.newDistilledData.forEach(item => {
                if (item.attachmentId && item.summary) {
                    distilledMap[item.attachmentId] = { extractedInfo: item.summary };
                }
            });
            json.newDistilledData = distilledMap;
        }

        return json;
    } catch (e) {
        console.error("JSON Parse Error:", e, "Failed Text:", text);
        throw e;
    }
};

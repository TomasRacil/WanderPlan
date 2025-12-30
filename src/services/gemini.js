import { z } from 'zod';

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
import { getSystemInstructions, constructUserPrompt } from '../ai/prompts';


const getSchemaForArea = (targetArea, aiMode) => {
    switch (targetArea) {
        case 'itinerary': return getItinerarySchema(aiMode);
        case 'tasks': return getTasksSchema(aiMode);
        case 'packing': return getPackingSchema(aiMode);
        case 'phrasebook': return getPhrasebookSchema();
        default: return {};
    }
};

// Response Validation Schema
const ResponseSchema = z.object({
    changeSummary: z.string().optional(),
    adds: z.array(z.object({}).catchall(z.any()).refine(item => {
        return !!(item.title || item.text || item.category);
    }, { message: "Added item missing required fields (title, text, or category)" })).optional(),
    categoryUpdates: z.array(z.object({
        categoryId: z.string(),
        newItems: z.array(z.any())
    })).optional(),
    itemUpdates: z.array(z.object({
        itemId: z.string(),
        updates: z.object({}).catchall(z.any())
    })).optional(),
    removeItems: z.array(z.string()).optional(),
    updates: z.array(z.any()).optional(), // Keep valid for non-packing schemas or legacy
    deletes: z.union([z.array(z.string()), z.array(z.object({ id: z.string() }))]).optional(),
    newDistilledData: z.union([
        z.array(z.object({ attachmentId: z.string(), summary: z.string() })),
        z.object({}).catchall(z.object({ extractedInfo: z.string() }))
    ]).optional(),
    phrasebook: z.any().optional()
});

export const generateTripContent = async (apiKey, tripDetails, customPrompt, itinerary, preTripTasks, packingList, language = 'en', targetArea = 'all', aiMode = 'add', selectedModel = 'gemini-3-flash-preview', allDocuments = {}, promptAttachments = [], bags = []) => {
    const allDocIds = new Set(Object.keys(allDocuments));
    (promptAttachments || []).forEach(id => allDocIds.add(String(id)));

    const summarizedDocs = Array.from(allDocIds)
        .map(id => ({ id, doc: allDocuments[id] }))
        .filter(item => item.doc && item.doc.summary);

    const context = JSON.stringify({
        itinerary: itinerary || [],
        tasks: preTripTasks || [],
        packing: packingList || [],
        bags: bags || [],
        travelers: tripDetails.travelerProfiles || [],
        distilledAttachments: summarizedDocs.map(item => ({ id: item.id, summary: item.doc.summary })),
        preferredLanguage: language
    });

    // Identify Fresh Attachments (Lazy Distillation)
    const allAttachments = [];
    const rawDataNeededIds = Array.from(allDocIds).filter(id => {
        const doc = allDocuments[id];
        return doc && !doc.summary && doc.data;
    });

    rawDataNeededIds.forEach(id => {
        const doc = allDocuments[id];
        const base64Data = doc.data?.split(',')[1];
        if (base64Data) {
            allAttachments.push({ text: `[Attachment ID: ${id}]` });
            allAttachments.push({
                inlineData: {
                    data: base64Data,
                    mimeType: doc.type
                },
            });
        }
    });

    const finalSystemInstruction = getSystemInstructions(new Date().toISOString().split('T')[0], tripDetails, rawDataNeededIds.length > 0, language, targetArea, aiMode);
    const prompt = constructUserPrompt(context, customPrompt, aiMode, targetArea);

    // --- Schema Construction ---
    const baseSchemaProperties = getSchemaForArea(targetArea, aiMode);

    // Add changeSummary globally
    baseSchemaProperties.changeSummary = {
        type: "STRING",
        description: "A brief explanation of the changes made, including why specific items were added, updated, or deleted, especially if based on provided attachments."
    };

    const requiredFields = [];

    // Add 'newDistilledData' if needed
    if (rawDataNeededIds.length > 0) {
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
        requiredFields.push("newDistilledData");
    }

    // Force mode-specific fields
    if (targetArea === 'phrasebook') {
        requiredFields.push("phrasebook");
    } else {
        if (aiMode === 'add') requiredFields.push("adds");
        if ((aiMode === 'update' || aiMode === 'fill') && targetArea === 'packing') {
            // Packing splits updates
        } else if (aiMode === 'update') {
            requiredFields.push("updates");
        }
    }

    const finalSchema = {
        type: "OBJECT",
        properties: baseSchemaProperties,
        required: requiredFields
    };

    // Local Nano Implementation (Parsing Fallback)
    if (selectedModel === 'local-nano') {
        if (!window.ai || !window.ai.languageModel) {
            throw new Error("Local Gemini Nano is not available in this browser.");
        }
        const session = await window.ai.languageModel.create({
            systemPrompt: finalSystemInstruction
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
            system_instruction: {
                parts: [{ text: finalSystemInstruction }]
            },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: finalSchema,
                maxOutputTokens: 65536,
                temperature: 0.2
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

        // Validation
        const validation = ResponseSchema.safeParse(json);
        if (!validation.success) {
            console.error("AI Response Validation Failed:", validation.error);
            // We might throw here to trigger fallback or error in UI
            throw new Error("AI Response failed validation: " + validation.error.message);
        }

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
        console.error("JSON Parse/Validation Error:", e, "Failed Text:", text);
        throw e;
    }
};

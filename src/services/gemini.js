export const generateTripContent = async (apiKey, tripDetails, customPrompt, itinerary, preTripTasks, packingList, language = 'en', targetArea = 'all', aiMode = 'add') => {
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

    const budgetStatus = `Budget: ${tripDetails.budget} ${tripDetails.homeCurrency}.`;

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
    `;

    const instructions = {
        add: "Focus ONLY on suggesting NEW items that are not in the list. Allowed keys: 'adds'.",
        update: "Focus ONLY on UPDATING existing items. Used their 'id' to specify which item you are changing. Return ONLY the fields that changed. Allowed keys: 'updates'.",
        fill: "Look for gaps and return NEW items or UPDATES to existing placeholders to fill those gaps. Allowed keys: 'adds', 'updates'.",
        dedupe: "Identify exact or semantic duplicates. Return ONLY a list of IDs to remove. Allowed keys: 'deletes'."
    };

    let areaSpecificFormat = '';
    switch (targetArea) {
        case 'itinerary':
            areaSpecificFormat = `
                "adds": [{"title": "...", "startDate": "YYYY-MM-DD", "startTime": "HH:mm", "duration": 60, "type": "Activity", "estimatedCost": 0, "currency": "CODE", "location": "...", "endLocation": "...", "timeZone": "...", "notes": "..."}],
                "updates": [{"id": "...", "fields": {"title": "...", "notes": "..."}}],
                "deletes": ["id1", "id2"]
            `;
            break;
        case 'tasks':
            areaSpecificFormat = `
                "adds": [{"text": "...", "cost": 0, "currency": "CODE", "category": "Category", "dueDate": "YYYY-MM-DD", "notes": "...", "timeToComplete": "..."}],
                "updates": [{"id": "...", "fields": {"text": "...", "cost": 10}}],
                "deletes": ["id1"]
            `;
            break;
        case 'packing':
            areaSpecificFormat = `
                "adds": [{"category": "Electronics", "items": ["Item 1", "Item 2"]}],
                "updates": [{"id": "categoryId", "newItems": ["Add this string"], "removeItems": ["Remove this Item ID"]}],
                "deletes": ["categoryId", "itemId"]
            `;
            break;
        case 'phrasebook':
            areaSpecificFormat = `"phrasebook": { "language": "Lang", "tips": "Tip", "phrases": [{"original":"x","phonetic":"y","english":"z"}] }`;
            break;
        default:
            areaSpecificFormat = `"adds": [], "updates": [], "deletes": []`;
    }

    const allowedKeys = aiMode === 'dedupe' ? "'deletes'" : aiMode === 'update' ? "'updates'" : "'adds', 'updates'";

    const prompt = `
        CONTEXT:
        ${context}

        USER REQUEST: ${customPrompt || "No special requests."}

        GOAL: ${aiMode.toUpperCase()} mode. ${instructions[aiMode] || instructions.add}
        Target Area: ${targetArea}. 

        STRICTOR FORMATTING:
        - Return ONLY a JSON object. No markdown.
        - CRITICAL: Only use these keys: [${allowedKeys}].
        - Do not suggest new items or updates if the mode is 'dedupe'.
        - Structure: { ${areaSpecificFormat} }
    `;

    if (!apiKey) {
        // Mock Data for Demo Mode
        console.warn("Using Mock Data (No API Key). Results will be generic.");
        await new Promise(r => setTimeout(r, 1500));

        const isEurope = /paris|london|berlin|prague|rome|madrid/i.test(tripDetails.destination);
        const mockCurrency = isEurope ? "EUR" : (tripDetails.homeCurrency || "USD");

        const fullMock = {
            tripCurrency: mockCurrency,
            exchangeRate: 1.0,
            newPreTrip: [
                { text: "Check visa requirements", cost: 0, currency: tripDetails.homeCurrency, category: "Documents" },
                { text: "Download Offline Maps", cost: 0, currency: tripDetails.homeCurrency, category: "Other" }
            ],
            newPacking: [
                { category: "Documents", items: ["Passport", "Tickets"] },
                { category: "Tech", items: ["Charger", "Adapter"] }
            ],
            newItinerary: itinerary.length === 0 ? [
                { title: "Arrival at Destination", type: "Activity", category: "Transport", startDate: tripDetails.startDate, endDate: tripDetails.startDate, startTime: "10:00", endTime: "11:00", location: `${tripDetails.destination} Center`, notes: "Arrive and get settled", estimatedCost: 0, currency: mockCurrency },
                { title: "City Walk & Exploration", type: "Activity", category: "Activities", startDate: tripDetails.startDate, endDate: tripDetails.startDate, startTime: "12:00", endTime: "14:00", location: "City Center", notes: "Explore the main square", estimatedCost: 0, currency: mockCurrency }
            ] : [],
            phrasebook: {
                language: "Local Language",
                tips: "Research local etiquette.",
                phrases: [{ original: "Hello", phonetic: "-", english: "Hello" }]
            }
        };

        if (targetArea === 'itinerary') return { newItinerary: fullMock.newItinerary, tripCurrency: mockCurrency };
        if (targetArea === 'tasks') return { newPreTrip: fullMock.newPreTrip, tripCurrency: mockCurrency };
        if (targetArea === 'packing') return { newPacking: fullMock.newPacking };
        if (targetArea === 'phrasebook') return { phrasebook: fullMock.phrasebook };
        return fullMock;
    } else {
        // Collect all attachments from itinerary and tasks
        const allAttachments = [];

        // Helper to add attachments
        const collectAttachments = (items) => {
            if (!items) return;
            items.forEach(item => {
                if (item.attachments && item.attachments.length > 0) {
                    item.attachments.forEach(att => {
                        // Start of base64 string usually has "data:image/png;base64,"
                        const base64Data = att.data.split(',')[1];
                        if (base64Data) {
                            allAttachments.push({
                                inlineData: {
                                    data: base64Data,
                                    mimeType: att.type
                                }
                            });
                        }
                    });
                }
            });
        };

        collectAttachments(itinerary);
        collectAttachments(preTripTasks);

        // Construct the prompt parts
        const promptParts = [
            { text: prompt }
        ];

        // Add images if any
        if (allAttachments.length > 0) {
            promptParts.push(...allAttachments);
        }

        // Initialize the GoogleGenerativeAI client
        // This assumes 'GoogleGenerativeAI' and 'HarmBlockThreshold' are imported or available in scope.
        // For a complete setup, you'd typically have:
        // import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
        // const genAI = new GoogleGenerativeAI(apiKey);
        // const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" }); // or "gemini-pro" if no images
        // For this specific change, we'll assume 'model' is available or passed.
        // If 'model' is not defined, this code will break.
        // Given the original code used a direct fetch, we'll adapt to that.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: "user", parts: promptParts }] })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("API Request Failed:", response.status, response.statusText, errorBody);
            throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        let text = result.candidates[0].content.parts[0].text;

        text = text.replace(/```json|```/gi, '');

        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1) {
            text = text.substring(firstOpen, lastClose + 1);
        }

        try {
            const json = JSON.parse(text);
            return json;
        } catch (e) {
            console.error("JSON Parse Error:", e, "Failed Text:", text);
            throw e;
        }
    }
};

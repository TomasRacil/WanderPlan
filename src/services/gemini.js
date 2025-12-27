export const generateTripContent = async (apiKey, tripDetails, customPrompt, itinerary, preTripTasks, language = 'en', targetArea = 'all', aiMode = 'add') => {
    // Serialization logic from original file
    const existingItinerary = itinerary.map(i =>
        `- [ID: ${i.id}] ${i.startDate || i.date} ${i.startTime}-${i.endTime} (End: ${i.endDate || i.startDate || i.date}): ${i.title} [Type: ${i.type}] [Category: ${i.category}] [Cost: ${i.cost} ${i.currency}] @ ${i.location || 'No Loc'}`
    ).join('\n');

    const existingTasks = preTripTasks.map(t =>
        `- ${t.text} [Status: ${t.done ? 'Done' : 'Pending'}] [Cost: ${t.cost} ${t.currency}]`
    ).join('\n');

    const budgetStatus = `Budget: ${tripDetails.budget} ${tripDetails.homeCurrency}.`;

    let goalPrompt = '';
    let responseFormat = '';

    const context = `
        Current Trip: ${tripDetails.destination} (${tripDetails.startDate} to ${tripDetails.endDate})
        Origin: ${tripDetails.origin || 'Unknown'}
        Travel Style: ${tripDetails.travelStyle}
        Travelers: ${tripDetails.travelers || 1}
        Preferred Language for Response: ${language}
        
        Current Itinerary: ${JSON.stringify(itinerary.map(e => ({ title: e.title, date: e.startDate, time: e.startTime, type: e.type, notes: e.notes })))}
        Current Pre-Trip Tasks: ${JSON.stringify(preTripTasks.map(t => ({ text: t.text, category: t.category, dueDate: t.dueDate, notes: t.notes })))}
    `;

    const modeInstructions = {
        add: "Focus on suggesting NEW items that are highly relevant but not yet in the list.",
        update: "STRICTLY focus on ENHANCING existing items in the provided list. Add missing details like notes, costs, specific times, or categories. Do not suggest unrelated new items.",
        fill: "Look for gaps in the plan (e.g., missing meals, hotel check-ins, or gaps between activities) and suggest items to fill those specific voids.",
        dedupe: "Analyze the current list. Identify and REMOVE duplicate items (both exact matches and semantic duplicates). Return the CLEANED, unique list of items."
    };

    switch (targetArea) {
        case 'itinerary':
            goalPrompt = `
                Generate itinerary events for the trip.
                - MODE: ${aiMode}. ${modeInstructions[aiMode]}
                - For each event return: "title", "startDate" (YYYY-MM-DD), "startTime" (HH:mm), "endTime" (HH:mm), "type", "estimatedCost", "currency", "location", "endLocation", and "notes".
                - RETURN ONLY the "newItinerary" field.
            `;
            responseFormat = `"newItinerary": [{"title": "...", "startDate": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "type": "Activity", "estimatedCost": 0, "currency": "CODE", "location": "...", "endLocation": "...", "notes": "..."}]`;
            break;
        case 'tasks':
            goalPrompt = `
                Suggest pre-trip tasks.
                - MODE: ${aiMode}. ${modeInstructions[aiMode]}
                - For each task return: "text", "cost", "currency", "category", "dueDate" (YYYY-MM-DD), "notes", and "timeToComplete" (e.g., "30 mins").
                - RETURN ONLY the "newPreTrip" and "tripCurrency" fields.
            `;
            responseFormat = `"newPreTrip": [{"text": "...", "cost": 0, "currency": "CODE", "category": "Category", "dueDate": "YYYY-MM-DD", "notes": "...", "timeToComplete": "..."}], "tripCurrency": "CODE"`;
            break;
        case 'packing':
            goalPrompt = `
                Generate a smart packing list.
                - MODE: ${aiMode}. ${modeInstructions[aiMode] || modeInstructions['add']}
                - RETURN ONLY the "newPacking" field.
            `;
            responseFormat = `"newPacking": [{"category": "Electronics", "items": ["Item 1", "Item 2"]}]`;
            break;
        case 'phrasebook':
            goalPrompt = `
                Generate a useful phrasebook for the destination's local language.
                - Include 10-15 essential phrases.
                - For each phrase return: "original", "phonetic", "english".
                - RETURN ONLY the "phrasebook" field.
            `;
            responseFormat = `"phrasebook": { "language": "Lang", "tips": "Tip", "phrases": [{"original":"x","phonetic":"y","english":"z"}] }`;
            break;
        default:
            goalPrompt = `Plan a complete trip. Suggest itinerary, tasks, and packing items.`;
            responseFormat = `"newItinerary": [...], "newPreTrip": [...], "newPacking": [...]`;
    }

    const prompt = `
        CONTEXT:
        ${context}

        USER REQUEST: ${customPrompt || "No special requests."}

        GOAL: ${goalPrompt}

        STRICTOR FORMATTING:
        - Return ONLY a JSON object. No markdown. No text before or after.
        - Structure: { ${responseFormat} }
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) throw new Error("API Request Failed");
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

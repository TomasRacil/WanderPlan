import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTripContent } from './gemini';

// Mock window.ai for local nano tests
global.window = {
    ai: {
        languageModel: {
            create: vi.fn(),
        }
    }
};

global.fetch = vi.fn();

describe('gemini.js Service', () => {
    const mockApiKey = 'test-api-key';
    const mockTripDetails = { destination: 'Paris', startDate: '2025-01-01', endDate: '2025-01-05' };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should generate content with correct schema for "itinerary"', async () => {
        const mockResponse = {
            candidates: [{
                content: {
                    parts: [{ text: JSON.stringify({ adds: [], updates: [], deletes: [] }) }]
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        await generateTripContent(mockApiKey, mockTripDetails, '', [], [], [], 'en', 'itinerary');

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);

        // Verify Schema was passed
        expect(requestBody.generationConfig.responseSchema).toBeDefined();
        // Itinerary schema check (indirectly checking getBaseSchema)
        expect(requestBody.generationConfig.responseSchema.properties.adds.items.properties).toHaveProperty('startDate');
        expect(requestBody.generationConfig.responseSchema.properties.adds.items.properties).toHaveProperty('startTime');
    });

    it('should handle Lazy Distillation adapter logic correctly', async () => {
        // Mock response with Array-based newDistilledData (as returned by Structured Output)
        const mockResponse = {
            candidates: [{
                content: {
                    parts: [{
                        text: JSON.stringify({
                            adds: [],
                            newDistilledData: [
                                { attachmentId: "123", summary: "Ticket confirmed" },
                                { attachmentId: "456", summary: "Hotel booked" }
                            ]
                        })
                    }]
                }
            }]
        };

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        // Pass dummy attachment to trigger logic (otherwise it won't expect distilled data)
        const mockItinerary = [{ id: '1', attachments: [{ id: '123', data: 'base64...', type: 'image/png' }] }];

        const result = await generateTripContent(mockApiKey, mockTripDetails, '', mockItinerary, [], [], 'en', 'itinerary', 'add', 'gemini-3-flash-preview');

        // Verify the adapter converted Array -> Map
        expect(result.newDistilledData).toBeDefined();
        expect(Array.isArray(result.newDistilledData)).toBe(false);
        expect(result.newDistilledData['123']).toEqual({ extractedInfo: "Ticket confirmed" });
        expect(result.newDistilledData['456']).toEqual({ extractedInfo: "Hotel booked" });
    });

    it('should throw Quota Exceeded error on 429', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: async () => "Quota Exceeded"
        });

        try {
            await generateTripContent(mockApiKey, mockTripDetails, '', [], [], []);
            // Should fail if we reach here
            expect(true).toBe(false);
        } catch (e) {
            expect(e.message).toBe("Quota Exceeded");
            expect(e.status).toBe(429);
        }
    });

    it('should fall back to Local Nano when selected', async () => {
        const mockSession = { prompt: vi.fn().mockResolvedValue('{"adds": []}') };
        global.window.ai.languageModel.create.mockResolvedValue(mockSession);

        const result = await generateTripContent(null, mockTripDetails, '', [], [], [], 'en', 'all', 'add', 'local-nano');

        expect(global.window.ai.languageModel.create).toHaveBeenCalled();
        expect(mockSession.prompt).toHaveBeenCalled();
        expect(result).toEqual({ adds: [] });
    });
});

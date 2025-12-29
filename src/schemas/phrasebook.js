export const getPhrasebookSchema = () => {
    return {
        phrasebook: {
            type: "OBJECT",
            properties: {
                language: { type: "STRING" },
                tips: { type: "STRING" },
                phrases: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            original: { type: "STRING" },
                            phonetic: { type: "STRING" },
                            english: { type: "STRING" }
                        },
                        required: ["original", "english"]
                    }
                }
            },
            required: ["language", "phrases"]
        }
    };
};

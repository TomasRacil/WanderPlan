import JSZip from 'jszip';

export const exportTripToZip = async (tripData) => {
    try {
        const zip = new JSZip();
        // Ensure we save the full structure
        const dataToSave = {
            version: 5,
            timestamp: new Date().toISOString(),
            ...tripData
        };

        zip.file("trip_data.json", JSON.stringify(dataToSave, null, 2));

        const content = await zip.generateAsync({ type: "blob" });
        return content;
    } catch (error) {
        console.error("Failed to zip trip", error);
        throw new Error("Failed to create backup archive.");
    }
};

export const parseTripFromZip = async (file) => {
    try {
        if (file.name.endsWith('.zip')) {
            const zip = new JSZip();
            const unzipped = await zip.loadAsync(file);
            const jsonFile = unzipped.file("trip_data.json");
            if (jsonFile) {
                const content = await jsonFile.async("string");
                return JSON.parse(content);
            } else {
                throw new Error("Invalid archive: trip_data.json not found.");
            }
        } else {
            // Legacy JSON support
            const text = await file.text();
            return JSON.parse(text);
        }
    } catch (error) {
        console.error("Failed to parse trip", error);
        throw error;
    }
};

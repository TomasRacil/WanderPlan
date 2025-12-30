export const generateId = (prefix = 'id') => {
    let uuid;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        uuid = crypto.randomUUID();
    } else {
        // Fallback for environments without crypto.randomUUID
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    return prefix ? `${prefix}-${uuid}` : uuid;
};

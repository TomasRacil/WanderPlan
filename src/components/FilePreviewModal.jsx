import React from 'react';
import { Modal } from './CommonUI';

export const FilePreviewModal = ({ file, onClose }) => {
    const [blobUrl, setBlobUrl] = React.useState(null);

    React.useEffect(() => {
        if (!file || !file.data) {
            setBlobUrl(null);
            return;
        }

        try {
            // Convert Data URI to Blob to avoid size limits/iframe restrictions
            const parts = file.data.split(',');
            // Handle raw base64 or data URI
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : file.type;
            const bstr = atob(parts[1] || parts[0]); // fallback if no prefix
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);

            return () => URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Failed to create blob from data URI:", e);
            setBlobUrl(null);
        }
    }, [file]);

    if (!file) return null;

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    return (
        <Modal isOpen={!!file} onClose={onClose} title={file.name} maxWidth="max-w-5xl">
            <div className="flex justify-center items-center min-h-[300px] h-full p-4 bg-slate-50 rounded-lg">
                {isImage && blobUrl && (
                    <img src={blobUrl} alt={file.name} className="max-w-full max-h-[75vh] object-contain rounded shadow-sm" />
                )}
                {isPDF && blobUrl && (
                    <iframe
                        src={blobUrl}
                        title={file.name}
                        width="100%"
                        height="600px"
                        className="rounded-lg border border-slate-200 shadow-sm bg-white"
                    />
                )}
                {(!blobUrl || (!isImage && !isPDF)) && (
                    <div className="text-center py-10">
                        <p className="text-slate-500 mb-6 font-medium">
                            {blobUrl ? "Preview not available for this file type." : "Preview could not be generated."}
                        </p>
                        <a
                            href={file.data}
                            download={file.name}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-all inline-flex items-center gap-2"
                        >
                            Download File
                        </a>
                    </div>
                )}
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                <a
                    href={file.data}
                    download={file.name}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-bold transition-colors"
                >
                    Download Original
                </a>
            </div>
        </Modal>
    );
};

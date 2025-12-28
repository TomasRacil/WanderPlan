import React from 'react';
import { Modal } from './CommonUI';

export const FilePreviewModal = ({ file, onClose }) => {
    if (!file) return null;

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    return (
        <Modal isOpen={!!file} onClose={onClose} title={file.name} maxWidth="max-w-5xl">
            <div className="flex justify-center items-center min-h-[300px] h-full p-4 bg-slate-50 rounded-lg">
                {isImage && (
                    <img src={file.data} alt={file.name} className="max-w-full max-h-[75vh] object-contain rounded shadow-sm" />
                )}
                {isPDF && (
                    <iframe
                        src={file.data}
                        title={file.name}
                        width="100%"
                        height="600px"
                        className="rounded-lg border border-slate-200 shadow-sm bg-white"
                    />
                )}
                {!isImage && !isPDF && (
                    <div className="text-center py-10">
                        <p className="text-slate-500 mb-6">Preview not available for this file type.</p>
                        <a
                            href={file.data}
                            download={file.name}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-all"
                        >
                            Download File
                        </a>
                    </div>
                )}
            </div>
        </Modal>
    );
};

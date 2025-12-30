import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "danger" }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="space-y-4">
            <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
            <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={onClose} className="px-6">{cancelText}</Button>
                <Button variant={variant} onClick={() => { onConfirm(); onClose(); }} className="px-6">{confirmText}</Button>
            </div>
        </div>
    </Modal>
);

'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './confirm-dialog.css';

/**
 * A confirmation modal, used instead of the browser's confirm() popup.
 * Esc or clicking outside cancels; the confirm button gets focus so Enter confirms.
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, busy, onConfirm, onClose }: {
    open: boolean;
    title: string;
    message?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    busy?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        confirmRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, busy, onClose]);

    if (!open) return null;

    return (
        <div className="confirm-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
            <div className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
                <button type="button" className="confirm-x" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
                <span className={`confirm-icon${danger ? ' danger' : ''}`}><AlertTriangle size={22} /></span>
                <h2 id="confirm-title">{title}</h2>
                {message && <div className="confirm-msg">{message}</div>}
                <div className="confirm-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{cancelLabel}</button>
                    <button ref={confirmRef} type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
                        {busy ? <div className="spinner" /> : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

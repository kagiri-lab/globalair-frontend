'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Modal, Field, money } from '@/components/ops/ui';

export const PAYMENT_METHODS: [string, string][] = [['bank_transfer', 'Bank transfer'], ['card', 'Card'], ['cash', 'Cash'], ['other', 'Other']];
export const methodLabel = (m?: string | null) => PAYMENT_METHODS.find(([v]) => v === m)?.[1] || m || '';

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
const today = () => new Date().toISOString().slice(0, 10);

/** Record that an invoice or statement was paid (posts to `endpoint`) */
export default function RecordPaymentModal({ open, onClose, endpoint, title, amount, onDone }: {
    open: boolean; onClose: () => void; endpoint: string; title: string; amount: number | string; onDone: () => void;
}) {
    const [method, setMethod] = useState('bank_transfer');
    const [reference, setReference] = useState('');
    const [paidAt, setPaidAt] = useState(today);
    const [receipt, setReceipt] = useState(true);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const res = await api.post(endpoint, { method, reference, paid_at: paidAt, send_receipt: receipt });
            toast.success(res.data.message);
            setReference('');
            onDone();
            onClose();
        } catch (err) {
            toast.error(errMsg(err, 'Could not record the payment'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={title} subtitle={`Amount: ${money(amount)}`} width={460}
            footer={<>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <div className="spinner" /> : 'Mark as paid'}</button>
            </>}>
            <div className="o-stack">
                <Field label="Paid by">
                    <div className="orp-methods" role="radiogroup">
                        {PAYMENT_METHODS.map(([v, l]) => (
                            <button key={v} type="button" role="radio" aria-checked={method === v} className={method === v ? 'active' : ''} onClick={() => setMethod(v)}>{l}</button>
                        ))}
                    </div>
                </Field>
                <Field label="Reference" hint={method === 'bank_transfer' ? 'The bank’s transaction reference' : method === 'card' ? 'The card receipt or approval number' : 'Optional'}>
                    <input className="input" value={reference} onChange={e => setReference(e.target.value)} maxLength={120} placeholder={method === 'cash' ? 'e.g. Receipt book no. 0412' : 'e.g. FT2410081234'} />
                </Field>
                <Field label="Date paid">
                    <input className="input" type="date" value={paidAt} max={today()} onChange={e => setPaidAt(e.target.value)} />
                </Field>
                <label className="o-check">
                    <input type="checkbox" checked={receipt} onChange={e => setReceipt(e.target.checked)} /> Email a receipt to the customer
                </label>
            </div>
        </Modal>
    );
}

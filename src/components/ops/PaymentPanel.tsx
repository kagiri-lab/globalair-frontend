'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wallet, Send, FileText, CheckCircle2, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getPdf } from '@/lib/pdf';
import { Panel, StatusBadge, KeyValues, money, fmtDate } from '@/components/ops/ui';
import ConfirmDialog from '@/components/ConfirmDialog';
import RecordPaymentModal, { methodLabel } from './RecordPaymentModal';

type Shipment = {
    id: string; status: string; total_price: number | string; billing?: 'prepaid' | 'monthly'; payment_status?: 'unpaid' | 'paid' | 'on_account';
    invoice_number?: string; invoice_sent_at?: string | null; paid_at?: string | null; payment_method?: string | null; payment_reference?: string | null;
    statement_id?: string | null; statement_number?: string | null; statement_status?: string | null;
};

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

/** Ops shipment page: is it paid, and the actions to get it paid */
export default function PaymentPanel({ shipment: s, canManage, onChanged }: { shipment: Shipment; canManage: boolean; onChanged: () => void }) {
    const [paying, setPaying] = useState(false);
    const [sending, setSending] = useState(false);
    const [undo, setUndo] = useState(false);
    const [undoing, setUndoing] = useState(false);

    const monthly = s.billing === 'monthly';
    const paid = s.payment_status === 'paid';
    const early = ['pending', 'draft'].includes(s.status);
    const closed = ['cancelled', 'failed'].includes(s.status);

    const badge = paid ? <StatusBadge status="paid" label="Paid" tone="success" />
        : monthly ? <StatusBadge status="on_account" label={s.statement_number ? 'On statement' : 'On account'} tone="info" />
            : early ? <StatusBadge status="unpaid" label="Invoiced when confirmed" tone="neutral" />
                : <StatusBadge status="unpaid" label="Payment due" tone="danger" />;

    const sendInvoice = async () => {
        setSending(true);
        try {
            const res = await api.post(`/admin/shipments/${s.id}/invoice/send`);
            toast.success(res.data.message);
            onChanged();
        } catch (err) {
            toast.error(errMsg(err, 'Could not send the invoice'));
        } finally {
            setSending(false);
        }
    };

    const clearPayment = async () => {
        setUndoing(true);
        try {
            const res = await api.delete(`/admin/shipments/${s.id}/payment`);
            toast.success(res.data.message);
            setUndo(false);
            onChanged();
        } catch (err) {
            toast.error(errMsg(err, 'Could not undo the payment'));
        } finally {
            setUndoing(false);
        }
    };

    const rows: [React.ReactNode, React.ReactNode][] = [
        ['Billing', monthly ? 'Monthly invoice' : 'Pays before pickup'],
        ['Amount', <strong key="a">{money(s.total_price)}</strong>],
    ];
    if (paid) {
        rows.push(['Paid', fmtDate(s.paid_at)]);
        if (s.payment_method) rows.push(['Method', methodLabel(s.payment_method)]);
        if (s.payment_reference) rows.push(['Reference', s.payment_reference]);
    } else if (!monthly && !early) {
        rows.push(['Invoice', s.invoice_sent_at ? `Emailed ${fmtDate(s.invoice_sent_at, true)}` : 'Not emailed yet']);
    }
    if (s.statement_number) rows.push(['Statement', <Link key="st" href="/ops/billing?tab=statements">{s.statement_number}</Link>]);

    return (
        <Panel title="Payment" icon={Wallet} actions={badge}>
            <KeyValues rows={rows} />

            {!monthly && !paid && !early && !closed && (
                <p className="opp-note">Invoice {s.invoice_number} must be paid before pickup.</p>
            )}
            {monthly && !paid && !s.statement_number && (
                <p className="opp-note muted">Goes on the customer’s statement at the start of next month.</p>
            )}

            <div className="opp-actions">
                {canManage && !paid && !monthly && !closed && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setPaying(true)}><CheckCircle2 size={14} /> Mark as paid</button>
                )}
                {canManage && !monthly && !early && !closed && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={sendInvoice} disabled={sending}>
                        {sending ? <div className="spinner" /> : <><Send size={14} /> {s.invoice_sent_at ? 'Resend invoice' : 'Email invoice'}</>}
                    </button>
                )}
                <button type="button" className="btn btn-secondary btn-sm"
                    onClick={async () => { if (!(await getPdf(`/admin/shipments/${s.id}/invoice?view=1`, { filename: `Invoice-${s.invoice_number}.pdf`, open: true }))) toast.error('Could not open the invoice'); }}>
                    <FileText size={14} /> View invoice
                </button>
                {canManage && paid && !s.statement_id && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUndo(true)}><Undo2 size={14} /> Undo payment</button>
                )}
            </div>

            <RecordPaymentModal open={paying} onClose={() => setPaying(false)} endpoint={`/admin/shipments/${s.id}/payment`}
                title={`Record payment for ${s.invoice_number}`} amount={s.total_price} onDone={onChanged} />
            <ConfirmDialog open={undo} title="Undo this payment?" danger busy={undoing} confirmLabel="Undo payment"
                message="The invoice goes back to unpaid. Use this if the payment was recorded by mistake."
                onConfirm={clearPayment} onClose={() => setUndo(false)} />
        </Panel>
    );
}

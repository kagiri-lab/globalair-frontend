'use client';

import { useEffect, useState } from 'react';
import { Landmark, Save, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getPdf } from '@/lib/pdf';
import { Panel, Field, Loader } from '@/components/ops/ui';

type Billing = {
    bank_name: string; account_name: string; account_number: string; iban: string; swift: string; branch: string; bank_address: string;
    other_instructions: string; tax_id: string; registration_no: string; statement_terms_days: number; invoice_note: string;
};

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

/** Settings → Business: how customers pay, shown on every invoice, statement and billing email */
export default function BillingDetailsPanel({ canEdit }: { canEdit: boolean }) {
    const [value, setValue] = useState<Billing | null>(null);
    const [saved, setSaved] = useState('');
    const [saving, setSaving] = useState(false);
    const [denied, setDenied] = useState(false);

    useEffect(() => {
        api.get('/admin/billing/settings')
            .then(r => { setValue(r.data.data); setSaved(JSON.stringify(r.data.data)); })
            .catch(err => { if (err?.response?.status === 403) setDenied(true); else toast.error('Could not load billing details'); });
    }, []);

    if (denied) return null;   // only staff who handle billing see this
    if (!value) return <Panel title="Billing & payment details" icon={Landmark}><Loader /></Panel>;

    const dirty = JSON.stringify(value) !== saved;
    const set = (k: keyof Billing, v: string | number) => setValue(b => (b ? { ...b, [k]: v } : b));
    const text = (k: keyof Billing, label: string, placeholder = '', hint?: string) => (
        <Field label={label} hint={hint}>
            <input className="input" value={String(value[k] ?? '')} disabled={!canEdit} placeholder={placeholder} onChange={e => set(k, e.target.value)} />
        </Field>
    );

    const save = async () => {
        setSaving(true);
        try {
            const res = await api.put('/admin/billing/settings', value);
            setValue(res.data.data);
            setSaved(JSON.stringify(res.data.data));
            toast.success(res.data.message);
        } catch (err) {
            toast.error(errMsg(err, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    const preview = async () => {
        if (dirty) toast('Save first to see your changes on the invoice');
        if (!(await getPdf('/admin/billing/preview?view=1', { filename: 'Invoice-preview.pdf', open: true }))) toast.error('Book a shipment first to preview an invoice');
    };

    const noBank = !value.bank_name && !value.account_number && !value.iban;

    return (
        <Panel title="Billing & payment details" icon={Landmark}
            subtitle="Printed on invoices and statements, and in billing emails, so customers know how to pay."
            actions={<>
                <button type="button" className="btn btn-secondary btn-sm" onClick={preview}><FileText size={14} /> Preview invoice</button>
                {canEdit && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving}>
                        {saving ? <div className="spinner" /> : <><Save size={14} /> {dirty ? 'Save' : 'Saved'}</>}
                    </button>
                )}
            </>}>
            {noBank && <p className="obd-warn">Add your bank details so customers know where to send payment. Until then invoices only say the amount and when it’s due.</p>}

            <h3 className="obd-h">Bank transfer</h3>
            <div className="o-form-grid">
                {text('bank_name', 'Bank', 'e.g. Dahabshil Bank International')}
                {text('account_name', 'Account name', 'e.g. Global Air Cargo & Logistics Ltd')}
                {text('account_number', 'Account number')}
                {text('iban', 'IBAN', 'If your bank uses one')}
                {text('swift', 'SWIFT / BIC')}
                {text('branch', 'Branch')}
                <Field label="Bank address" full>
                    <input className="input" value={value.bank_address} disabled={!canEdit} onChange={e => set('bank_address', e.target.value)} />
                </Field>
                <Field label="Other ways to pay" hint="e.g. card or cash at our offices. Shown under the bank details." full>
                    <textarea className="input" rows={2} value={value.other_instructions} disabled={!canEdit} onChange={e => set('other_instructions', e.target.value)}
                        placeholder="Card and cash payments are accepted at our Nairobi and Mogadishu offices." />
                </Field>
            </div>

            <h3 className="obd-h">On invoices</h3>
            <div className="o-form-grid">
                {text('tax_id', 'Tax / VAT number', '', 'Shown under your company details')}
                {text('registration_no', 'Company registration number')}
                <Field label="Days to pay a monthly statement" hint="The due date printed on statements">
                    <input className="input" type="number" min={0} max={120} value={value.statement_terms_days} disabled={!canEdit}
                        onChange={e => set('statement_terms_days', Number(e.target.value))} />
                </Field>
                {text('invoice_note', 'Note at the bottom', 'Thank you for your business.')}
            </div>
        </Panel>
    );
}

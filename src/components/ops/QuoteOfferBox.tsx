'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, Plane, Ship, Truck, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Field, Segmented, money } from '@/components/ops/ui';

type Mode = 'air' | 'sea' | 'road';
export interface QuoteOffer {
    amount: number; transport_mode: Mode; days: number | null; note: string;
    valid_until: string; status: 'sent' | 'accepted' | 'declined'; sent_at: string; responded_at?: string;
}

const MODE_FROM_LABEL: Record<string, Mode> = { 'Air freight': 'air', 'Sea freight': 'sea', 'Road freight': 'road' };
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);

/** Staff send the customer a price; the customer accepts (and books) or declines it in their Support Hub */
export default function QuoteOfferBox({ ticketId, details, canBook, onSent }: {
    ticketId: string; details: Record<string, any>; canBook: boolean; onSent: () => void;
}) {
    const offer: QuoteOffer | undefined = details.offer;
    const [editing, setEditing] = useState(!offer || offer.status === 'declined');
    const [amount, setAmount] = useState(offer ? String(offer.amount) : '');
    const [mode, setMode] = useState<Mode>(offer?.transport_mode || details.booking?.transport_mode || MODE_FROM_LABEL[details.transport_mode] || 'air');
    const [days, setDays] = useState(offer?.days ? String(offer.days) : '');
    const [validDays, setValidDays] = useState('14');
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const expired = offer?.status === 'sent' && offer.valid_until < today();

    const send = async () => {
        if (!(Number(amount) > 0)) { toast.error('Enter the price'); return; }
        setSending(true);
        try {
            await api.post(`/admin/support/tickets/${ticketId}/offer`, { amount: Number(amount), transport_mode: mode, days: days ? Number(days) : null, valid_days: Number(validDays) || 14, note });
            toast.success('Price sent. The customer can accept it from their Support Hub.');
            setEditing(false);
            setNote('');
            onSent();
        } catch (err) {
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not send the price');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="oqo">
            {offer && !editing && (
                <div className={`oqo-status ${expired ? 'expired' : offer.status}`}>
                    {offer.status === 'accepted' ? <CheckCircle2 size={18} /> : offer.status === 'declined' ? <XCircle size={18} /> : <Clock size={18} />}
                    <div>
                        <strong>{money(offer.amount)} by {offer.transport_mode}{offer.days ? ` · ~${offer.days} days` : ''}</strong>
                        <small>
                            {offer.status === 'accepted' ? 'Accepted by the customer'
                                : offer.status === 'declined' ? 'Declined by the customer'
                                    : expired ? `Expired ${fmtDay(offer.valid_until)}` : `Sent · waiting for the customer · valid until ${fmtDay(offer.valid_until)}`}
                        </small>
                    </div>
                </div>
            )}

            {offer?.status === 'accepted' && (
                <Link href={`/ops/shipments/new?quote=${ticketId}`} className="btn btn-primary btn-full">Book it now <ArrowRight size={15} /></Link>
            )}

            {editing ? (
                <div className="oqo-form">
                    <div className="o-form-grid">
                        <Field label="Price (USD)"><input className="input" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" autoFocus /></Field>
                        <Field label="Transit (days)" hint="Optional"><input className="input" inputMode="numeric" value={days} onChange={e => setDays(e.target.value.replace(/\D/g, ''))} /></Field>
                    </div>
                    <div>
                        <span className="o-field-label">Transport</span>
                        <Segmented value={mode} onChange={setMode} options={[
                            { value: 'air', label: <><Plane size={13} /> Air</> }, { value: 'sea', label: <><Ship size={13} /> Sea</> }, { value: 'road', label: <><Truck size={13} /> Road</> },
                        ]} />
                    </div>
                    <Field label="Note for the customer" hint="Optional, e.g. what’s included">
                        <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Includes customs clearance and delivery to the door." />
                    </Field>
                    <Field label="Valid for (days)">
                        <input className="input" inputMode="numeric" value={validDays} onChange={e => setValidDays(e.target.value.replace(/\D/g, ''))} style={{ width: 90 }} />
                    </Field>
                    <p className="o-field-hint">{canBook
                        ? 'The customer can accept and book it themselves; the shipment is created at this price.'
                        : 'This request came without full booking details, so when the customer accepts, you’ll be asked to book it.'}</p>
                    <div className="o-row" style={{ gap: '0.5rem' }}>
                        <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>
                            {sending ? <div className="spinner" /> : <><Send size={15} /> Send price to customer</>}
                        </button>
                        {offer && <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>}
                    </div>
                </div>
            ) : offer?.status !== 'accepted' && (
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setEditing(true)}>
                    <Send size={15} /> {offer?.status === 'sent' && !expired ? 'Send a new price' : 'Send a price'}
                </button>
            )}
        </div>
    );
}

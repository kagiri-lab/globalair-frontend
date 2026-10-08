'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plane, Ship, Truck, CheckCircle2, Clock, XCircle, MapPin, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import './quote-offer.css';

const MODE_ICON = { air: Plane, sea: Ship, road: Truck } as const;
const money = (n: number) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });

/** The price customer care sent for this quote: accept (and book) or decline it, right here */
export default function QuoteOfferCard({ ticket, onChanged }: { ticket: any; onChanged: () => void }) {
    const d = ticket.quote_details || {};
    const offer = d.offer;
    const [step, setStep] = useState<'' | 'accept' | 'decline'>('');
    const [pickup, setPickup] = useState(d.pickup_address || '');
    const [delivery, setDelivery] = useState(d.dropoff_address || '');
    const [recipient, setRecipient] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    if (!offer || ticket.shipment) return null;
    const expired = offer.status === 'sent' && offer.valid_until < new Date().toISOString().slice(0, 10);
    const Icon = MODE_ICON[offer.transport_mode as keyof typeof MODE_ICON] || Plane;

    const respond = async (action: 'accept' | 'decline') => {
        if (action === 'accept' && ticket.can_book && (pickup.trim().length < 5 || delivery.trim().length < 5)) {
            toast.error('Enter the full pickup and delivery addresses');
            return;
        }
        setBusy(true);
        try {
            const res = await api.post(`/support/${ticket.id}/offer`, action === 'accept'
                ? { action, pickup_address: pickup, destination_address: delivery, destination_contact_name: recipient, destination_contact_phone: recipientPhone }
                : { action, reason });
            toast.success(res.data.message);
            setStep('');
            onChanged();
        } catch (err) {
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    // Accepted or declined: a short note instead of the buttons
    if (offer.status !== 'sent' || expired) {
        const tone = expired ? 'expired' : offer.status;
        return (
            <div className={`qof qof-done ${tone}`}>
                {offer.status === 'accepted' ? <CheckCircle2 size={20} /> : offer.status === 'declined' ? <XCircle size={20} /> : <Clock size={20} />}
                <p>
                    {offer.status === 'accepted' && <>You accepted <b>{money(offer.amount)}</b>. Our team is booking it and will send your tracking number here.</>}
                    {offer.status === 'declined' && <>You declined the price of <b>{money(offer.amount)}</b>. Reply below if you’d like us to look at it again.</>}
                    {expired && <>The price of <b>{money(offer.amount)}</b> expired on {fmtDay(offer.valid_until)}. Reply below and we’ll send you an updated one.</>}
                </p>
            </div>
        );
    }

    return (
        <div className="qof">
            <div className="qof-head">
                <span className="qof-icon"><Icon size={22} /></span>
                <div className="qof-title">
                    <small>Your quote is ready</small>
                    <strong>{money(offer.amount)}</strong>
                    <span>by {offer.transport_mode}{offer.days ? ` · about ${offer.days} days in transit` : ''} · valid until {fmtDay(offer.valid_until)}</span>
                </div>
            </div>
            {offer.note && <p className="qof-note">{offer.note}</p>}
            <div className="qof-route">
                <span><MapPin size={14} /> {[d.pickup_city, d.pickup_region].filter(Boolean).join(', ')}</span>
                <span><Flag size={14} /> {[d.dropoff_city, d.dropoff_region].filter(Boolean).join(', ')}</span>
            </div>

            {step === 'accept' ? (
                <div className="qof-form">
                    {ticket.can_book ? (
                        <>
                            <label>Pickup address<input className="input" value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Building, street, area" /></label>
                            <label>Delivery address<input className="input" value={delivery} onChange={e => setDelivery(e.target.value)} placeholder="Building, street, area" /></label>
                            <div className="qof-two">
                                <label>Recipient name <em>optional</em><input className="input" value={recipient} onChange={e => setRecipient(e.target.value)} /></label>
                                <label>Recipient phone <em>optional</em><input className="input" type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} /></label>
                            </div>
                        </>
                    ) : <p className="qof-small">We’ll book it for you and send the tracking number here.</p>}
                    <div className="qof-actions">
                        <button type="button" className="btn btn-primary" onClick={() => respond('accept')} disabled={busy}>
                            {busy ? <div className="spinner" /> : ticket.can_book ? `Book for ${money(offer.amount)}` : `Accept ${money(offer.amount)}`}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setStep('')} disabled={busy}>Back</button>
                    </div>
                </div>
            ) : step === 'decline' ? (
                <div className="qof-form">
                    <label>Anything we should know? <em>optional</em>
                        <textarea className="input" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Too expensive, or I need it sooner" />
                    </label>
                    <div className="qof-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => respond('decline')} disabled={busy}>{busy ? <div className="spinner" /> : 'Decline price'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setStep('')} disabled={busy}>Back</button>
                    </div>
                </div>
            ) : (
                <div className="qof-actions">
                    <button type="button" className="btn btn-primary" onClick={() => setStep('accept')}>{ticket.can_book ? 'Accept & book' : 'Accept'}</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setStep('decline')}>Decline</button>
                    <Link href="#reply" className="qof-ask">Ask a question</Link>
                </div>
            )}
        </div>
    );
}

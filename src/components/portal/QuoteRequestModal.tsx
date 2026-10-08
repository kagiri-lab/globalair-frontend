'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { X, Send, CheckCircle2, MapPin, Flag, Package, ClipboardCheck, ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import './quote-request.css';

const required = (label: string) => z.string().trim().min(1, `${label} is required`);

const schema = z.object({
    pickup_city: required('Pickup city'),
    pickup_region: required('Pickup country'),
    pickup_address: z.string().trim().optional(),
    dropoff_city: required('Drop-off city'),
    dropoff_region: required('Drop-off country'),
    dropoff_address: z.string().trim().optional(),
    transport_mode: z.string().optional(),
    commodity: required('What you are shipping'),
    weight: z.string().trim().optional(),
    dimensions: z.string().trim().optional(),
    pickup_date: z.string().optional(),
    delivery_date: z.string().optional(),
    phone: z.string().trim().optional(),
    company: z.string().trim().optional(),
    message: z.string().trim().optional(),
});
type FormData = z.infer<typeof schema>;

/** Booking-form selections sent along so customer care can turn the quote straight into a shipment */
export type QuoteBooking = {
    origin_country_id?: string; origin_id?: string; destination_country_id?: string; destination_id?: string;
    transport_mode?: string; shipment_type?: string; items?: Record<string, unknown>[];
};

/** Shipment details already known (e.g. from the booking form), used to pre-fill the request */
export type QuotePrefill = Partial<Omit<FormData, 'phone' | 'company'>> & { items?: string; booking?: QuoteBooking };

type FieldDef = { name: keyof FormData; label: string; type?: string; placeholder?: string; full?: boolean };

const STEPS = [
    { title: 'Route', icon: MapPin, blurb: 'Where is it going?', fields: ['pickup_city', 'pickup_region', 'pickup_address', 'dropoff_city', 'dropoff_region', 'dropoff_address'] },
    { title: 'Cargo', icon: Package, blurb: 'What are we moving?', fields: ['commodity', 'weight', 'dimensions', 'transport_mode', 'pickup_date', 'delivery_date'] },
    { title: 'Review', icon: ClipboardCheck, blurb: 'Check and send', fields: ['phone', 'company', 'message'] },
] as const;

const PICKUP: FieldDef[] = [
    { name: 'pickup_city', label: 'City *' },
    { name: 'pickup_region', label: 'Country *' },
    { name: 'pickup_address', label: 'Street address', placeholder: 'Optional', full: true },
];

const DROPOFF: FieldDef[] = [
    { name: 'dropoff_city', label: 'City *' },
    { name: 'dropoff_region', label: 'Country *' },
    { name: 'dropoff_address', label: 'Street address', placeholder: 'Optional', full: true },
];

const CARGO: FieldDef[] = [
    { name: 'commodity', label: 'What are you shipping? *', placeholder: 'e.g. Medical supplies', full: true },
    { name: 'weight', label: 'Total weight', placeholder: 'e.g. 250 kg' },
    { name: 'dimensions', label: 'Dimensions', placeholder: 'L × W × H cm' },
];

const DATES: FieldDef[] = [
    { name: 'pickup_date', label: 'Preferred pickup', type: 'date' },
    { name: 'delivery_date', label: 'Needed by', type: 'date' },
];

const MODES = [
    { value: '', label: 'Not sure' },
    { value: 'Air freight', label: 'Air' },
    { value: 'Sea freight', label: 'Sea' },
    { value: 'Road freight', label: 'Road' },
];

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

// Mounted only while open, so every opening starts from a fresh form filled from the booking
export default function QuoteRequestModal({ open, ...props }: { open: boolean; onClose: () => void; prefill?: QuotePrefill }) {
    if (!open || typeof document === 'undefined') return null;
    return <QuoteRequestDrawer {...props} />;
}

function QuoteRequestDrawer({ onClose, prefill }: { onClose: () => void; prefill?: QuotePrefill }) {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [sentId, setSentId] = useState('');
    const sent = !!sentId;
    const [closing, setClosing] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const { items, booking, ...known } = prefill || {};
    const { register, handleSubmit, trigger, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { transport_mode: '', ...known, phone: user?.phone || '' },
    });
    const v = watch();

    // Let the panel slide out before unmounting
    const close = useCallback(() => {
        setClosing(true);
        setTimeout(onClose, 200);
    }, [onClose]);

    // Close on Escape and stop the page behind from scrolling
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); };
    }, [close]);

    const goTo = (n: number) => {
        setStep(n);
        bodyRef.current?.scrollTo({ top: 0 });
    };

    const next = async () => {
        if (await trigger([...STEPS[step].fields])) goTo(step + 1);
    };

    const onSubmit = async (d: FormData) => {
        try {
            const res = await api.post('/support/quotes', { ...d, items, booking });
            setSentId(res.data.data.id);
        } catch (err) {
            const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast.error(message || 'Could not send your request. Please try again.');
        }
    };

    const field = (f: FieldDef) => (
        <div key={f.name} className={f.full ? 'qr-full' : ''}>
            <label className="label" htmlFor={`qr-${f.name}`}>{f.label}</label>
            <input
                id={`qr-${f.name}`}
                type={f.type || 'text'}
                placeholder={f.placeholder}
                className={`input${errors[f.name] ? ' error' : ''}`}
                {...register(f.name)}
            />
            {errors[f.name] && <p className="field-error">{errors[f.name]?.message}</p>}
        </div>
    );

    const place = (city?: string, country?: string, address?: string) => (
        <>
            <strong>{[city, country].filter(Boolean).join(', ') || '—'}</strong>
            {address && <small>{address}</small>}
        </>
    );

    const isLast = step === STEPS.length - 1;

    return createPortal(
        <div className={`qr-backdrop${closing ? ' closing' : ''}`} onClick={close}>
            <aside className="qr-drawer" role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={e => e.stopPropagation()}>
                <header className="qr-head">
                    <div>
                        <h2 id="qr-title">{sent ? 'Quote request sent' : 'Request a quote'}</h2>
                        {!sent && <p>We’ll price it and reply, usually within one business day.</p>}
                    </div>
                    <button type="button" className="qr-close" onClick={close} aria-label="Close"><X size={18} /></button>
                </header>

                {sent ? (
                    <div className="qr-done">
                        <span className="qr-done-icon"><CheckCircle2 size={40} /></span>
                        <h3>We’ve got your request</h3>
                        <p>It’s in your <strong>Support Hub</strong>. Our team will reply there with a price, and once you agree they’ll book the shipment for you.</p>
                        <div className="qr-done-actions">
                            <Link href={`/dashboard/support/${sentId}`} className="btn btn-primary">View request</Link>
                            <button type="button" className="btn btn-secondary" onClick={close}>Done</button>
                        </div>
                    </div>
                ) : (
                    <form className="qr-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                        {/* Stepper */}
                        <ol className="qr-steps">
                            {STEPS.map((s, i) => (
                                <li key={s.title} className={i === step ? 'active' : i < step ? 'done' : ''}>
                                    <button type="button" onClick={() => i < step && goTo(i)} disabled={i >= step}>
                                        <span className="qr-step-dot">{i < step ? <Check size={14} /> : i + 1}</span>
                                        <span className="qr-step-text"><strong>{s.title}</strong><small>{s.blurb}</small></span>
                                    </button>
                                </li>
                            ))}
                        </ol>

                        <div className="qr-body" ref={bodyRef}>
                            {step === 0 && (
                                <div className="qr-pane" key="route">
                                    <section className="qr-group">
                                        <h3><MapPin size={15} /> Pickup</h3>
                                        <div className="qr-grid">{PICKUP.map(field)}</div>
                                    </section>
                                    <section className="qr-group">
                                        <h3><Flag size={15} /> Drop-off</h3>
                                        <div className="qr-grid">{DROPOFF.map(field)}</div>
                                    </section>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="qr-pane" key="cargo">
                                    {items && (
                                        <div className="qr-items">
                                            <span>Items from your booking</span>
                                            <ul>{items.split('; ').map(it => <li key={it}>{it}</li>)}</ul>
                                        </div>
                                    )}
                                    <section className="qr-group">
                                        <h3><Package size={15} /> Cargo</h3>
                                        <div className="qr-grid">{CARGO.map(field)}</div>
                                    </section>
                                    <section className="qr-group">
                                        <h3>Transport</h3>
                                        <div className="qr-modes">
                                            {MODES.map(m => (
                                                <label key={m.value} className={(v.transport_mode || '') === m.value ? 'active' : ''}>
                                                    <input type="radio" value={m.value} {...register('transport_mode')} />
                                                    {m.label}
                                                </label>
                                            ))}
                                        </div>
                                    </section>
                                    <section className="qr-group">
                                        <h3>Dates <span className="qr-optional">optional</span></h3>
                                        <div className="qr-grid">{DATES.map(field)}</div>
                                    </section>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="qr-pane" key="review">
                                    <div className="qr-review">
                                        <div className="qr-review-head">
                                            <h3>Route</h3>
                                            <button type="button" onClick={() => goTo(0)}><Pencil size={13} /> Edit</button>
                                        </div>
                                        <div className="qr-review-route">
                                            <div><span><MapPin size={13} /> From</span>{place(v.pickup_city, v.pickup_region, v.pickup_address)}</div>
                                            <div><span><Flag size={13} /> To</span>{place(v.dropoff_city, v.dropoff_region, v.dropoff_address)}</div>
                                        </div>
                                    </div>
                                    <div className="qr-review">
                                        <div className="qr-review-head">
                                            <h3>Cargo</h3>
                                            <button type="button" onClick={() => goTo(1)}><Pencil size={13} /> Edit</button>
                                        </div>
                                        <dl>
                                            <dt>Shipping</dt><dd>{v.commodity}</dd>
                                            {v.weight && <><dt>Weight</dt><dd>{v.weight}</dd></>}
                                            {v.dimensions && <><dt>Dimensions</dt><dd>{v.dimensions}</dd></>}
                                            <dt>Transport</dt><dd>{v.transport_mode || 'Advise me'}</dd>
                                            {v.pickup_date && <><dt>Pickup</dt><dd>{fmtDate(v.pickup_date)}</dd></>}
                                            {v.delivery_date && <><dt>Needed by</dt><dd>{fmtDate(v.delivery_date)}</dd></>}
                                        </dl>
                                    </div>
                                    <section className="qr-group">
                                        <h3>Your details</h3>
                                        <div className="qr-grid">
                                            {field({ name: 'phone', label: 'Phone for this quote', type: 'tel' })}
                                            {field({ name: 'company', label: 'Company', placeholder: 'Optional' })}
                                            <div className="qr-full">
                                                <label className="label" htmlFor="qr-message">Anything else?</label>
                                                <textarea id="qr-message" className="input" rows={3} placeholder="Special handling, deadlines, customs notes…" {...register('message')} />
                                            </div>
                                        </div>
                                        <p className="qr-sender">Sending as <strong>{user?.name}</strong> · {user?.email}</p>
                                    </section>
                                </div>
                            )}
                        </div>

                        <footer className="qr-foot">
                            {step > 0
                                ? <button type="button" className="btn btn-secondary" onClick={() => goTo(step - 1)}><ArrowLeft size={15} /> Back</button>
                                : <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>}
                            {isLast
                                ? <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? <div className="spinner" /> : <>Send request <Send size={15} /></>}
                                </button>
                                : <button type="button" className="btn btn-primary" onClick={next}>Continue <ArrowRight size={15} /></button>}
                        </footer>
                    </form>
                )}
            </aside>
        </div>,
        document.body,
    );
}

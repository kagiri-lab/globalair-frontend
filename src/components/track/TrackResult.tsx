'use client';

import Link from 'next/link';
import {
    Check, CheckCircle, Clock, Copy, ExternalLink, FileText, Flag, LifeBuoy, MapPin, MessageCircle, Package,
    Phone, Plane, RefreshCw, Share2, Ship, Truck, XCircle, Calendar, Navigation,
} from 'lucide-react';
import { useSiteContact } from '@/components/SiteInfoProvider';
import { telHref } from '@/lib/siteInfo';
import './track-result.css';

export interface TrackEvent {
    id: string;
    status?: string;
    title: string;
    location?: string;
    description?: string;
    event_time: string;
    attribution?: string | null; // required credit when an update came from a partner's tracking data
}

export interface TrackData {
    shipment: {
        tracking_number: string;
        status: string;
        shipment_type?: string;
        transport_mode?: string;
        pickup_city: string;
        pickup_country: string;
        destination_city: string;
        destination_country: string;
        estimated_delivery?: string;
        created_at?: string;
        picked_up_at?: string;
        delivered_at?: string;
    };
    events: TrackEvent[];
}

type Tone = 'warning' | 'progress' | 'success' | 'danger';

const STATUS: Record<string, { label: string; tone: Tone; headline: (to: string) => string; blurb: string }> = {
    pending: { label: 'Pending', tone: 'warning', headline: () => 'Booking received', blurb: 'Your shipment is booked and waiting for our team to confirm it.' },
    confirmed: { label: 'Confirmed', tone: 'progress', headline: () => 'Confirmed for pickup', blurb: 'Your shipment is confirmed and scheduled for collection.' },
    picked_up: { label: 'Picked up', tone: 'progress', headline: () => 'Picked up', blurb: 'We’ve collected your shipment and it’s heading to our hub.' },
    in_transit: { label: 'In transit', tone: 'progress', headline: to => `In transit to ${to}`, blurb: 'Your shipment is on its way to the destination.' },
    out_for_delivery: { label: 'Out for delivery', tone: 'progress', headline: to => `Out for delivery in ${to}`, blurb: 'Our courier has your shipment and will deliver it soon.' },
    delivered: { label: 'Delivered', tone: 'success', headline: to => `Delivered in ${to}`, blurb: 'Your shipment has been delivered. Thank you for shipping with us.' },
    cancelled: { label: 'Cancelled', tone: 'danger', headline: () => 'Shipment cancelled', blurb: 'This shipment was cancelled. Contact us if you think this is a mistake.' },
    failed: { label: 'Delivery failed', tone: 'danger', headline: () => 'Delivery unsuccessful', blurb: 'We couldn’t complete this delivery. Please contact us to arrange another attempt.' },
};

const MILESTONES = [
    { status: 'pending', label: 'Booked' },
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'picked_up', label: 'Picked up' },
    { status: 'in_transit', label: 'In transit' },
    { status: 'out_for_delivery', label: 'Out for delivery' },
    { status: 'delivered', label: 'Delivered' },
];

// How far along the route bar the vehicle sits for each status
const PROGRESS: Record<string, number> = { pending: 4, confirmed: 14, picked_up: 32, in_transit: 60, out_for_delivery: 84, delivered: 100 };

const MODE_ICON: Record<string, typeof Plane> = { air: Plane, sea: Ship, road: Truck };

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;

function dayLabel(iso: string) {
    const diff = Math.round((dayStart(new Date()) - dayStart(new Date(iso))) / DAY);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' });
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
const fmtShort = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '');
const fmtLong = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function etaHint(iso: string) {
    const days = Math.round((dayStart(new Date(iso)) - dayStart(new Date())) / DAY);
    if (days > 1) return `in ${days} days`;
    if (days === 1) return 'tomorrow';
    if (days === 0) return 'today';
    return 'expected soon';
}

interface Props {
    data: TrackData;
    refreshing?: boolean;
    own?: { id: string } | null;
    /** Where "get help" goes — the portal support desk for signed-in customers, the contact page otherwise */
    helpHref?: string;
    onRefresh: () => void;
    onCopy: () => void;
}

export default function TrackResult({ data, refreshing, own, helpHref = '/contact', onRefresh, onCopy }: Props) {
    const contact = useSiteContact();
    const s = data.shipment;
    const cfg = STATUS[s.status] || STATUS.pending;
    const closed = cfg.tone === 'danger';
    const ModeIcon = MODE_ICON[s.transport_mode || 'air'] || Plane;
    const progress = PROGRESS[s.status] ?? 0;
    const currentIdx = MILESTONES.findIndex(m => m.status === s.status);
    // Newest first; events logged in the same instant fall back to journey order
    // (cancelled / failed are terminal, so they always count as the latest)
    const rank = (ev: TrackEvent) => (ev.status === 'cancelled' || ev.status === 'failed' ? 99 : MILESTONES.findIndex(m => m.status === ev.status));
    const attributions = [...new Set(data.events.map(e => e.attribution).filter((a): a is string => !!a))];
    const events = [...data.events].sort((a, b) => (+new Date(b.event_time) - +new Date(a.event_time)) || (rank(b) - rank(a)));

    // Date each milestone was reached: the first event with that status, falling back to the shipment's own timestamps
    const reachedAt = (status: string) => {
        const ev = [...events].reverse().find(e => e.status === status);
        if (ev) return ev.event_time;
        if (status === 'pending') return s.created_at;
        if (status === 'picked_up') return s.picked_up_at;
        if (status === 'delivered') return s.delivered_at;
        return undefined;
    };

    // Group the timeline by calendar day
    const groups: { label: string; events: TrackEvent[] }[] = [];
    for (const ev of events) {
        const label = dayLabel(ev.event_time);
        const last = groups[groups.length - 1];
        if (last && last.label === label) last.events.push(ev);
        else groups.push({ label, events: [ev] });
    }

    const shareText = `Track my Global Air Cargo shipment ${s.tracking_number}`;
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/track?q=${encodeURIComponent(s.tracking_number)}` : '';

    return (
        <div className={`tr fade-in${refreshing ? ' tr-refreshing' : ''}`}>
            {/* ── Hero ─────────────────────────────────────────────────── */}
            <section className={`tr-hero tone-${cfg.tone}`}>
                <div className="tr-hero-top">
                    <div className="tr-tn">
                        <span>Tracking number</span>
                        <button type="button" onClick={onCopy} title="Copy tracking link">
                            <strong>{s.tracking_number}</strong> <Copy size={14} />
                        </button>
                    </div>
                    <span className="tr-pill">
                        {cfg.tone === 'success' ? <CheckCircle size={15} /> : closed ? <XCircle size={15} /> : cfg.tone === 'warning' ? <Clock size={15} /> : <ModeIcon size={15} />}
                        {cfg.label}
                    </span>
                </div>

                <div className="tr-hero-main">
                    <div>
                        <h2>{cfg.headline(s.destination_city)}</h2>
                        <p>{cfg.blurb}</p>
                    </div>
                    {!closed && (
                        <div className="tr-eta">
                            {s.status === 'delivered' && s.delivered_at ? (
                                <>
                                    <span>Delivered</span>
                                    <strong>{new Date(s.delivered_at).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                                    <small>at {fmtTime(s.delivered_at)}</small>
                                </>
                            ) : s.estimated_delivery ? (
                                <>
                                    <span>Estimated delivery</span>
                                    <strong>{new Date(s.estimated_delivery).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                                    <small>{etaHint(s.estimated_delivery)}</small>
                                </>
                            ) : (
                                <>
                                    <span>Estimated delivery</span>
                                    <strong>To be confirmed</strong>
                                    <small>once your pickup is scheduled</small>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Route with progress */}
                <div className="tr-route">
                    <div className="tr-place">
                        <span><MapPin size={12} /> From</span>
                        <strong>{s.pickup_city}</strong>
                        <small>{s.pickup_country}</small>
                    </div>
                    <div className="tr-line" aria-label={`${progress}% of the journey complete`}>
                        <i className="tr-line-fill" style={{ width: `${closed ? 0 : progress}%` }} />
                        {!closed && (
                            <span className="tr-vehicle" style={{ left: `${progress}%` }}><ModeIcon size={16} /></span>
                        )}
                    </div>
                    <div className="tr-place end">
                        <span><Flag size={12} /> To</span>
                        <strong>{s.destination_city}</strong>
                        <small>{s.destination_country}</small>
                    </div>
                </div>
            </section>

            {/* ── Milestones ───────────────────────────────────────────── */}
            {!closed && (
                <ol className="tr-milestones" aria-label="Shipment milestones">
                    {MILESTONES.map((m, i) => {
                        const state = i < currentIdx ? 'done' : i === currentIdx ? (m.status === 'delivered' ? 'done' : 'current') : '';
                        const when = i <= currentIdx ? reachedAt(m.status) : undefined;
                        return (
                            <li key={m.status} className={state} aria-current={i === currentIdx ? 'step' : undefined}>
                                <span className="tr-ms-dot">{state === 'done' ? <Check size={13} /> : state === 'current' ? <i /> : null}</span>
                                <span className="tr-ms-text">
                                    <strong>{m.label}</strong>
                                    <small>{when ? fmtShort(when) : i === currentIdx + 1 ? 'Next' : ''}</small>
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            {/* ── Timeline + side panel ────────────────────────────────── */}
            <div className="tr-grid">
                <section className="tr-card">
                    <div className="tr-card-head">
                        <h3>Journey updates</h3>
                        <button type="button" onClick={onRefresh} disabled={refreshing} className="tr-link"><RefreshCw size={14} className={refreshing ? 'spinning' : ''} /> Refresh</button>
                    </div>
                    {groups.length === 0 ? (
                        <p className="tr-empty">No updates yet. You’ll see each step here as your shipment moves.</p>
                    ) : groups.map((g, gi) => (
                        <div key={g.label} className="tr-day">
                            <p className="tr-day-label">{g.label}</p>
                            <ol>
                                {g.events.map((ev, i) => {
                                    const latest = gi === 0 && i === 0;
                                    return (
                                        <li key={ev.id} className={latest ? 'latest' : ''}>
                                            <time dateTime={ev.event_time}>{fmtTime(ev.event_time)}</time>
                                            <span className="tr-ev-dot" />
                                            <div className="tr-ev">
                                                <p className="tr-ev-title">{ev.title} {latest && <em>Latest</em>}</p>
                                                {ev.location && <p className="tr-ev-loc"><MapPin size={13} /> {ev.location}</p>}
                                                {ev.description && <p className="tr-ev-desc">{ev.description}</p>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    ))}
                    {attributions.length > 0 && <p className="tr-attribution">{attributions.join(' · ')}</p>}
                </section>

                <aside className="tr-side">
                    <section className="tr-card">
                        <h3>Shipment details</h3>
                        <dl className="tr-details">
                            <dt><ModeIcon size={14} /> Transport</dt><dd style={{ textTransform: 'capitalize' }}>{s.transport_mode ? `${s.transport_mode} freight` : '—'}</dd>
                            {s.shipment_type && <><dt><Package size={14} /> Service</dt><dd style={{ textTransform: 'capitalize' }}>{s.shipment_type}</dd></>}
                            <dt><Calendar size={14} /> Booked</dt><dd>{fmtLong(s.created_at)}</dd>
                            {s.picked_up_at && <><dt><Navigation size={14} /> Picked up</dt><dd>{fmtLong(s.picked_up_at)}</dd></>}
                            <dt><Clock size={14} /> Last update</dt><dd>{events[0] ? `${fmtShort(events[0].event_time)}, ${fmtTime(events[0].event_time)}` : '—'}</dd>
                        </dl>
                        {own && (
                            <div className="tr-actions primary">
                                <Link href={`/shipments/${own.id}`} className="btn btn-primary btn-sm"><ExternalLink size={14} /> Full details</Link>
                                <Link href={`/shipments/${own.id}/invoice`} className="btn btn-secondary btn-sm"><FileText size={14} /> Invoice</Link>
                            </div>
                        )}
                        <div className="tr-actions">
                            <button type="button" className="btn btn-secondary btn-sm" onClick={onCopy}><Copy size={14} /> Copy link</button>
                            <a className="btn btn-secondary btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${shareText}: ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer"><Share2 size={14} /> Share</a>
                        </div>
                    </section>

                    <section className={`tr-help${closed ? ' urgent' : ''}`}>
                        <h3><LifeBuoy size={16} /> {closed ? 'Let’s sort this out' : 'Questions about this shipment?'}</h3>
                        <p>Quote your tracking number and our team in Nairobi or Mogadishu will help.</p>
                        <Link href={helpHref}><MessageCircle size={15} /> {helpHref.startsWith('/dashboard') ? 'Open a support ticket' : 'Contact us'}</Link>
                        {contact.phones[0] && <a href={telHref(contact.phones[0])}><Phone size={15} /> {contact.phones[0]}</a>}
                    </section>
                </aside>
            </div>
        </div>
    );
}

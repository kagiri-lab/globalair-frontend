'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Package, Truck, CheckCircle, Clock, Plus, ArrowRight, Search, MapPin, LifeBuoy, FileText, Phone, Mail, MessageCircle,
    Plane, Ship, PencilLine, BadgeDollarSign, CalendarClock, Receipt,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Shipment } from '@/lib/types';
import { useSiteContact } from '@/components/SiteInfoProvider';
import { telHref } from '@/lib/siteInfo';
import ShipmentRow, { ACTIVE_STATUSES, ListHead, statusLabel } from '@/components/portal/ShipmentRow';
import QuoteRequestModal from '@/components/portal/QuoteRequestModal';

type Ticket = { id: string; subject: string; details?: string | { offer?: { status: string; amount: number; transport_mode: string; valid_until?: string } } | null };

// The journey shown on "On the move" cards
const STEPS = [
    { key: 'confirmed', label: 'Booked' },
    { key: 'picked_up', label: 'Picked up' },
    { key: 'in_transit', label: 'In transit' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
];
const MODE_ICON = { air: Plane, sea: Ship, road: Truck };
const usd = (n: number) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '');

export default function DashboardPage() {
    const { user } = useAuth();
    const contact = useSiteContact();
    const router = useRouter();
    const [recent, setRecent] = useState<Shipment[]>([]);
    const [moving, setMoving] = useState<Shipment[]>([]);
    const [drafts, setDrafts] = useState<Shipment[]>([]);
    const [offers, setOffers] = useState<{ id: string; subject: string; amount: number; mode: string; until?: string }[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [bills, setBills] = useState<{ key: string; title: string; detail: string; late?: boolean }[]>([]);
    const [loading, setLoading] = useState(true);
    const [trackQuery, setTrackQuery] = useState('');
    const [quoteOpen, setQuoteOpen] = useState(false);

    useEffect(() => {
        if (!user) return; // the layout handles redirects
        const list = (q: string) => api.get(`/shipments?${q}`).then(r => r.data.data).catch(() => null);
        Promise.all([
            list('limit=6'),
            ...ACTIVE_STATUSES.map(s => list(`status=${s}&limit=4`)),
            list('status=draft&limit=3'),
            api.get('/support').then(r => r.data.data as Ticket[]).catch(() => [] as Ticket[]),
            api.get('/billing').then(r => r.data.data).catch(() => null),
        ]).then(results => {
            // Invoices to pay before pickup, and open monthly statements
            const billing = results.pop() as { unpaid: { id: string; invoice_number: string; total_price: string; pickup_city: string; destination_city: string }[]; statements: { id: string; number: string; period: string; total: string; due_date: string | null; status: string }[] } | null;
            if (billing) {
                const today = new Date(new Date().toDateString());
                setBills([
                    ...billing.unpaid.map(i => ({ key: i.id, title: `Pay invoice ${i.invoice_number}: ${usd(Number(i.total_price))}`, detail: `${i.pickup_city} → ${i.destination_city} · due before pickup` })),
                    ...billing.statements.filter(st => st.status !== 'paid').map(st => {
                        const late = !!st.due_date && new Date(st.due_date) < today;
                        return { key: st.id, late, title: `Statement for ${new Date(`${st.period}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}: ${usd(Number(st.total))}`, detail: late ? `Overdue since ${shortDate(st.due_date || '')}` : `Due ${shortDate(st.due_date || '')}` };
                    }),
                ]);
            }
            const [all, ...rest] = results;
            const tickets = rest.pop() as Ticket[];
            const draftData = rest.pop();
            setRecent(all?.shipments || []);
            setCounts(all?.status_counts || {});
            setMoving(rest.flatMap(r => r?.shipments || [])
                .sort((a: Shipment, b: Shipment) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4));
            setDrafts(draftData?.shipments || []);
            // Quotes where the team has sent a price that's waiting for an answer
            setOffers(tickets.flatMap(t => {
                const d = typeof t.details === 'string' ? JSON.parse(t.details || '{}') : t.details || {};
                const o = d?.offer;
                return o?.status === 'sent' ? [{ id: t.id, subject: t.subject, amount: o.amount, mode: o.transport_mode, until: o.valid_until }] : [];
            }));
        }).finally(() => setLoading(false));
    }, [user]);

    if (!user) return null;

    const sum = (statuses: string[]) => statuses.reduce((n, s) => n + (counts[s] || 0), 0);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const stats = [
        { label: 'All shipments', value: total, icon: Package, tone: 'dark', href: '/shipments' },
        { label: 'On the move', value: sum(ACTIVE_STATUSES), icon: Truck, tone: 'red', href: '/shipments?status=in_transit' },
        { label: 'Awaiting confirmation', value: counts.pending || 0, icon: Clock, tone: 'amber', href: '/shipments?status=pending' },
        { label: 'Delivered', value: counts.delivered || 0, icon: CheckCircle, tone: 'green', href: '/shipments?status=delivered' },
    ];

    const onTrack = (e: React.FormEvent) => {
        e.preventDefault();
        const q = trackQuery.trim().toUpperCase();
        if (q) router.push(`/dashboard/track?q=${encodeURIComponent(q)}`);
    };

    const attention = offers.length + drafts.length + bills.length;

    return (
        <div className="portal-page cpd">
            {/* Numbers at a glance */}
            <div className="cpd-stats">
                {stats.map(({ label, value, icon: Icon, tone, href }) => (
                    <Link key={label} href={href} className={`cpd-stat tone-${tone}`}>
                        <span className="cpd-stat-icon"><Icon size={19} /></span>
                        <strong>{loading ? '–' : value}</strong>
                        <span>{label}</span>
                    </Link>
                ))}
            </div>

            {/* Things waiting on the customer */}
            {attention > 0 && (
                <section className="cpd-attention" aria-label="Needs your attention">
                    {bills.map(b => (
                        <Link key={b.key} href="/dashboard/billing" className={`cpd-todo${b.late ? ' offer' : ''}`}>
                            <span className="cpd-todo-icon"><Receipt size={18} /></span>
                            <span className="cpd-todo-text">
                                <strong>{b.title}</strong>
                                <small>{b.detail}</small>
                            </span>
                            <span className="cpd-todo-cta">How to pay <ArrowRight size={14} /></span>
                        </Link>
                    ))}
                    {offers.map(o => (
                        <Link key={o.id} href={`/dashboard/support/${o.id}`} className="cpd-todo offer">
                            <span className="cpd-todo-icon"><BadgeDollarSign size={18} /></span>
                            <span className="cpd-todo-text">
                                <strong>Your price is ready: {usd(o.amount)} by {o.mode}</strong>
                                <small>{o.subject}{o.until ? ` · valid until ${shortDate(o.until)}` : ''}</small>
                            </span>
                            <span className="cpd-todo-cta">Review <ArrowRight size={14} /></span>
                        </Link>
                    ))}
                    {drafts.map(d => (
                        <Link key={d.id} href={`/shipments/new?draftId=${d.id}`} className="cpd-todo">
                            <span className="cpd-todo-icon"><PencilLine size={18} /></span>
                            <span className="cpd-todo-text">
                                <strong>Finish booking {d.pickup_city && d.destination_city ? `${d.pickup_city} → ${d.destination_city}` : d.tracking_number}</strong>
                                <small>Draft saved {shortDate(d.updated_at)}</small>
                            </span>
                            <span className="cpd-todo-cta">Continue <ArrowRight size={14} /></span>
                        </Link>
                    ))}
                </section>
            )}

            <div className="cpd-grid">
                <div className="cpd-main">
                    {/* Live shipments with where they are on the journey */}
                    {moving.length > 0 && (
                        <section>
                            <div className="portal-section-title">
                                <h2>On the move</h2>
                                <Link href="/shipments?status=in_transit">See all <ArrowRight size={14} /></Link>
                            </div>
                            <div className="cpd-moving">
                                {moving.map(s => {
                                    const Mode = MODE_ICON[s.transport_mode as keyof typeof MODE_ICON] || Truck;
                                    const at = STEPS.findIndex(x => x.key === s.status);
                                    return (
                                        <Link key={s.id} href={`/shipments/${s.id}`} className="cpd-move">
                                            <div className="cpd-move-head">
                                                <span className="cpd-move-mode"><Mode size={17} /></span>
                                                <span className="cpd-move-tn">{s.tracking_number}</span>
                                                <span className={`badge badge-${s.status}`}>{statusLabel(s.status)}</span>
                                            </div>
                                            <div className="cpd-move-route">
                                                <span><small>From</small>{s.pickup_city}</span>
                                                <ArrowRight size={16} />
                                                <span><small>To</small>{s.destination_city}</span>
                                                {s.estimated_delivery && (
                                                    <span className="cpd-move-eta"><CalendarClock size={14} /> Due {shortDate(s.estimated_delivery)}</span>
                                                )}
                                            </div>
                                            <ol className="cpd-steps" aria-label={`Progress: ${statusLabel(s.status)}`}>
                                                {STEPS.map((step, i) => (
                                                    <li key={step.key} className={i < at ? 'done' : i === at ? 'now' : ''}>
                                                        <i />
                                                        <span>{step.label}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Recent shipments */}
                    <section>
                        <div className="portal-section-title">
                            <h2>Recent shipments</h2>
                            {recent.length > 0 && <Link href="/shipments">View all <ArrowRight size={14} /></Link>}
                        </div>

                        {loading ? (
                            <div className="portal-list" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
                        ) : recent.length === 0 ? (
                            <div className="portal-list portal-empty">
                                <Package size={40} style={{ opacity: 0.35 }} />
                                <h3>No shipments yet</h3>
                                <p>Here’s how to send your first package with {contact.company}:</p>
                                <div className="portal-steps">
                                    <div><em>Step 1</em><b>Add pickup &amp; drop-off</b>Choose where we collect and deliver.</div>
                                    <div><em>Step 2</em><b>Describe your items</b>Add weights and categories for an instant quote.</div>
                                    <div><em>Step 3</em><b>Confirm &amp; track</b>Book it and follow every step live.</div>
                                </div>
                                <Link href="/shipments/new" className="btn btn-primary"><Plus size={16} /> Create your first shipment</Link>
                            </div>
                        ) : (
                            <div className="portal-list">
                                <ListHead />
                                {recent.map(s => <ShipmentRow key={s.id} shipment={s} />)}
                            </div>
                        )}
                    </section>
                </div>

                {/* Side column */}
                <aside className="cpd-side">
                    <form className="cpd-track" onSubmit={onTrack}>
                        <label htmlFor="dash-track"><Search size={15} /> Track a shipment</label>
                        <div>
                            <input id="dash-track" className="input" value={trackQuery} onChange={e => setTrackQuery(e.target.value)} placeholder="Tracking number" />
                            <button type="submit" className="btn btn-primary">Track</button>
                        </div>
                    </form>

                    <div className="cpd-quick">
                        <Link href="/shipments/new"><span><Plus size={18} /></span> New shipment</Link>
                        <button type="button" onClick={() => setQuoteOpen(true)}><span><FileText size={18} /></span> Request a quote</button>
                        <Link href="/dashboard/addresses"><span><MapPin size={18} /></span> Address book</Link>
                        <Link href="/dashboard/support"><span><LifeBuoy size={18} /></span> Get help</Link>
                    </div>

                    <div className="cpd-help">
                        <h3>Talk to us</h3>
                        {contact.opening_hours.length > 0 && (
                            <p>{contact.opening_hours.map(h => `${h.day}, ${h.hours}`).join(' · ')}</p>
                        )}
                        {contact.phones[0] && <a href={telHref(contact.phones[0])}><Phone size={15} /> {contact.phones[0]}</a>}
                        {contact.whatsapp && <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
                        <a href={`mailto:${contact.support_email}`}><Mail size={15} /> {contact.support_email}</a>
                    </div>
                </aside>
            </div>

            <QuoteRequestModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
        </div>
    );
}

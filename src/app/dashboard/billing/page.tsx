'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, Landmark, FileText, Download, CalendarClock, CheckCircle2, ArrowRight, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getPdf } from '@/lib/pdf';

type Invoice = { id: string; tracking_number: string; invoice_number: string; total_price: string; currency: string; status?: string; created_at?: string; paid_at?: string; pickup_city: string; destination_city: string };
type Statement = { id: string; number: string; period: string; total: string; currency: string; due_date: string | null; status: 'unpaid' | 'paid'; paid_at: string | null };
type Billing = { terms: 'prepaid' | 'monthly'; unpaid: Invoice[]; paid: Invoice[]; statements: Statement[]; how_to_pay: { lines: [string, string][]; instructions: string } };

const money = (n: string | number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const monthName = (p: string) => new Date(`${p}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function BillingPage() {
    const [data, setData] = useState<Billing | null>(null);

    useEffect(() => {
        api.get('/billing').then(r => setData(r.data.data)).catch(() => toast.error('Could not load your billing'));
    }, []);

    if (!data) return <div className="portal-page" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;

    const pdf = async (path: string, filename: string) => {
        if (!(await getPdf(path, { filename }))) toast.error('Could not download the PDF');
    };
    const copy = (v: string) => navigator.clipboard?.writeText(v).then(() => toast.success('Copied')).catch(() => { });
    const openStatements = data.statements.filter(s => s.status !== 'paid');
    const due = data.unpaid.reduce((n, i) => n + Number(i.total_price), 0) + openStatements.reduce((n, s) => n + Number(s.total), 0);
    const hasBank = data.how_to_pay.lines.length > 0 || !!data.how_to_pay.instructions;

    return (
        <div className="portal-page cpb">
            <div className="portal-page-head">
                <div>
                    <h1>Billing</h1>
                    <p>{data.terms === 'monthly'
                        ? 'Your account is billed monthly: you get one statement at the start of each month for the shipments you booked.'
                        : 'Each shipment is invoiced when we confirm it, and is collected once it’s paid.'}</p>
                </div>
            </div>

            <div className="cpb-grid">
                <div className="cpb-main">
                    {/* What's due */}
                    <section className="cpb-card">
                        <header><span className="cpb-icon"><Receipt size={18} /></span><div><h2>To pay</h2><p>{due ? `${money(due)} in total` : 'You’re all paid up'}</p></div></header>
                        {data.unpaid.length === 0 && openStatements.length === 0 ? (
                            <p className="cpb-empty"><CheckCircle2 size={18} /> Nothing to pay right now.</p>
                        ) : (
                            <ul className="cpb-list">
                                {data.unpaid.map(i => (
                                    <li key={i.id}>
                                        <div className="cpb-list-main">
                                            <strong>{i.invoice_number}</strong>
                                            <small>{i.pickup_city} → {i.destination_city} · <Link href={`/shipments/${i.id}`}>{i.tracking_number}</Link></small>
                                            <em className="due">Pay before pickup</em>
                                        </div>
                                        <span className="cpb-amount">{money(i.total_price)}</span>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdf(`/shipments/${i.id}/invoice`, `Invoice-${i.invoice_number}.pdf`)} aria-label={`Download invoice ${i.invoice_number}`}>
                                            <Download size={14} /> <span className="cpb-hide-sm">Invoice</span>
                                        </button>
                                    </li>
                                ))}
                                {openStatements.map(s => {
                                    const late = s.due_date && new Date(s.due_date) < new Date(new Date().toDateString());
                                    return (
                                        <li key={s.id}>
                                            <div className="cpb-list-main">
                                                <strong>{s.number}</strong>
                                                <small>Statement for {monthName(s.period)}</small>
                                                <em className={late ? 'late' : 'due'}>{late ? `Overdue since ${day(s.due_date)}` : `Due ${day(s.due_date)}`}</em>
                                            </div>
                                            <span className="cpb-amount">{money(s.total)}</span>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdf(`/billing/statements/${s.id}/pdf`, `Statement-${s.number}.pdf`)} aria-label={`Download statement ${s.number}`}>
                                                <Download size={14} /> <span className="cpb-hide-sm">Statement</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* Statements history */}
                    {data.statements.length > 0 && (
                        <section className="cpb-card">
                            <header><span className="cpb-icon"><CalendarClock size={18} /></span><div><h2>Monthly statements</h2><p>Every statement we’ve sent you</p></div></header>
                            <ul className="cpb-list">
                                {data.statements.map(s => (
                                    <li key={s.id}>
                                        <div className="cpb-list-main">
                                            <strong>{monthName(s.period)}</strong>
                                            <small>{s.number}</small>
                                            {s.status === 'paid' ? <em className="paid">Paid {day(s.paid_at)}</em> : <em className="due">Due {day(s.due_date)}</em>}
                                        </div>
                                        <span className="cpb-amount">{money(s.total)}</span>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdf(`/billing/statements/${s.id}/pdf`, `Statement-${s.number}.pdf`)} aria-label={`Download statement ${s.number}`}>
                                            <FileText size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Paid invoices */}
                    {data.paid.length > 0 && (
                        <section className="cpb-card">
                            <header><span className="cpb-icon"><CheckCircle2 size={18} /></span><div><h2>Paid invoices</h2><p>Your most recent payments</p></div></header>
                            <ul className="cpb-list">
                                {data.paid.map(i => (
                                    <li key={i.id}>
                                        <div className="cpb-list-main">
                                            <strong>{i.invoice_number}</strong>
                                            <small>{i.pickup_city} → {i.destination_city}</small>
                                            <em className="paid">Paid {day(i.paid_at)}</em>
                                        </div>
                                        <span className="cpb-amount">{money(i.total_price)}</span>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdf(`/shipments/${i.id}/invoice`, `Invoice-${i.invoice_number}.pdf`)} aria-label={`Download invoice ${i.invoice_number}`}>
                                            <FileText size={14} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>

                {/* How to pay */}
                <aside className="cpb-pay">
                    <h2><Landmark size={17} /> How to pay</h2>
                    {hasBank ? (
                        <>
                            {data.how_to_pay.lines.length > 0 && (
                                <dl>
                                    {data.how_to_pay.lines.map(([k, v]) => (
                                        <div key={k}>
                                            <dt>{k}</dt>
                                            <dd>{v}{/number|IBAN|SWIFT/i.test(k) && <button type="button" onClick={() => copy(v)} aria-label={`Copy ${k}`}><Copy size={13} /></button>}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                            {data.how_to_pay.instructions && <p>{data.how_to_pay.instructions}</p>}
                            <p className="cpb-ref">Use the invoice or statement number as the payment reference so we can match your payment.</p>
                        </>
                    ) : (
                        <p>Our team will send you payment details with your invoice. Questions? <Link href="/dashboard/support">Contact support <ArrowRight size={13} /></Link></p>
                    )}
                </aside>
            </div>
        </div>
    );
}

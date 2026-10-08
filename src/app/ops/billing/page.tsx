'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Wallet, FileText, Send, CheckCircle2, CalendarClock, Users, Receipt, Undo2, Settings, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getPdf } from '@/lib/pdf';
import { OpsPage, StatGrid, Stat, Panel, Tabs, Table, StatusBadge, EmptyState, Loader, money, fmtDate } from '@/components/ops/ui';
import ConfirmDialog from '@/components/ConfirmDialog';
import RecordPaymentModal, { methodLabel } from '@/components/ops/RecordPaymentModal';

type Unpaid = { id: string; tracking_number: string; status: string; total_price: string; created_at: string; invoice_sent_at: string | null; pickup_city: string; destination_city: string; customer_id: string; customer_name: string; customer_email: string };
type Statement = { id: string; number: string; user_id: string; period: string; total: string; due_date: string | null; status: 'unpaid' | 'paid'; sent_at: string | null; paid_at: string | null; payment_method: string | null; payment_reference: string | null; customer_name: string; customer_email: string };
type MonthlyCustomer = { id: string; name: string; email: string; unbilled: { total: number; shipments: number } };
type Overview = {
    summary: { unpaid_invoices: number; unpaid_total: number; open_statements: number; statements_total: number; overdue_statements: number; paid_this_month: number };
    unpaid: Unpaid[]; statements: Statement[]; monthly_customers: MonthlyCustomer[]; last_period: string;
};
type Tab = 'unpaid' | 'statements' | 'monthly';

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
const monthName = (period: string) => new Date(`${period}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const invoiceNo = (tn: string) => tn.replace(/^SHP-/, 'INV-');
const thisPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function BillingPage() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const tab = (['unpaid', 'statements', 'monthly'].includes(params.get('tab') || '') ? params.get('tab') : 'unpaid') as Tab;
    const setTab = (t: Tab) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

    const [data, setData] = useState<Overview | null>(null);
    const [busy, setBusy] = useState('');
    const [paying, setPaying] = useState<{ endpoint: string; title: string; amount: string } | null>(null);
    const [undo, setUndo] = useState<Statement | null>(null);
    const [billNow, setBillNow] = useState<{ period: string; userId?: string; who: string } | null>(null);

    const load = useCallback(() => api.get('/admin/billing')
        .then(r => setData(r.data.data))
        .catch(() => toast.error('Could not load billing')), []);
    useEffect(() => { load(); }, [load]);

    const run = async (key: string, fn: () => Promise<{ data: { message: string } }>) => {
        setBusy(key);
        try {
            const res = await fn();
            toast.success(res.data.message);
            await load();
            return true;
        } catch (err) {
            toast.error(errMsg(err, 'Something went wrong'));
            return false;
        } finally {
            setBusy('');
        }
    };

    const openPdf = async (path: string, filename: string) => {
        if (!(await getPdf(`${path}?view=1`, { filename, open: true }))) toast.error('Could not open the PDF');
    };

    if (!data) return <Loader label="Loading billing…" />;
    const { summary } = data;
    const overdue = (st: Statement) => st.status !== 'paid' && !!st.due_date && new Date(st.due_date) < new Date(new Date().toDateString());

    return (
        <OpsPage title="Billing" subtitle="Invoices to collect before pickup, and monthly statements for account customers."
            actions={<Link href="/ops/settings?tab=business" className="btn btn-secondary"><Settings size={15} /> Bank details</Link>}>
            <StatGrid cols={3}>
                <Stat icon={Receipt} label={`Unpaid invoices (${summary.unpaid_invoices})`} value={money(summary.unpaid_total)} tone={summary.unpaid_invoices ? 'warning' : 'success'}
                    hint="Must be paid before pickup" onClick={() => setTab('unpaid')} active={tab === 'unpaid'} />
                <Stat icon={CalendarClock} label={`Open statements (${summary.open_statements})`} value={money(summary.statements_total)} tone={summary.overdue_statements ? 'danger' : 'info'}
                    hint={summary.overdue_statements ? `${summary.overdue_statements} overdue` : 'Monthly customers'} onClick={() => setTab('statements')} active={tab === 'statements'} />
                <Stat icon={CheckCircle2} label="Received this month" value={money(summary.paid_this_month)} tone="success" />
            </StatGrid>

            <Tabs value={tab} onChange={setTab} label="Billing" tabs={[
                { value: 'unpaid', label: 'To be paid', icon: Receipt, count: data.unpaid.length, alert: true },
                { value: 'statements', label: 'Monthly statements', icon: CalendarClock, count: data.statements.filter(s => s.status !== 'paid').length },
                { value: 'monthly', label: 'Monthly customers', icon: Users, count: data.monthly_customers.length },
            ]} />

            {tab === 'unpaid' && (
                <Panel flush>
                    {data.unpaid.length === 0 ? (
                        <EmptyState icon={CheckCircle2} title="Nothing to collect" text="Every confirmed shipment that pays before pickup has been paid." />
                    ) : (
                        <Table minWidth={760}>
                            <thead><tr><th>Invoice</th><th>Customer</th><th className="o-hide-sm">Route</th><th>Shipment</th><th className="num">Amount</th><th /></tr></thead>
                            <tbody>
                                {data.unpaid.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <Link href={`/ops/shipments/${s.id}`} className="o-tn">{invoiceNo(s.tracking_number)}</Link>
                                            <div className="o-muted" style={{ fontSize: '0.75rem' }}>{s.invoice_sent_at ? `Emailed ${fmtDate(s.invoice_sent_at)}` : <span style={{ color: '#b45309' }}>Not emailed yet</span>}</div>
                                        </td>
                                        <td><Link href={`/ops/customers/${s.customer_id}`}>{s.customer_name}</Link><div className="o-muted" style={{ fontSize: '0.75rem' }}>{s.customer_email}</div></td>
                                        <td className="o-hide-sm">{s.pickup_city} → {s.destination_city}</td>
                                        <td><StatusBadge status={s.status} /></td>
                                        <td className="num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{money(s.total_price)}</td>
                                        <td>
                                            <div className="obl-actions">
                                                <button type="button" className="btn btn-primary btn-sm" onClick={() => setPaying({ endpoint: `/admin/shipments/${s.id}/payment`, title: `Record payment for ${invoiceNo(s.tracking_number)}`, amount: s.total_price })}>
                                                    <CheckCircle2 size={14} /> Paid
                                                </button>
                                                <button type="button" className="btn btn-secondary btn-sm" title={s.invoice_sent_at ? 'Resend the invoice' : 'Email the invoice'} disabled={busy === s.id}
                                                    onClick={() => run(s.id, () => api.post(`/admin/shipments/${s.id}/invoice/send`))}>
                                                    {busy === s.id ? <div className="spinner" /> : <Send size={14} />}
                                                </button>
                                                <button type="button" className="btn btn-secondary btn-sm" title="View the invoice" onClick={() => openPdf(`/admin/shipments/${s.id}/invoice`, `Invoice-${invoiceNo(s.tracking_number)}.pdf`)}>
                                                    <FileText size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Panel>
            )}

            {tab === 'statements' && (
                <Panel flush title="Monthly statements" icon={CalendarClock}
                    subtitle={`Created and emailed automatically on the 1st of each month. ${monthName(data.last_period)} is the latest month to bill.`}
                    actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => setBillNow({ period: data.last_period, who: 'every monthly customer' })}>
                        <CalendarClock size={14} /> Bill {monthName(data.last_period)} now
                    </button>}>
                    {data.statements.length === 0 ? (
                        <EmptyState icon={CalendarClock} title="No statements yet" text="Customers on monthly invoicing get a statement at the start of each month for the shipments they booked." />
                    ) : (
                        <Table minWidth={780}>
                            <thead><tr><th>Statement</th><th>Customer</th><th>Month</th><th>Due</th><th>Status</th><th className="num">Amount</th><th /></tr></thead>
                            <tbody>
                                {data.statements.map(st => (
                                    <tr key={st.id}>
                                        <td><span className="o-tn">{st.number}</span><div className="o-muted" style={{ fontSize: '0.75rem' }}>{st.sent_at ? `Emailed ${fmtDate(st.sent_at)}` : 'Not emailed'}</div></td>
                                        <td><Link href={`/ops/customers/${st.user_id}`}>{st.customer_name}</Link></td>
                                        <td>{monthName(st.period)}</td>
                                        <td style={overdue(st) ? { color: 'var(--danger, #dc2626)', fontWeight: 600 } : undefined}>
                                            {st.status === 'paid' ? '—' : fmtDate(st.due_date)}{overdue(st) && <div style={{ fontSize: '0.72rem' }}><AlertTriangle size={11} /> Overdue</div>}
                                        </td>
                                        <td>
                                            {st.status === 'paid'
                                                ? <><StatusBadge status="paid" label="Paid" tone="success" /><div className="o-muted" style={{ fontSize: '0.72rem', marginTop: 2 }}>{fmtDate(st.paid_at)} · {methodLabel(st.payment_method)}</div></>
                                                : <StatusBadge status="unpaid" label="Unpaid" tone={overdue(st) ? 'danger' : 'warning'} />}
                                        </td>
                                        <td className="num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{money(st.total)}</td>
                                        <td>
                                            <div className="obl-actions">
                                                {st.status !== 'paid' ? (
                                                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setPaying({ endpoint: `/admin/billing/statements/${st.id}/payment`, title: `Record payment for ${st.number}`, amount: st.total })}>
                                                        <CheckCircle2 size={14} /> Paid
                                                    </button>
                                                ) : (
                                                    <button type="button" className="btn btn-ghost btn-sm" title="Undo the payment" onClick={() => setUndo(st)}><Undo2 size={14} /></button>
                                                )}
                                                <button type="button" className="btn btn-secondary btn-sm" title="Email the statement again" disabled={busy === st.id}
                                                    onClick={() => run(st.id, () => api.post(`/admin/billing/statements/${st.id}/send`))}>
                                                    {busy === st.id ? <div className="spinner" /> : <Send size={14} />}
                                                </button>
                                                <button type="button" className="btn btn-secondary btn-sm" title="View the statement" onClick={() => openPdf(`/admin/billing/statements/${st.id}/pdf`, `Statement-${st.number}.pdf`)}>
                                                    <FileText size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Panel>
            )}

            {tab === 'monthly' && (
                <Panel flush title="Customers on monthly invoicing" icon={Users}
                    subtitle="Their shipments aren’t invoiced one by one: they go on one statement each month. Change a customer’s billing from their page.">
                    {data.monthly_customers.length === 0 ? (
                        <EmptyState icon={Users} title="No monthly customers" text="Open a customer and set Billing to “Monthly invoice” for trusted accounts such as NGOs and embassies." />
                    ) : (
                        <Table minWidth={620}>
                            <thead><tr><th>Customer</th><th>Not billed yet</th><th className="num">So far</th><th /></tr></thead>
                            <tbody>
                                {data.monthly_customers.map(c => (
                                    <tr key={c.id}>
                                        <td><Link href={`/ops/customers/${c.id}`}>{c.name}</Link><div className="o-muted" style={{ fontSize: '0.75rem' }}>{c.email}</div></td>
                                        <td>{c.unbilled.shipments ? `${c.unbilled.shipments} shipment${c.unbilled.shipments === 1 ? '' : 's'}` : <span className="o-muted">None</span>}</td>
                                        <td className="num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{money(c.unbilled.total)}</td>
                                        <td>
                                            <div className="obl-actions">
                                                <button type="button" className="btn btn-secondary btn-sm" disabled={!c.unbilled.shipments}
                                                    onClick={() => setBillNow({ period: thisPeriod(), userId: c.id, who: c.name })}>
                                                    Bill now <ArrowRight size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Panel>
            )}

            {paying && (
                <RecordPaymentModal open onClose={() => setPaying(null)} endpoint={paying.endpoint} title={paying.title} amount={paying.amount} onDone={load} />
            )}
            <ConfirmDialog open={!!undo} danger title="Undo this payment?" confirmLabel="Undo payment" busy={busy === 'undo'}
                message={undo && <>Statement <strong>{undo.number}</strong> and its shipments go back to unpaid. Use this if the payment was recorded by mistake.</>}
                onConfirm={async () => { if (undo && await run('undo', () => api.delete(`/admin/billing/statements/${undo.id}/payment`))) setUndo(null); }}
                onClose={() => setUndo(null)} />
            <ConfirmDialog open={!!billNow} title={billNow?.userId ? `Bill ${billNow.who} now?` : `Bill ${billNow ? monthName(billNow.period) : ''} now?`}
                confirmLabel="Create and email" busy={busy === 'bill'}
                message={billNow && (billNow.userId
                    ? <>Creates a statement for {monthName(billNow.period)} with every shipment not billed yet, and emails it to them. Shipments booked later this month go on next month’s statement.</>
                    : <>Creates statements for {monthName(billNow.period)} for {billNow.who} with unbilled shipments, and emails them. This also happens automatically on the 1st of the month.</>)}
                onConfirm={async () => {
                    if (billNow && await run('bill', () => api.post('/admin/billing/statements/run', { period: billNow.period, user_id: billNow.userId }))) {
                        setBillNow(null);
                        setTab('statements');
                    }
                }}
                onClose={() => setBillNow(null)} />
        </OpsPage>
    );
}

export default function Page() {
    return <Suspense fallback={<Loader />}><BillingPage /></Suspense>;
}

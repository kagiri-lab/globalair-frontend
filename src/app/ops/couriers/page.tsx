'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Truck, Route, Plus, Edit2, Trash2, Star, Phone, Mail, Hash, ExternalLink, EyeOff, ArrowRight, Wand2, Package, Pause, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { OpsPage, Panel, Tabs, Loader, EmptyState, Modal, Drawer, Field, StatusBadge, Table, fmtDate } from '@/components/ops/ui';
import Combobox, { type ComboOption } from '@/components/ops/Combobox';
import { allCountryNames, countryFlag } from '@/lib/countries';

type CourierType = 'internal' | 'partner';
interface Courier {
    id: string; name: string; code: string; type: CourierType; tracking_url: string | null;
    contact_name: string | null; contact_phone: string | null; contact_email: string | null; account_number: string | null; notes: string | null;
    is_default: boolean; is_active: boolean; active_legs: number; total_legs: number; rule_count: number;
    integration: string | null; has_api_key: boolean; integration_settings: { service?: string; publish_to_customers?: boolean };
    last_sync_at: string | null; last_sync_ok: boolean | null; last_sync_error: string | null;
}
interface Integration { key: string; label: string; description: string; attribution: string | null; services: [string, string][] }
interface Rule {
    id: string; destination_country: string; origin_country: string | null; transport_mode: 'air' | 'sea' | 'road' | null;
    courier_id: string; courier_name: string; courier_type: CourierType; courier_active: boolean;
    backup_courier_id: string | null; backup_name: string | null; priority: number; is_active: boolean; notes: string | null;
}
type Tab = 'couriers' | 'rules';

const MODES: Record<string, string> = { air: 'Air', sea: 'Sea', road: 'Road' };
const EMPTY_COURIER = {
    name: '', type: 'partner' as CourierType, tracking_url: '', contact_name: '', contact_phone: '', contact_email: '', account_number: '', notes: '', is_active: true, is_default: false,
    integration: '', api_key: '', service: '', publish_to_customers: false,
};
const EMPTY_RULE = { destination_country: '', origin_country: '', transport_mode: '', courier_id: '', backup_courier_id: '', priority: 0, is_active: true, notes: '' };
const REASONS: Record<string, string> = {
    rule: 'Matched a routing rule',
    backup: 'The rule’s courier is paused, so its backup is used',
    default: 'No rule matches — the default courier is used',
    none: 'No active courier available',
};

function CouriersCentre() {
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('manage_zones');
    const router = useRouter();
    const pathname = usePathname();
    const tab: Tab = useSearchParams().get('tab') === 'rules' ? 'rules' : 'couriers';
    const setTab = (t: Tab) => router.replace(t === 'couriers' ? pathname : `${pathname}?tab=${t}`, { scroll: false });

    const [couriers, setCouriers] = useState<Courier[]>([]);
    const [countries, setCountries] = useState<string[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [testNumber, setTestNumber] = useState('');
    const [testing, setTesting] = useState(false);
    const [testOutcome, setTestOutcome] = useState<{ ok: boolean; text: string } | null>(null);
    const [loading, setLoading] = useState(true);

    const [courierForm, setCourierForm] = useState(EMPTY_COURIER);
    const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
    const [showCourier, setShowCourier] = useState(false);
    const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
    const [editingRule, setEditingRule] = useState<Rule | null>(null);
    const [showRule, setShowRule] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState<{ kind: 'courier' | 'rule'; id: string; label: string } | null>(null);

    const [test, setTest] = useState({ origin_country: '', destination_country: '', transport_mode: '' });
    const [testResult, setTestResult] = useState<{ courier: Courier | null; rule_id: string | null; reason: string } | null>(null);

    const load = useCallback(() => Promise.all([api.get('/admin/couriers'), api.get('/admin/courier-rules')])
        .then(([c, r]) => {
            setCouriers(c.data.data.couriers);
            setCountries(c.data.data.countries);
            setIntegrations(c.data.data.integrations || []);
            setRules(r.data.data.rules);
        })
        .catch(() => toast.error('Could not load couriers'))
        .finally(() => setLoading(false)), []);

    useEffect(() => { load(); }, [load]);

    const activeCouriers = couriers.filter(c => c.is_active);
    const partners = couriers.filter(c => c.type === 'partner');
    const countryOptions = useMemo(() => [...new Set([...countries, ...rules.map(r => r.destination_country)])].sort(), [countries, rules]);

    // ── Couriers ────────────────────────────────────────────────────────────
    const openCourier = (c?: Courier) => {
        setEditingCourier(c || null);
        setCourierForm(c ? {
            name: c.name, type: c.type, tracking_url: c.tracking_url || '', contact_name: c.contact_name || '', contact_phone: c.contact_phone || '',
            contact_email: c.contact_email || '', account_number: c.account_number || '', notes: c.notes || '', is_active: c.is_active, is_default: c.is_default,
            integration: c.integration || '', api_key: '', service: c.integration_settings?.service || '', publish_to_customers: !!c.integration_settings?.publish_to_customers,
        } : EMPTY_COURIER);
        setTestNumber('');
        setTestOutcome(null);
        setShowCourier(true);
    };

    const saveCourier = async () => {
        if (!courierForm.name.trim()) { toast.error('Give the courier a name'); return; }
        setSaving(true);
        try {
            const { service, publish_to_customers, api_key, ...rest } = courierForm;
            const body = {
                ...rest,
                integration: courierForm.integration || null,
                integration_settings: { service, publish_to_customers },
                ...(api_key.trim() ? { api_key: api_key.trim() } : {}),
            };
            if (editingCourier) await api.patch(`/admin/couriers/${editingCourier.id}`, body);
            else await api.post('/admin/couriers', body);
            toast.success(editingCourier ? 'Courier updated' : 'Courier added');
            setShowCourier(false);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not save');
        } finally { setSaving(false); }
    };

    // Try the tracking integration with what's in the form, without saving
    const testIntegration = async () => {
        if (!editingCourier) return;
        if (!testNumber.trim()) { toast.error('Enter one of this courier’s tracking numbers'); return; }
        setTesting(true);
        setTestOutcome(null);
        try {
            const res = await api.post(`/admin/couriers/${editingCourier.id}/test-tracking`, {
                tracking_number: testNumber.trim(),
                integration: courierForm.integration,
                integration_settings: { service: courierForm.service },
                ...(courierForm.api_key.trim() ? { api_key: courierForm.api_key.trim() } : {}),
            });
            const d = res.data.data;
            setTestOutcome({ ok: true, text: `${res.data.message}. Latest: ${d.last_event?.description || d.status_text || d.status}${d.last_event?.location ? ` (${d.last_event.location})` : ''}` });
        } catch (err: any) {
            setTestOutcome({ ok: false, text: err.response?.data?.message || 'Test failed' });
        } finally {
            setTesting(false);
        }
    };

    const patchCourier = async (c: Courier, patch: Record<string, unknown>, message: string) => {
        try {
            await api.patch(`/admin/couriers/${c.id}`, patch);
            toast.success(message);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not update');
        }
    };

    // ── Rules ───────────────────────────────────────────────────────────────
    const openRule = (r?: Rule, preset?: Partial<typeof EMPTY_RULE>) => {
        setEditingRule(r || null);
        setRuleForm(r ? {
            destination_country: r.destination_country, origin_country: r.origin_country || '', transport_mode: r.transport_mode || '',
            courier_id: r.courier_id, backup_courier_id: r.backup_courier_id || '', priority: r.priority, is_active: r.is_active, notes: r.notes || '',
        } : { ...EMPTY_RULE, ...preset });
        setShowRule(true);
    };

    const saveRule = async () => {
        if (!ruleForm.destination_country.trim() || !ruleForm.courier_id) { toast.error('Choose a destination and a courier'); return; }
        setSaving(true);
        try {
            if (editingRule) await api.patch(`/admin/courier-rules/${editingRule.id}`, ruleForm);
            else await api.post('/admin/courier-rules', ruleForm);
            toast.success(editingRule ? 'Rule updated' : 'Rule added');
            setShowRule(false);
            setTestResult(null);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not save');
        } finally { setSaving(false); }
    };

    const toggleRule = async (r: Rule) => {
        try {
            await api.patch(`/admin/courier-rules/${r.id}`, { is_active: !r.is_active });
            setTestResult(null);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not update');
        }
    };

    const runDelete = async () => {
        if (!confirm) return;
        try {
            await api.delete(confirm.kind === 'courier' ? `/admin/couriers/${confirm.id}` : `/admin/courier-rules/${confirm.id}`);
            toast.success(confirm.kind === 'courier' ? 'Courier deleted' : 'Rule deleted');
            setConfirm(null);
            setTestResult(null);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not delete', { duration: 6000 });
            setConfirm(null);
        }
    };

    const runTest = async () => {
        if (!test.destination_country) { toast.error('Choose a destination'); return; }
        try {
            const q = new URLSearchParams(Object.entries(test).filter(([, v]) => v) as [string, string][]).toString();
            const res = await api.get(`/admin/courier-rules/preview?${q}`);
            setTestResult(res.data.data);
        } catch {
            toast.error('Could not test the route');
        }
    };

    const defaultCourier = couriers.find(c => c.is_default);

    return (
        <OpsPage
            title="Couriers"
            subtitle="Your in-house delivery team and partner couriers. Internal only — customers never see who carries their shipment."
            actions={canEdit && (tab === 'couriers'
                ? <button className="btn btn-primary" onClick={() => openCourier()}><Plus size={16} /> Add courier</button>
                : <button className="btn btn-primary" onClick={() => openRule()} disabled={!activeCouriers.length}><Plus size={16} /> Add rule</button>)}
        >
            <Tabs
                label="Courier sections"
                value={tab}
                onChange={setTab}
                tabs={[
                    { value: 'couriers', label: 'Couriers', icon: Truck, count: couriers.length },
                    { value: 'rules', label: 'Routing rules', icon: Route, count: rules.length },
                ]}
            />

            <div className="osc-banner"><EyeOff size={16} /> Courier names, their tracking numbers and costs stay inside the operations portal. Customers only ever see your tracking number and your updates.</div>

            {loading ? <Loader label="Loading couriers…" /> : tab === 'couriers' ? (
                <div className="ocr-grid">
                    {couriers.map(c => (
                        <div key={c.id} className={`ocr-card${c.is_active ? '' : ' paused'}`}>
                            <div className="ocr-card-head">
                                <span className={`ocr-icon ${c.type}`}>{c.type === 'internal' ? <Truck size={19} /> : <Package size={19} />}</span>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <strong>{c.name}</strong>
                                    <div className="o-row" style={{ gap: '0.35rem', marginTop: '0.25rem' }}>
                                        <StatusBadge status={c.type} label={c.type === 'internal' ? 'In-house' : 'Partner'} tone={c.type === 'internal' ? 'brand' : 'violet'} />
                                        {c.is_default && <StatusBadge status="default" label="Default" tone="info" />}
                                        {!c.is_active && <StatusBadge status="paused" label="Paused" tone="neutral" />}
                                    </div>
                                </div>
                            </div>

                            <div className="ocr-stats">
                                <span><b>{c.active_legs}</b> active</span>
                                <span><b>{c.total_legs}</b> handled</span>
                                <span><b>{c.rule_count}</b> rule{c.rule_count === 1 ? '' : 's'}</span>
                            </div>

                            <ul className="ocr-contact">
                                {c.contact_name && <li><Hash size={13} /> {c.contact_name}</li>}
                                {c.contact_phone && <li><Phone size={13} /> <a href={`tel:${c.contact_phone}`}>{c.contact_phone}</a></li>}
                                {c.contact_email && <li><Mail size={13} /> <a href={`mailto:${c.contact_email}`}>{c.contact_email}</a></li>}
                                {c.account_number && <li><Hash size={13} /> Account {c.account_number}</li>}
                                {c.tracking_url && <li><ExternalLink size={13} /> Tracking links enabled</li>}
                                {c.integration && (
                                    <li className={c.last_sync_ok === false ? 'ocr-sync bad' : 'ocr-sync'}>
                                        <RefreshCw size={13} />
                                        {!c.has_api_key ? 'Automatic tracking: add the API key'
                                            : c.last_sync_ok === false ? `Tracking sync problem: ${c.last_sync_error || 'unknown error'}`
                                                : c.last_sync_at ? `Automatic tracking on · checked ${fmtDate(c.last_sync_at, true)}`
                                                    : 'Automatic tracking on · waiting for a shipment with a tracking number'}
                                    </li>
                                )}
                                {!c.contact_name && !c.contact_phone && !c.contact_email && !c.account_number && !c.tracking_url && !c.integration && <li className="o-muted">No contact details yet</li>}
                            </ul>
                            {c.notes && <p className="ocr-notes">{c.notes}</p>}

                            <div className="ocr-actions">
                                <Link href={`/ops/shipments?courier=${c.id}`} className="btn btn-secondary btn-sm"><Package size={13} /> Shipments</Link>
                                {canEdit && <>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openCourier(c)}><Edit2 size={13} /> Edit</button>
                                    {!c.is_default && c.is_active && <button className="btn btn-secondary btn-sm" onClick={() => patchCourier(c, { is_default: true }, `${c.name} is now the default`)} title="Use when no rule matches"><Star size={13} /></button>}
                                    {!c.is_default && <button className="btn btn-secondary btn-sm" onClick={() => patchCourier(c, { is_active: !c.is_active }, c.is_active ? `${c.name} paused` : `${c.name} resumed`)} title={c.is_active ? 'Pause' : 'Resume'}>{c.is_active ? <Pause size={13} /> : 'Resume'}</button>}
                                    {!c.is_default && c.total_legs === 0 && <button className="btn btn-secondary btn-sm" onClick={() => setConfirm({ kind: 'courier', id: c.id, label: c.name })} aria-label={`Delete ${c.name}`}><Trash2 size={13} /></button>}
                                </>}
                            </div>
                        </div>
                    ))}
                    {canEdit && partners.length === 0 && (
                        <button type="button" className="ocr-add" onClick={() => openCourier()}>
                            <Plus size={22} />
                            <strong>Add a partner courier</strong>
                            <span>DHL, a local agent abroad, an airline cargo desk…</span>
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <Panel title="Test a route" subtitle="See which courier a new shipment would get." icon={Wand2}>
                        <div className="ocr-test">
                            <Combobox id="test-from" value={test.origin_country} onChange={v => { setTest(t => ({ ...t, origin_country: v })); setTestResult(null); }}
                                options={countryOptions.map(c => ({ value: c, label: c, icon: countryFlag(c) || undefined }))} searchPlaceholder="Search countries…"
                                emptyOption={{ label: 'From anywhere' }} />
                            <ArrowRight size={16} className="o-muted" />
                            <Combobox id="test-to" value={test.destination_country} onChange={v => { setTest(t => ({ ...t, destination_country: v })); setTestResult(null); }}
                                options={countryOptions.map(c => ({ value: c, label: c, icon: countryFlag(c) || undefined }))} placeholder="To…" searchPlaceholder="Search countries…" />
                            <select className="input" value={test.transport_mode} onChange={e => { setTest(t => ({ ...t, transport_mode: e.target.value })); setTestResult(null); }} aria-label="Mode">
                                <option value="">Any mode</option>
                                {Object.entries(MODES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                            <button className="btn btn-secondary" onClick={runTest}>Test</button>
                        </div>
                        {testResult && (
                            <div className={`ocr-result ${testResult.reason}`}>
                                <strong>{testResult.courier?.name || 'No courier'}</strong>
                                <span>{REASONS[testResult.reason]}</span>
                                {testResult.reason === 'default' && canEdit && test.destination_country && (
                                    <button className="btn btn-secondary btn-sm" onClick={() => openRule(undefined, { destination_country: test.destination_country, origin_country: test.origin_country, transport_mode: test.transport_mode })}>
                                        <Plus size={13} /> Add a rule for this route
                                    </button>
                                )}
                            </div>
                        )}
                    </Panel>

                    <Panel
                        title="Routing rules"
                        subtitle={`New shipments get a courier from these rules. ${defaultCourier ? `Anything not covered goes to ${defaultCourier.name}.` : ''} More specific rules win (country + origin + mode beats country only).`}
                        icon={Route}
                        flush
                    >
                        {rules.length === 0 ? (
                            <EmptyState
                                icon={Route}
                                title="No routing rules yet"
                                text={`Every shipment currently goes to ${defaultCourier?.name || 'the default courier'}. Add a rule to send a destination to a partner instead.`}
                                action={canEdit && activeCouriers.length > 0 && <button className="btn btn-primary" onClick={() => openRule()}><Plus size={16} /> Add a rule</button>}
                            />
                        ) : (
                            <Table minWidth={760}>
                                <thead><tr><th>Route</th><th>Mode</th><th>Courier</th><th className="o-hide-sm">Backup</th><th className="num o-hide-sm">Priority</th><th>Active</th><th className="num" /></tr></thead>
                                <tbody>
                                    {rules.map(r => (
                                        <tr key={r.id} style={{ opacity: r.is_active ? 1 : 0.55 }}>
                                            <td>
                                                <span className="o-row" style={{ gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {r.origin_country || <span className="o-muted" style={{ fontWeight: 400 }}>Anywhere</span>} <ArrowRight size={13} /> {r.destination_country}
                                                </span>
                                                {r.notes && <small className="o-muted" style={{ display: 'block' }}>{r.notes}</small>}
                                            </td>
                                            <td>{r.transport_mode ? MODES[r.transport_mode] : <span className="o-muted">Any</span>}</td>
                                            <td>
                                                <span className="o-row" style={{ gap: '0.4rem' }}>
                                                    {r.courier_name}
                                                    {!r.courier_active && <StatusBadge status="paused" label="Paused" tone="neutral" />}
                                                </span>
                                            </td>
                                            <td className="o-hide-sm">{r.backup_name || <span className="o-muted">—</span>}</td>
                                            <td className="num o-hide-sm">{r.priority < ORDINALS.length ? ORDINALS[r.priority] : r.priority + 1}</td>
                                            <td>
                                                <label className="oset-switch">
                                                    <input type="checkbox" checked={r.is_active} disabled={!canEdit} onChange={() => toggleRule(r)} aria-label="Rule active" />
                                                    <span aria-hidden="true" />
                                                </label>
                                            </td>
                                            <td className="num">
                                                {canEdit && (
                                                    <div className="o-row" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => openRule(r)} aria-label="Edit rule"><Edit2 size={13} /></button>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => setConfirm({ kind: 'rule', id: r.id, label: `${r.origin_country || 'Anywhere'} → ${r.destination_country}` })} aria-label="Delete rule"><Trash2 size={13} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Panel>
                </>
            )}

            {/* Courier form: right slider, with a guide beside the fields */}
            <Drawer
                open={showCourier}
                onClose={() => setShowCourier(false)}
                title={editingCourier ? `Edit ${editingCourier.name}` : 'Add a courier'}
                subtitle="Your own delivery team or a partner company that carries shipments on some routes."
                width={1000}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowCourier(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={saveCourier} disabled={saving}>{saving ? <div className="spinner" /> : editingCourier ? 'Save changes' : 'Add courier'}</button>
                </>}
            >
                <CourierForm form={courierForm} setForm={setCourierForm} integrations={integrations} editing={editingCourier}
                    test={{ number: testNumber, setNumber: setTestNumber, running: testing, outcome: testOutcome, clear: () => setTestOutcome(null), run: testIntegration }} />
            </Drawer>

            {/* Rule form: right slider, with a guide beside the fields */}
            <Drawer
                open={showRule}
                onClose={() => setShowRule(false)}
                title={editingRule ? 'Edit routing rule' : 'Add a routing rule'}
                subtitle="Decide which courier carries shipments on a route. Applies to new shipments; existing ones keep their courier."
                width={1000}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowRule(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={saveRule} disabled={saving}>{saving ? <div className="spinner" /> : editingRule ? 'Save rule' : 'Add rule'}</button>
                </>}
            >
                <RuleForm form={ruleForm} setForm={setRuleForm} couriers={couriers} countries={countryOptions} rules={rules} editingId={editingRule?.id} />
            </Drawer>

            <Modal
                open={!!confirm}
                onClose={() => setConfirm(null)}
                title={`Delete ${confirm?.kind === 'courier' ? confirm.label : 'this rule'}?`}
                width={440}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={runDelete}>Delete</button>
                </>}
            >
                <p className="o-muted">
                    {confirm?.kind === 'courier'
                        ? 'Its routing rules are deleted too. New shipments for those routes will go to the default courier.'
                        : `Shipments for ${confirm?.label} will fall back to other rules or the default courier.`}
                </p>
            </Modal>
        </OpsPage>
    );
}

// ── Courier form ────────────────────────────────────────────────────────────
type CourierFormState = typeof EMPTY_COURIER;
type CourierField = 'type' | 'name' | 'tracking_url' | 'integration' | 'api_key' | 'publish' | 'contact' | 'account' | 'notes';

const COURIER_GUIDE: { key: CourierField; title: string; text: string }[] = [
    { key: 'type', title: 'Partner or in-house', text: 'A partner is another company (DHL, Aramex, a local agent) that carries some of your shipments. In-house is your own drivers and team. One courier is your default: it gets every shipment no routing rule covers.' },
    { key: 'name', title: 'Name', text: 'How the courier shows to your staff, in routing rules and on the shipment. Customers never see partner names: their tracking always shows your company.' },
    { key: 'tracking_url', title: 'Tracking link', text: 'The courier’s own tracking page, with {tracking} where the tracking number goes. Staff get a one-click link to follow the shipment on the courier’s site.' },
    { key: 'integration', title: 'Automatic tracking', text: 'Connect the courier’s system so their scans come in by themselves every few minutes, instead of staff copying updates across. Needs an API key from the courier.' },
    { key: 'api_key', title: 'API key', text: 'Given by the courier when you sign up for their developer access. It’s stored encrypted and never shown again; leave it empty when editing to keep the saved one.' },
    { key: 'publish', title: 'Post updates to customers', text: 'On: courier scans become your own tracking updates (with the courier’s name removed) and move the shipment along. Off: scans are for staff only, and you post updates yourselves.' },
    { key: 'contact', title: 'Contact', text: 'Who your team calls about a delayed or damaged shipment. Shown to staff on every shipment this courier carries.' },
    { key: 'account', title: 'Our account number', text: 'Your customer number with the courier, handy when booking with them or querying an invoice.' },
    { key: 'notes', title: 'Notes', text: 'Anything your team should remember: cut-off times, drop-off address, agreed rates. Staff only.' },
];

function CourierForm({ form, setForm, integrations, editing, test }: {
    form: CourierFormState; setForm: React.Dispatch<React.SetStateAction<CourierFormState>>;
    integrations: Integration[]; editing: Courier | null;
    test: { number: string; setNumber: (v: string) => void; running: boolean; outcome: { ok: boolean; text: string } | null; clear: () => void; run: () => void };
}) {
    const [focus, setFocus] = useState<CourierField>('type');
    const set = (patch: Partial<CourierFormState>) => setForm(f => ({ ...f, ...patch }));
    const on = (k: CourierField) => ({ onFocusCapture: () => setFocus(k), onMouseDownCapture: () => setFocus(k) });

    const partner = form.type === 'partner';
    const integ = integrations.find(i => i.key === form.integration);
    const name = form.name.trim() || (partner ? 'This partner' : 'Your team');
    const link = form.tracking_url.trim();
    const linkOk = !link || link.includes('{tracking}');
    const example = link && linkOk ? link.replace('{tracking}', '1234567890') : '';

    const integOpts: ComboOption[] = integrations.map(i => ({ value: i.key, label: i.label, hint: i.description, icon: <RefreshCw size={14} /> }));
    const serviceOpts: ComboOption[] = (integ?.services || []).map(([v, l]) => ({ value: v, label: l }));

    return (
        <div className="orf">
            <div className="orf-form">
                <section className="orf-section" {...on('type')}>
                    <h3><span>1</span> Who are they?</h3>
                    <div className="ocf-types" role="radiogroup" aria-label="Courier type">
                        {([
                            ['partner', 'Partner courier', 'Another company that carries some routes, e.g. DHL or a local agent.', Package],
                            ['internal', 'In-house team', 'Your own drivers and staff.', Truck],
                        ] as const).map(([v, l, d, Icon]) => (
                            <button key={v} type="button" role="radio" aria-checked={form.type === v} className={form.type === v ? 'active' : ''}
                                onClick={() => set({ type: v })}>
                                <span className="ocf-type-icon"><Icon size={18} /></span>
                                <span><strong>{l}</strong><small>{d}</small></span>
                            </button>
                        ))}
                    </div>
                    <div className="o-form-grid" style={{ marginTop: '0.9rem' }}>
                        <div {...on('name')} style={{ gridColumn: '1 / -1' }}>
                            <Field label="Name *"><input className="input" value={form.name} onChange={e => set({ name: e.target.value })} placeholder={partner ? 'e.g. DHL Express' : 'e.g. Global Air Cargo (in-house)'} autoFocus /></Field>
                        </div>
                    </div>
                </section>

                <section className="orf-section">
                    <h3><span>2</span> Tracking</h3>
                    <div className="o-form-grid">
                        <div {...on('tracking_url')} style={{ gridColumn: '1 / -1' }}>
                            <Field label="Tracking link" error={linkOk ? undefined : 'Put {tracking} where the tracking number goes'}
                                hint={example ? `Example: ${example}` : 'e.g. https://www.dhl.com/track?tracking-id={tracking}'}>
                                <input className="input" value={form.tracking_url} onChange={e => set({ tracking_url: e.target.value })} placeholder="https://…{tracking}" />
                            </Field>
                        </div>

                        {partner && integrations.length > 0 && <>
                            <div {...on('integration')} style={{ gridColumn: '1 / -1' }}>
                                <Field label="Automatic tracking">
                                    <Combobox id="courier-integration" value={form.integration} onChange={v => { set({ integration: v, service: '' }); test.clear(); }}
                                        options={integOpts} searchPlaceholder="Search integrations…" emptyOption={{ label: 'None', hint: 'Staff type in tracking numbers and updates' }} />
                                </Field>
                            </div>
                            {integ && <>
                                <div {...on('api_key')}>
                                    <Field label="API key" hint={editing?.has_api_key ? 'Saved — leave empty to keep it' : 'Stored encrypted'}>
                                        <input className="input" type="password" autoComplete="new-password" value={form.api_key} onChange={e => set({ api_key: e.target.value })} placeholder={editing?.has_api_key ? '••••••••  (saved)' : ''} />
                                    </Field>
                                </div>
                                {serviceOpts.length > 0 && (
                                    <div {...on('integration')}>
                                        <Field label="Service">
                                            <Combobox id="courier-service" value={form.service || serviceOpts[0].value} onChange={v => set({ service: v })} options={serviceOpts} searchPlaceholder="Search services…" />
                                        </Field>
                                    </div>
                                )}
                                <label className="ocr-publish" {...on('publish')} style={{ gridColumn: '1 / -1' }}>
                                    <input type="checkbox" checked={form.publish_to_customers} onChange={e => set({ publish_to_customers: e.target.checked })} />
                                    <span>
                                        <strong>Post updates to customers automatically</strong>
                                        <small>
                                            Courier scans become your own tracking updates.
                                            {integ.attribution && <> Their terms require the tracking page to show <b>“{integ.attribution}”</b> when you do this.</>}
                                        </small>
                                    </span>
                                </label>
                                {editing ? (
                                    <div className="ocr-integ-test" style={{ gridColumn: '1 / -1' }}>
                                        <input className="input o-mono" value={test.number} onChange={e => test.setNumber(e.target.value)} placeholder="One of their tracking numbers, to test" aria-label="Tracking number to test" />
                                        <button type="button" className="btn btn-secondary" onClick={test.run} disabled={test.running}>{test.running ? <div className="spinner" /> : 'Test connection'}</button>
                                        {test.outcome && <p className={test.outcome.ok ? 'ok' : 'bad'}>{test.outcome.text}</p>}
                                    </div>
                                ) : <p className="o-muted" style={{ gridColumn: '1 / -1', fontSize: '0.8rem' }}>Save the courier first, then you can test the connection.</p>}
                            </>}
                        </>}
                    </div>
                </section>

                <section className="orf-section">
                    <h3><span>3</span> Contact &amp; account</h3>
                    <div className="o-form-grid">
                        <div {...on('contact')}><Field label="Contact person"><input className="input" value={form.contact_name} onChange={e => set({ contact_name: e.target.value })} /></Field></div>
                        <div {...on('contact')}><Field label="Phone"><input className="input" type="tel" value={form.contact_phone} onChange={e => set({ contact_phone: e.target.value })} /></Field></div>
                        <div {...on('contact')}><Field label="Email"><input className="input" type="email" value={form.contact_email} onChange={e => set({ contact_email: e.target.value })} /></Field></div>
                        <div {...on('account')}><Field label="Our account number"><input className="input" value={form.account_number} onChange={e => set({ account_number: e.target.value })} /></Field></div>
                    </div>
                </section>

                <section className="orf-section" {...on('notes')}>
                    <h3><span>4</span> Notes</h3>
                    <textarea className="input" rows={3} value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Cut-off times, drop-off address, rates agreed…" />
                </section>
            </div>

            <aside className="orf-guide">
                <div className="orf-summary">
                    <p>How this courier works</p>
                    <strong>
                        {partner
                            ? <><b>{name}</b> carries the shipments your routing rules send to it. {integ
                                ? <>Their scans come in automatically{form.publish_to_customers ? ' and update your customers’ tracking.' : ' for staff to see.'}</>
                                : <>Staff add its tracking number to each shipment and post updates.</>}</>
                            : <><b>{name}</b> is your own team: staff post each update as they collect and deliver.</>}
                        {' '}Customers always see your company, never the courier.
                    </strong>
                    {link && !linkOk && <span className="orf-clash">The tracking link needs {'{tracking}'} where the number goes, or staff links won’t work.</span>}
                    {editing?.is_default && <span className="orf-note">This is your default courier: it gets every shipment no rule covers.</span>}
                </div>

                <ul className="orf-help">
                    {COURIER_GUIDE.filter(g => partner || !['integration', 'api_key', 'publish'].includes(g.key)).map(g => (
                        <li key={g.key} className={focus === g.key ? 'active' : ''}>
                            <strong>{g.title}</strong>
                            <p>{g.text}</p>
                        </li>
                    ))}
                </ul>
            </aside>
        </div>
    );
}

// ── Routing rule form ───────────────────────────────────────────────────────
type RuleFormState = typeof EMPTY_RULE;
type FieldKey = 'to' | 'from' | 'mode' | 'courier' | 'backup' | 'priority' | 'notes';

const GUIDE: { key: FieldKey; title: string; text: string }[] = [
    { key: 'to', title: 'Shipping to', text: 'The destination country this rule is for. Every rule needs one. Pick from the countries you serve, or type any country to plan ahead.' },
    { key: 'from', title: 'Shipping from', text: 'Only use this rule for shipments leaving a particular country, e.g. Kenya → China by one partner and Dubai → China by another. Leave it on “Anywhere” to cover every origin.' },
    { key: 'mode', title: 'Transport mode', text: 'Limit the rule to air, sea or road. A partner that only flies cargo should be set to Air, so sea and road shipments fall to another rule or your default courier.' },
    { key: 'courier', title: 'Courier', text: 'Who carries the shipment on this route: your own team (in-house) or a partner. Their tracking number and updates show on the shipment.' },
    { key: 'backup', title: 'Backup courier', text: 'Used automatically while the main courier is paused, for example during a strike or a contract break, so bookings never get stuck.' },
    { key: 'priority', title: 'Priority', text: 'Only matters when two rules match a shipment equally well (same countries and mode): the first choice is used before the second, and so on. Most rules can stay on “First choice”.' },
    { key: 'notes', title: 'Notes', text: 'For your team only, e.g. the agreed rate or contract reference. Customers never see this.' },
];

// Priority: lower is used first. Offered as choices rather than a number to type.
const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
const priorityOptions = (current: number): ComboOption[] => {
    const values = [...new Set([...ORDINALS.map((_, i) => i), current])].sort((a, b) => a - b);
    return values.map(v => ({
        value: String(v),
        label: v < ORDINALS.length ? `${ORDINALS[v]} choice` : `Choice ${v + 1}`,
        hint: v === 0 ? 'Used first when rules match equally well (most rules)' : `Used if no earlier choice matches`,
    }));
};

function RuleForm({ form, setForm, couriers, countries, rules, editingId }: {
    form: RuleFormState; setForm: React.Dispatch<React.SetStateAction<RuleFormState>>;
    couriers: Courier[]; countries: string[]; rules: Rule[]; editingId?: string;
}) {
    const [focus, setFocus] = useState<FieldKey>('to');
    const set = (patch: Partial<RuleFormState>) => setForm(f => ({ ...f, ...patch }));

    // Countries you already ship with first, then every other country
    const countryOpts = useMemo<ComboOption[]>(() => {
        const ours = new Set(countries.map(c => c.toLowerCase()));
        const flag = (c: string) => countryFlag(c) || undefined;
        return [
            ...countries.map(c => ({ value: c, label: c, icon: flag(c), group: 'Your countries' })),
            ...allCountryNames().filter(c => !ours.has(c.toLowerCase())).map(c => ({ value: c, label: c, icon: flag(c), group: 'All countries' })),
        ];
    }, [countries]);
    const courierOpts = (exclude?: string): ComboOption[] => couriers.filter(c => c.id !== exclude).map(c => ({
        value: c.id, label: c.name,
        hint: [c.type === 'internal' ? 'In-house team' : 'Partner', c.is_default && 'default', !c.is_active && 'paused'].filter(Boolean).join(' · '),
        icon: <Truck size={15} />,
    }));

    const courier = couriers.find(c => c.id === form.courier_id);
    const backup = couriers.find(c => c.id === form.backup_courier_id);
    const mode = form.transport_mode ? MODES[form.transport_mode].toLowerCase() : '';

    // Another active rule for exactly the same route
    const clash = rules.find(r => r.id !== editingId && r.is_active
        && r.destination_country.toLowerCase() === form.destination_country.trim().toLowerCase()
        && (r.origin_country || '').toLowerCase() === form.origin_country.trim().toLowerCase()
        && (r.transport_mode || '') === form.transport_mode);

    return (
        <div className="orf">
            <div className="orf-form">
                <section className="orf-section">
                    <h3><span>1</span> Which shipments?</h3>
                    <div className="o-form-grid">
                        <Field label="Shipping to *">
                            <Combobox id="rule-to" value={form.destination_country} onChange={v => set({ destination_country: v })} onFocus={() => setFocus('to')}
                                options={countryOpts} placeholder="Choose a country" searchPlaceholder="Search countries…" allowCustom />
                        </Field>
                        <Field label="Shipping from">
                            <Combobox id="rule-from" value={form.origin_country} onChange={v => set({ origin_country: v })} onFocus={() => setFocus('from')}
                                options={countryOpts} searchPlaceholder="Search countries…" emptyOption={{ label: 'Anywhere', hint: 'Any origin country' }} allowCustom />
                        </Field>
                        <Field label="Transport mode" full>
                            <div className="orf-modes" role="radiogroup" aria-label="Transport mode" onFocus={() => setFocus('mode')}>
                                {[['', 'Any mode'], ['air', 'Air'], ['sea', 'Sea'], ['road', 'Road']].map(([v, l]) => (
                                    <button key={v} type="button" role="radio" aria-checked={form.transport_mode === v} className={form.transport_mode === v ? 'active' : ''}
                                        onClick={() => { set({ transport_mode: v }); setFocus('mode'); }}>{l}</button>
                                ))}
                            </div>
                        </Field>
                    </div>
                </section>

                <section className="orf-section">
                    <h3><span>2</span> Who carries them?</h3>
                    <div className="o-form-grid">
                        <Field label="Courier *">
                            <Combobox id="rule-courier" value={form.courier_id} onChange={v => set({ courier_id: v, backup_courier_id: form.backup_courier_id === v ? '' : form.backup_courier_id })}
                                onFocus={() => setFocus('courier')} options={courierOpts()} placeholder="Choose a courier" searchPlaceholder="Search couriers…" />
                        </Field>
                        <Field label="Backup courier">
                            <Combobox id="rule-backup" value={form.backup_courier_id} onChange={v => set({ backup_courier_id: v })} onFocus={() => setFocus('backup')}
                                options={courierOpts(form.courier_id)} searchPlaceholder="Search couriers…" emptyOption={{ label: 'No backup', hint: 'Falls back to your default courier' }} />
                        </Field>
                    </div>
                </section>

                <section className="orf-section">
                    <h3><span>3</span> Extras</h3>
                    <div className="o-form-grid">
                        <Field label="Priority">
                            <Combobox id="rule-priority" value={String(form.priority)} onChange={v => set({ priority: Number(v) })} onFocus={() => setFocus('priority')}
                                options={priorityOptions(form.priority)} searchable={false} />
                        </Field>
                        <Field label="Notes">
                            <input className="input" value={form.notes} onFocus={() => setFocus('notes')} onChange={e => set({ notes: e.target.value })} placeholder="Optional, e.g. the agreed rate" />
                        </Field>
                    </div>
                </section>
            </div>

            <aside className="orf-guide">
                <div className="orf-summary">
                    <p>This rule means</p>
                    {form.destination_country && courier ? (
                        <strong>
                            New {mode ? `${mode} ` : ''}shipments {form.origin_country ? <>from <b>{form.origin_country}</b> </> : ''}to <b>{form.destination_country}</b> go
                            with <b>{courier.name}</b>.{backup ? <> If {courier.name} is paused, <b>{backup.name}</b> takes them.</> : ''}
                        </strong>
                    ) : (
                        <strong className="muted">Choose where shipments go and a courier to see what this rule does.</strong>
                    )}
                    {clash && <span className="orf-clash">There’s already a rule for exactly this route ({clash.courier_name}). Priority decides which one is used.</span>}
                    {courier && !courier.is_active && <span className="orf-clash">{courier.name} is paused, so {backup ? backup.name : 'your default courier'} is used until it’s back.</span>}
                </div>

                <ul className="orf-help">
                    {GUIDE.map(g => (
                        <li key={g.key} className={focus === g.key ? 'active' : ''}>
                            <strong>{g.title}</strong>
                            <p>{g.text}</p>
                        </li>
                    ))}
                </ul>

                <p className="orf-order">
                    <b>When several rules match</b>, the most specific one wins: country + origin + mode, then country + origin, then country + mode, then country only.
                    With no match, your default courier is used.
                </p>
            </aside>
        </div>
    );
}

export default function CouriersPage() {
    return <Suspense fallback={<Loader />}><CouriersCentre /></Suspense>;
}

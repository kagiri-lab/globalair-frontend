'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
    OpsPage, Panel, Toolbar, SearchInput, StatusBadge, Table, Loader, EmptyState, Pager, Avatar, Modal, Field,
    fmtDate, downloadCsv,
} from '@/components/ops/ui';

const EMPTY_NEW = { name: '', email: '', phone: '', password: '', role: 'customer' };

export default function AdminUsersPage() {
    const router = useRouter();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('manage_customers');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState(EMPTY_NEW);

    useEffect(() => { const t = setTimeout(() => setDebounced(search), 400); return () => clearTimeout(t); }, [search]);

    const load = () => {
        setLoading(true);
        const p = new URLSearchParams({ page: String(page), limit: '15' });
        if (debounced) p.set('search', debounced);
        api.get(`/admin/users?${p}`).then(r => {
            setUsers(r.data.data.users);
            setTotal(r.data.data.pagination.total);
            setPages(r.data.data.pagination.pages);
        }).catch(() => toast.error('Could not load customers')).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [page, debounced]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await api.post('/admin/users', newUser);
            toast.success(res.data.message || 'Customer created');
            setIsModalOpen(false);
            setNewUser(EMPTY_NEW);
            load();
        } catch (error: any) {
            toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.message || 'Failed to create customer');
        } finally {
            setCreating(false);
        }
    };

    const exportCsv = async () => {
        setExporting(true);
        try {
            const p = new URLSearchParams({ page: '1', limit: '5000' });
            if (debounced) p.set('search', debounced);
            const r = await api.get(`/admin/users?${p}`);
            const rows = r.data.data.users.map((u: any) => ({
                name: u.name, email: u.email, phone: u.phone || '', status: u.is_active ? 'active' : 'suspended',
                shipments: u.shipment_count || 0, joined: u.created_at,
            }));
            if (!rows.length) { toast.error('Nothing to export'); return; }
            downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
            toast.success(`Exported ${rows.length} customers`);
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <OpsPage
            title="Customers"
            subtitle={`${total.toLocaleString()} ${debounced ? 'matching' : 'registered'} customer${total === 1 ? '' : 's'}`}
            actions={<>
                <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
                    {exporting ? <div className="spinner" /> : <Download size={16} />} Export CSV
                </button>
                {canManage && <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={16} /> New customer</button>}
            </>}
        >
            <Toolbar>
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name, email or phone…" />
            </Toolbar>

            <Panel flush>
                {loading && !users.length ? <Loader label="Loading customers…" /> : users.length === 0 ? (
                    <EmptyState icon={Users} title="No customers found" text={debounced ? 'Try a different search.' : 'Customers appear here once they register.'} />
                ) : (
                    <div style={{ opacity: loading ? 0.6 : 1 }}>
                        <Table minWidth={680}>
                            <thead>
                                <tr><th>Customer</th><th>Contact</th><th>Status</th><th className="num">Shipments</th><th className="o-hide-sm">Joined</th></tr>
                            </thead>
                            <tbody>
                                {users.map((u: any) => (
                                    <tr key={u.id} className="o-clickable" onClick={() => router.push(`/ops/customers/${u.id}`)}>
                                        <td>
                                            <div className="o-cell-main">
                                                <Avatar name={u.name} size={36} />
                                                <span style={{ minWidth: 0 }}><strong>{u.name}</strong><small>Since {fmtDate(u.created_at)}</small></span>
                                            </div>
                                        </td>
                                        <td>
                                            <div>{u.email}</div>
                                            <div className="o-muted" style={{ fontSize: '0.78rem' }}>{u.phone || 'No phone'}</div>
                                        </td>
                                        <td><StatusBadge status={u.is_active ? 'active' : 'suspended'} /></td>
                                        <td className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.shipment_count || 0}</td>
                                        <td className="o-hide-sm">{fmtDate(u.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
                <Pager page={page} pages={pages} total={total} noun="customers" onChange={setPage} />
            </Panel>

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="New customer"
                subtitle="Create a shipping account on a customer’s behalf. It’s active straight away."
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                    <button type="submit" form="createUserForm" className="btn btn-primary" disabled={creating}>{creating ? <div className="spinner" /> : 'Create account'}</button>
                </>}
            >
                <form id="createUserForm" onSubmit={handleCreateUser} className="o-form-grid">
                    <Field label="Full name" full><input className="input" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Jane Wanjiru" /></Field>
                    <Field label="Email"><input type="email" className="input" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="jane@company.com" /></Field>
                    <Field label="Phone"><input type="tel" className="input" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+254 700 000 000" /></Field>
                    <Field label="Temporary password" hint="At least 6 characters — share it securely with the customer" full>
                        <input type="password" required minLength={6} className="input" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                    </Field>
                </form>
            </Modal>
        </OpsPage>
    );
}

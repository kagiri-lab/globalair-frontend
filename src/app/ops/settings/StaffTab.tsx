'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, ShieldCheck, Truck, Building2, Edit2, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/roles';
import {
    StatGrid, Stat, Panel, Toolbar, SearchInput, StatusBadge, Table, Loader, EmptyState, Pager, Avatar, Modal, Field, fmtDate,
} from '@/components/ops/ui';

const STAFF_ROLES = ['super_admin', 'admin', 'operations', 'support', 'finance'];
const ROLE_HINTS: Record<string, string> = {
    super_admin: 'Full access, including staff and system settings',
    admin: 'Manage shipments, customers, categories and pricing',
    operations: 'Run day-to-day shipments and view customers',
    support: 'Handle tickets and enquiries, update shipments',
    finance: 'View shipments, reports and settings',
};
const PAGE_SIZE = 12;
const EMPTY_FORM = { name: '', email: '', phone: '', role: 'operations', password: '', is_active: true };

export default function StaffTab() {
    const router = useRouter();
    const { user: me } = useAuth();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [toggleTarget, setToggleTarget] = useState<any>(null);

    const loadStaff = useCallback(async () => {
        try {
            const res = await api.get('/admin/system/admins');
            setStaff(res.data.data || []);
        } catch {
            toast.error('Failed to load staff');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStaff(); }, [loadStaff]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return staff.filter(s => (!roleFilter || s.role === roleFilter) && (`${s.name} ${s.email} ${s.phone || ''}`).toLowerCase().includes(q));
    }, [staff, search, roleFilter]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const openModal = (member?: any) => {
        setEditing(member || null);
        setFormData(member
            ? { name: member.name, email: member.email, phone: member.phone || '', role: member.role, password: '', is_active: !!member.is_active }
            : EMPTY_FORM);
        setShowModal(true);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!formData.name.trim() || !formData.email.trim()) { toast.error('Name and email are required'); return; }
        if (!editing && formData.password.length < 6) { toast.error('Set a password of at least 6 characters'); return; }
        setSaving(true);
        try {
            if (editing) {
                const { password, ...rest } = formData;
                await api.patch(`/admin/system/admins/${editing.id}`, password ? formData : rest);
                toast.success('Staff member updated');
            } else {
                await api.post('/admin/system/admins', formData);
                toast.success('Staff member added');
            }
            setShowModal(false);
            loadStaff();
        } catch (err: any) {
            toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Could not save');
        } finally {
            setSaving(false);
        }
    };

    const confirmToggle = async () => {
        if (!toggleTarget) return;
        try {
            await api.patch(`/admin/system/admins/${toggleTarget.id}/toggle-access`);
            toast.success(toggleTarget.is_active ? 'Access revoked' : 'Access restored');
            setToggleTarget(null);
            loadStaff();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not change access');
        }
    };

    const set = (patch: Partial<typeof EMPTY_FORM>) => setFormData(f => ({ ...f, ...patch }));

    return (
        <>
            <StatGrid>
                <Stat icon={Users} label="Staff accounts" value={staff.length} tone="brand" onClick={() => { setRoleFilter(''); setPage(1); }} active={!roleFilter} />
                <Stat icon={ShieldCheck} label="Active accounts" value={staff.filter(s => s.is_active).length} tone="success" />
                <Stat icon={Building2} label="Operations" value={staff.filter(s => s.role === 'operations').length} tone="info" onClick={() => { setRoleFilter(f => (f === 'operations' ? '' : 'operations')); setPage(1); }} active={roleFilter === 'operations'} />
                <Stat icon={Truck} label="Customer support" value={staff.filter(s => s.role === 'support').length} tone="violet" onClick={() => { setRoleFilter(f => (f === 'support' ? '' : 'support')); setPage(1); }} active={roleFilter === 'support'} />
            </StatGrid>

            <Toolbar>
                <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name, email or phone…" />
                <select className="input" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} aria-label="Role">
                    <option value="">All roles</option>
                    {STAFF_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => openModal()}><UserPlus size={16} /> Add staff</button>
            </Toolbar>

            <Panel flush>
                {loading ? <Loader label="Loading staff…" /> : shown.length === 0 ? (
                    <EmptyState icon={Users} title="No staff match" text="Try another search or role." />
                ) : (
                    <Table minWidth={720}>
                        <thead><tr><th>Name</th><th>Role</th><th>Access</th><th className="o-hide-sm">Added</th><th className="num">Actions</th></tr></thead>
                        <tbody>
                            {shown.map(s => {
                                const isMe = s.id === me?.id;
                                return (
                                    <tr key={s.id} className="o-clickable" onClick={() => router.push(`/ops/staff/${s.id}`)}>
                                        <td>
                                            <div className="o-cell-main">
                                                <Avatar name={s.name} size={36} />
                                                <span style={{ minWidth: 0 }}><strong>{s.name}{isMe && <span className="o-muted" style={{ fontWeight: 400 }}> (you)</span>}</strong><small>{s.email}</small></span>
                                            </div>
                                        </td>
                                        <td><StatusBadge status={s.role} label={ROLE_LABELS[s.role] || s.role} tone={s.role === 'super_admin' ? 'brand' : 'neutral'} /></td>
                                        <td><StatusBadge status={s.is_active ? 'active' : 'disabled'} label={s.is_active ? 'Active' : 'Revoked'} /></td>
                                        <td className="o-hide-sm">{fmtDate(s.created_at)}</td>
                                        <td className="num" onClick={e => e.stopPropagation()}>
                                            <div className="o-row" style={{ justifyContent: 'flex-end', gap: '0.4rem' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openModal(s)}><Edit2 size={13} /> Edit</button>
                                                {!isMe && (
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setToggleTarget(s)} title={s.is_active ? 'Revoke access' : 'Restore access'}>
                                                        {s.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
                <Pager page={page} pages={pages} total={filtered.length} noun="staff" onChange={setPage} />
            </Panel>

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? `Edit ${editing.name}` : 'Add staff member'}
                subtitle={editing ? undefined : 'They’ll sign in on the normal login page and land in the operations portal.'}
                width={600}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => handleSubmit()} disabled={saving}>{saving ? <div className="spinner" /> : editing ? 'Save changes' : 'Add staff member'}</button>
                </>}
            >
                <form onSubmit={handleSubmit} className="o-form-grid">
                    <Field label="Full name"><input className="input" value={formData.name} onChange={e => set({ name: e.target.value })} autoFocus /></Field>
                    <Field label="Phone"><input className="input" type="tel" value={formData.phone} onChange={e => set({ phone: e.target.value })} /></Field>
                    <Field label="Email" full><input className="input" type="email" value={formData.email} onChange={e => set({ email: e.target.value })} /></Field>
                    <Field label="Role" hint={ROLE_HINTS[formData.role]} full>
                        <select className="input" value={formData.role} onChange={e => set({ role: e.target.value })}>
                            {STAFF_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                    </Field>
                    <Field label={editing ? 'New password' : 'Password'} hint={editing ? 'Leave empty to keep the current password' : 'At least 6 characters'} full>
                        <input className="input" type="password" autoComplete="new-password" value={formData.password} onChange={e => set({ password: e.target.value })} />
                    </Field>
                </form>
            </Modal>

            <Modal
                open={!!toggleTarget}
                onClose={() => setToggleTarget(null)}
                title={toggleTarget?.is_active ? `Revoke access for ${toggleTarget?.name}?` : `Restore access for ${toggleTarget?.name}?`}
                width={460}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setToggleTarget(null)}>Cancel</button>
                    <button className={`btn ${toggleTarget?.is_active ? 'btn-danger' : 'btn-primary'}`} onClick={confirmToggle}>{toggleTarget?.is_active ? 'Revoke access' : 'Restore access'}</button>
                </>}
            >
                <p className="o-muted">{toggleTarget?.is_active ? 'They’ll be signed out and won’t be able to sign in until access is restored.' : 'They’ll be able to sign in to the operations portal again.'}</p>
            </Modal>
        </>
    );
}

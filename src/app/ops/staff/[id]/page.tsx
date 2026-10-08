'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Mail, Phone, Clock, LogIn, CalendarDays, KeyRound, Lock, Unlock, ShieldCheck, Activity, MonitorSmartphone, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/roles';
import {
    OpsPage, StatGrid, Stat, Panel, StatusBadge, Table, Loader, EmptyState, Pager, Avatar, Modal, Field, Tabs, fmtDate,
} from '@/components/ops/ui';
import SessionList, { type Session } from '@/components/SessionList';

const ROLE_DESCRIPTIONS: Record<string, string> = {
    super_admin: 'Full access to everything, including staff accounts and system settings.',
    admin: 'Manages shipments, customers, categories and pricing across the business.',
    operations: 'Runs day-to-day shipments and can view customer records.',
    support: 'Handles support tickets and website enquiries, and updates shipments.',
    finance: 'Views shipments, financial reports and settings.',
};

const LOGS_PER_PAGE = 10;

export default function StaffDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user: me } = useAuth();
    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [loginLogs, setLoginLogs] = useState<any[]>([]);
    const [logPage, setLogPage] = useState(1);
    const [logPages, setLogPages] = useState(1);
    const [showReset, setShowReset] = useState(false);
    const [showToggle, setShowToggle] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [tab, setTab] = useState<'activity' | 'devices' | 'role'>('activity');

    const loadStaff = async () => {
        try {
            const res = await api.get(`/admin/system/admins/${id}`);
            setStaff(res.data.data.user);
            setSessions(res.data.data.sessions || []);
            window.dispatchEvent(new CustomEvent('set-header-title', { detail: res.data.data.user.name }));
        } catch {
            toast.error('Staff member not found');
            router.push('/ops/settings?tab=staff');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStaff();
        api.get(`/admin/system/logs?user_id=${id}&action=login&limit=100`).then(r => setLoginLogs(r.data.data.logs)).catch(() => { });
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setLogsLoading(true);
        api.get(`/admin/system/logs?user_id=${id}&page=${logPage}&limit=${LOGS_PER_PAGE}`)
            .then(r => { setLogs(r.data.data.logs); setLogPages(r.data.data.pagination.pages || 1); })
            .catch(() => toast.error('Could not load activity'))
            .finally(() => setLogsLoading(false));
    }, [id, logPage]);

    const loginStats = useMemo(() => {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        return {
            last: loginLogs[0]?.created_at,
            today: loginLogs.filter(l => new Date(l.created_at) >= startOfDay).length,
            week: loginLogs.filter(l => new Date(l.created_at) >= startOfWeek).length,
        };
    }, [loginLogs]);

    const resetPassword = async () => {
        if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setBusy(true);
        try {
            await api.post(`/admin/system/admins/${id}/reset-password`, { new_password: newPassword });
            toast.success('Password reset');
            setShowReset(false);
            setNewPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not reset password');
        } finally { setBusy(false); }
    };

    const toggleAccess = async () => {
        setBusy(true);
        try {
            await api.patch(`/admin/system/admins/${id}/toggle-access`);
            toast.success(staff.is_active ? 'Access revoked' : 'Access restored');
            setShowToggle(false);
            loadStaff();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not change access');
        } finally { setBusy(false); }
    };

    if (loading) return <Loader label="Loading staff member…" />;
    if (!staff) return null;

    const isMe = staff.id === me?.id;
    let permissions: string[] = [];
    try { permissions = typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : staff.permissions || []; } catch { permissions = []; }

    const logDetail = (l: any) => {
        try {
            const d = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
            return d?.url || l.entity_type || '';
        } catch { return ''; }
    };

    // Sign out one of their devices, or all of them
    const endSessions = async (sid?: string) => {
        setBusy(true);
        try {
            const res = await api.delete(`/admin/system/admins/${id}/sessions${sid ? `/${sid}` : ''}`);
            toast.success(res.data.message);
            await loadStaff();
        } catch (err) {
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not sign out');
        } finally {
            setBusy(false);
        }
    };

    return (
        <OpsPage
            back={{ href: '/ops/settings?tab=staff', label: 'Staff & access' }}
            title={<span className="o-row" style={{ gap: '0.85rem' }}><Avatar name={staff.name} size={48} /> {staff.name}{isMe && <span className="o-muted" style={{ fontSize: '1rem', fontWeight: 400 }}>(you)</span>}</span>}
            subtitle={<span className="o-row" style={{ gap: '0.5rem 1rem' }}>
                <StatusBadge status={staff.role} label={ROLE_LABELS[staff.role] || staff.role} tone={staff.role === 'super_admin' ? 'brand' : 'neutral'} />
                <StatusBadge status={staff.is_active ? 'active' : 'disabled'} label={staff.is_active ? 'Access active' : 'Access revoked'} />
                <span className="o-row" style={{ gap: '0.3rem' }}><Mail size={14} /> {staff.email}</span>
                {staff.phone && <span className="o-row" style={{ gap: '0.3rem' }}><Phone size={14} /> {staff.phone}</span>}
            </span>}
            actions={<>
                <button className="btn btn-secondary" onClick={() => setShowReset(true)}><KeyRound size={15} /> Reset password</button>
                {!isMe && (
                    <button className={`btn ${staff.is_active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setShowToggle(true)}>
                        {staff.is_active ? <><Lock size={15} /> Revoke access</> : <><Unlock size={15} /> Restore access</>}
                    </button>
                )}
            </>}
        >
            <StatGrid cols={3}>
                <Stat icon={Clock} label="Last sign-in" value={loginStats.last ? fmtDate(loginStats.last, true) : 'Never'} tone="neutral" />
                <Stat icon={LogIn} label="Sign-ins today" value={loginStats.today} tone="brand" />
                <Stat icon={CalendarDays} label="Sign-ins this week" value={loginStats.week} tone="info" />
            </StatGrid>

            <div style={{ marginBottom: '1rem' }}>
                <Tabs value={tab} onChange={setTab} label="Staff sections" tabs={[
                    { value: 'activity', label: 'Activity', icon: Activity },
                    { value: 'devices', label: 'Devices', icon: MonitorSmartphone, count: sessions.length },
                    { value: 'role', label: 'Role & permissions', icon: ShieldCheck },
                ]} />
            </div>

            {tab === 'devices' && (
                <Panel title="Signed-in devices" icon={MonitorSmartphone} flush
                    subtitle={isMe ? 'Manage your own devices from My profile.' : 'Sign out a device you don’t recognise, or every device at once.'}
                    actions={!isMe && sessions.length > 0 && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => endSessions()} disabled={busy}>
                            <LogOut size={14} /> Sign out everywhere
                        </button>
                    )}>
                    <SessionList sessions={sessions} empty="Not signed in on any device." onEnd={isMe ? undefined : sid => endSessions(sid)} />
                </Panel>
            )}

            {tab === 'activity' && (
                <Panel title="Activity" icon={Activity} flush>
                    {logsLoading ? <Loader /> : logs.length === 0 ? <EmptyState icon={Activity} title="No activity recorded yet" /> : (
                        <Table minWidth={520}>
                            <thead><tr><th>Action</th><th>Details</th><th className="num">When</th></tr></thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{String(l.action).replace(/_/g, ' ')}</td>
                                        <td className="o-muted" style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logDetail(l)}</td>
                                        <td className="num">{fmtDate(l.created_at, true)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                    <Pager page={logPage} pages={logPages} onChange={setLogPage} />
                </Panel>
            )}

            {tab === 'role' && (
                <Panel title="Role & permissions" icon={ShieldCheck}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ROLE_LABELS[staff.role] || staff.role}</p>
                    <p className="o-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{ROLE_DESCRIPTIONS[staff.role]}</p>
                    {permissions.length > 0 && (
                        <div className="o-row" style={{ gap: '0.35rem' }}>
                            {permissions.map(p => <StatusBadge key={p} status={p} label={p.replace(/_/g, ' ')} tone="neutral" />)}
                        </div>
                    )}
                    <p className="o-muted" style={{ fontSize: '0.78rem', marginTop: '1rem' }}>Added {fmtDate(staff.created_at)}. Change the role from the staff list.</p>
                </Panel>
            )}

            <Modal
                open={showReset}
                onClose={() => setShowReset(false)}
                title={`Reset ${staff.name}’s password`}
                width={460}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowReset(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={resetPassword} disabled={busy}>{busy ? <div className="spinner" /> : 'Reset password'}</button>
                </>}
            >
                <Field label="New password" hint="At least 6 characters — share it securely">
                    <input className="input" type="text" autoComplete="off" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </Field>
            </Modal>

            <Modal
                open={showToggle}
                onClose={() => setShowToggle(false)}
                title={staff.is_active ? 'Revoke access?' : 'Restore access?'}
                width={460}
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowToggle(false)}>Cancel</button>
                    <button className={`btn ${staff.is_active ? 'btn-danger' : 'btn-primary'}`} onClick={toggleAccess} disabled={busy}>{busy ? <div className="spinner" /> : staff.is_active ? 'Revoke access' : 'Restore access'}</button>
                </>}
            >
                <p className="o-muted">{staff.is_active ? `${staff.name} won’t be able to sign in to the operations portal.` : `${staff.name} will be able to sign in again.`}</p>
            </Modal>
        </OpsPage>
    );
}

'use client';

import { useState } from 'react';
import { Monitor, Smartphone, Tablet, Check, LogOut } from 'lucide-react';
import { describeDevice, activeAgo } from '@/lib/devices';

export type Session = { id: string; user_agent: string | null; ip_address: string | null; created_at: string; last_seen_at: string; current?: boolean };

// Local addresses in words (seen when testing on the same computer or inside an office network)
const ipLabel = (ip: string) => /^(127\.|::1$)/.test(ip) ? 'same computer as the server'
    : /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|f[cd]|fe80:)/i.test(ip) ? `local network (${ip})` : `IP ${ip}`;

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Devices signed in to an account, each with a "Sign out" button.
 * Styles live in components/portal/portal.css (.cpp-session*), loaded by both portals.
 */
export default function SessionList({ sessions, onEnd, onEndCurrent, untrackedCurrent, empty = 'Not signed in on any device.' }: {
    sessions: Session[];
    /** Sign out one device (not this one) */
    onEnd?: (id: string) => Promise<unknown>;
    /** Sign out this device (i.e. log out) */
    onEndCurrent?: () => void;
    /** This device signed in before sessions were recorded: show it without details */
    untrackedCurrent?: boolean;
    empty?: string;
}) {
    const [busy, setBusy] = useState('');
    const end = async (id: string) => {
        if (!onEnd) return;
        setBusy(id);
        try { await onEnd(id); } finally { setBusy(''); }
    };

    if (sessions.length === 0 && !untrackedCurrent) return <p className="cpp-empty">{empty}</p>;

    return (
        <ul className="cpp-sessions">
            {untrackedCurrent && (
                <li className="cpp-session">
                    <span className="cpp-session-icon current"><Monitor size={18} /></span>
                    <div className="cpp-session-text">
                        <strong>This device <em><Check size={12} /> You’re here</em></strong>
                        <small>Signed in before device tracking started. Sign out and back in to see its details.</small>
                    </div>
                    {onEndCurrent && <button type="button" className="btn btn-secondary btn-sm" onClick={onEndCurrent}><LogOut size={14} /> Sign out</button>}
                </li>
            )}
            {sessions.map(s => {
                const d = describeDevice(s.user_agent);
                const Icon = d.kind === 'phone' ? Smartphone : d.kind === 'tablet' ? Tablet : Monitor;
                return (
                    <li key={s.id} className="cpp-session">
                        <span className={`cpp-session-icon${s.current ? ' current' : ''}`}><Icon size={18} /></span>
                        <div className="cpp-session-text">
                            <strong>{d.name}{s.current && <em><Check size={12} /> This device</em>}</strong>
                            <small>
                                {s.current ? 'Active now' : activeAgo(s.last_seen_at)} · Signed in {fmtDay(s.created_at)}
                                {s.ip_address && <> · {ipLabel(s.ip_address)}</>}
                            </small>
                        </div>
                        {s.current
                            ? onEndCurrent && <button type="button" className="btn btn-secondary btn-sm" onClick={onEndCurrent}><LogOut size={14} /> Sign out</button>
                            : onEnd && (
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => end(s.id)} disabled={!!busy}>
                                    {busy === s.id ? <div className="spinner" /> : 'Sign out'}
                                </button>
                            )}
                    </li>
                );
            })}
        </ul>
    );
}

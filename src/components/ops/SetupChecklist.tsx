'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronRight, Rocket, X } from 'lucide-react';
import api from '@/lib/api';

type Item = { key: string; label: string; detail: string; href: string; done: boolean; required: boolean };
const HIDE_KEY = 'ops_setup_hidden_until';

// Dashboard checklist: shown until the essentials (email, site address, prices, categories) are done
export default function SetupChecklist() {
    const [items, setItems] = useState<Item[] | null>(null);
    // Nothing renders until the status arrives, so reading storage here can't cause a hydration mismatch
    const [hidden, setHidden] = useState(() => {
        try { return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now(); } catch { return false; }
    });

    useEffect(() => {
        api.get('/admin/setup-status').then(r => setItems(r.data.data.items)).catch(() => setItems(null));
    }, []);

    if (!items || hidden) return null;
    const required = items.filter(i => i.required);
    if (required.every(i => i.done)) return null;

    const done = items.filter(i => i.done).length;
    const todo = [...items].sort((a, b) => Number(a.done) - Number(b.done) || Number(b.required) - Number(a.required));
    // "Later" hides it for a day on this browser; it comes back until the essentials are done
    const later = () => {
        try { localStorage.setItem(HIDE_KEY, String(Date.now() + 24 * 60 * 60 * 1000)); } catch { /* storage blocked */ }
        setHidden(true);
    };

    return (
        <section className="osc">
            <header className="osc-head">
                <span className="osc-icon"><Rocket size={20} /></span>
                <div>
                    <h2>Finish setting up</h2>
                    <p>{required.filter(i => !i.done).length} essential step{required.filter(i => !i.done).length === 1 ? '' : 's'} left before everything works for customers.</p>
                </div>
                <span className="osc-count">{done}/{items.length}</span>
                <button type="button" className="osc-later" onClick={later} aria-label="Hide for a day"><X size={16} /></button>
            </header>
            <div className="osc-bar"><span style={{ width: `${(done / items.length) * 100}%` }} /></div>
            <ul className="osc-list">
                {todo.map(i => (
                    <li key={i.key} className={i.done ? 'done' : ''}>
                        {i.done ? <CheckCircle2 size={18} className="osc-check" /> : <Circle size={18} />}
                        <div>
                            <strong>{i.label}{!i.required && !i.done && <em>optional</em>}</strong>
                            {!i.done && <small>{i.detail}</small>}
                        </div>
                        {!i.done && <Link href={i.href} className="btn btn-secondary btn-sm">Set up <ChevronRight size={14} /></Link>}
                    </li>
                ))}
            </ul>
        </section>
    );
}

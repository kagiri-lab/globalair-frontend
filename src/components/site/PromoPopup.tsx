'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import PromoCard from './PromoCard';
import type { PromoSettings } from '@/lib/promo';

const STORAGE_KEY = 'promo_popup_seen';
const DAY = 24 * 60 * 60 * 1000;

// When this visitor last closed this version of the popup (per browser)
const lastSeen = (version: number): number | null => {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (raw?.version === version) return raw.at;
        // "Once per session" also counts this tab's session
        if (sessionStorage.getItem(`${STORAGE_KEY}:${version}`)) return Date.now();
    } catch { /* storage blocked: show it */ }
    return null;
};

const remember = (version: number) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, at: Date.now() }));
        sessionStorage.setItem(`${STORAGE_KEY}:${version}`, '1');
    } catch { /* storage blocked */ }
};

const today = () => new Date().toISOString().slice(0, 10);

/** Should this visitor see the popup now? */
const due = (p: PromoSettings, pathname: string) => {
    if (!p.enabled) return false;
    if (p.mode === 'content' && !p.title) return false;
    if (p.pages === 'home' && pathname !== '/') return false;
    const d = today();
    if ((p.start_date && d < p.start_date) || (p.end_date && d > p.end_date)) return false;
    if (p.frequency === 'always') return true;
    const seen = lastSeen(p.version);
    if (seen === null) return true;
    if (p.frequency === 'day') return Date.now() - seen > DAY;
    if (p.frequency === 'week') return Date.now() - seen > 7 * DAY;
    if (p.frequency === 'session') {
        try { return !sessionStorage.getItem(`${STORAGE_KEY}:${p.version}`); } catch { return true; }
    }
    return false; // once
};

// Promo popup (an image flyer or a designed message), set in Settings → Website content
export default function PromoPopup({ promo }: { promo: PromoSettings }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const close = useCallback(() => {
        setOpen(false);
        remember(promo.version);
    }, [promo.version]);

    useEffect(() => {
        if (!due(promo, pathname)) return;
        const t = setTimeout(() => setOpen(true), promo.delay_seconds * 1000);
        return () => clearTimeout(t);
    }, [promo, pathname]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, close]);

    if (!open) return null;

    return (
        <div className="promo-backdrop" onClick={close} role="dialog" aria-modal="true" aria-label={promo.mode === 'image' ? promo.image_alt || 'Special offer' : promo.title}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460 }}>
                <PromoCard promo={promo} onClose={close} onAction={() => remember(promo.version)} />
            </div>
        </div>
    );
}

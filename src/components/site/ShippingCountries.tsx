'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';
import api from '@/lib/api';
import { countryFlag } from '@/lib/countries';

// Scrolling "countries we ship to" band, managed in the ops portal under Settings → Website content
export default function ShippingCountries() {
    const [countries, setCountries] = useState<string[]>([]);

    useEffect(() => {
        const load = () => api.get('/public/settings')
            .then(res => {
                const raw = res.data?.data?.settings?.shipping_countries;
                const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (Array.isArray(list)) setCountries(list.filter((c: unknown) => typeof c === 'string' && c.trim()));
            })
            .catch(() => { });
        load();
        // Pick up edits made in Settings while this page was open in another tab
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    const items = useMemo(() => countries.map(name => ({ name, flag: countryFlag(name) })), [countries]);

    // Repeat short lists so the strip is always full, then double it for a seamless loop
    const run = useMemo(() => {
        if (!items.length) return [];
        const times = Math.max(1, Math.ceil(12 / items.length));
        return Array.from({ length: times }, () => items).flat();
    }, [items]);

    if (!items.length) return null;

    const duration = Math.max(25, run.length * 3.2);

    return (
        <section className="site-countries" aria-labelledby="ship-to-heading">
            <div className="site-container site-countries-head">
                <span className="site-countries-icon"><Globe2 size={20} /></span>
                <div>
                    <h2 id="ship-to-heading">Countries we ship to</h2>
                    <p>Door-to-door air, sea and road freight across {items.length === 1 ? 'this destination' : `${items.length} countries`}.</p>
                </div>
            </div>

            {/* Screen readers get the plain list; the moving strip is decorative */}
            <ul className="sr-only">{items.map(c => <li key={c.name}>{c.name}</li>)}</ul>

            <div className="site-countries-marquee" aria-hidden="true">
                <div className="site-countries-track" style={{ animationDuration: `${duration}s` }}>
                    {[0, 1].map(copy => (
                        <div className="site-countries-group" key={copy}>
                            {run.map((c, i) => (
                                <span className="site-country" key={`${copy}-${i}`}>
                                    {c.flag ? <span className="site-country-flag">{c.flag}</span> : <Globe2 size={16} />}
                                    {c.name}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

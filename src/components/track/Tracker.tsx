'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Search, ArrowRight, Truck, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import TrackResult, { type TrackData } from './TrackResult';
import { useSiteContact } from '@/components/SiteInfoProvider';
import { useAuth } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

interface Props {
    /** Page the search form navigates to, e.g. /track (public) or /dashboard/track (customer portal) */
    basePath?: string;
    /** Signed-in customer's own shipments — tracking one of them unlocks full details & invoice links */
    ownShipments?: { id: string; tracking_number: string }[];
}

// Shared tracking experience used by the public /track page and the customer portal
export default function Tracker({ basePath = '/track', ownShipments }: Props) {
    const contact = useSiteContact();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const q = (searchParams.get('q') || '').trim().toUpperCase();
    const [query, setQuery] = useState(q);
    const [reload, setReload] = useState(0);
    const [response, setResponse] = useState<{ key: string; data: TrackData | null; error: string }>({ key: '', data: null, error: '' });

    // Keep the input in sync when the URL changes (e.g. searching from the header or footer)
    const [lastQ, setLastQ] = useState(q);
    if (q !== lastQ) {
        setLastQ(q);
        setQuery(q);
    }

    // The URL is the source of truth: every search updates ?q=, which triggers the lookup
    const requestKey = `${q}#${reload}`;
    useEffect(() => {
        if (!q) return;
        let cancelled = false;
        axios.get(`${API}/shipments/track/${encodeURIComponent(q)}`)
            .then(res => { if (!cancelled) setResponse({ key: requestKey, data: res.data.data, error: '' }); })
            .catch(e => {
                if (cancelled) return;
                const error = e.response?.status === 404 ? 'not_found' : (e.response?.data?.message || 'Something went wrong. Please try again.');
                setResponse({ key: requestKey, data: null, error });
            });
        return () => { cancelled = true; };
    }, [q, requestKey]);

    const loading = !!q && response.key !== requestKey;
    // While refreshing the same number, keep showing the previous result (dimmed)
    const result = q && response.data?.shipment.tracking_number.toUpperCase() === q ? response.data : null;
    const error = q && !loading ? response.error : '';

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const n = query.trim().toUpperCase();
        if (!n) return;
        if (n === q) setReload(r => r + 1);
        else router.push(`${basePath}?q=${encodeURIComponent(n)}`);
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Tracking link copied');
        } catch {
            toast.error('Could not copy the link');
        }
    };

    // The shipment belongs to the signed-in customer → offer the full portal views
    const own = result ? ownShipments?.find(o => o.tracking_number.toUpperCase() === result.shipment.tracking_number.toUpperCase()) : null;

    return (
        <div className="tracker">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="track-search">
                        <label htmlFor="tracking-number">Tracking number</label>
                        <div className="track-search-row">
                            <div className="auth-input-wrap" style={{ flex: 1 }}>
                                <Search size={18} className="auth-input-icon" aria-hidden="true" />
                                <input
                                    id="tracking-number"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    className="input"
                                    style={{ height: 54, fontSize: '1.05rem', fontFamily: 'monospace', letterSpacing: '0.04em', paddingLeft: '2.75rem' }}
                                    placeholder="e.g. SHP-20240228-AB12"
                                    autoComplete="off"
                                    spellCheck={false}
                                    autoFocus={!q}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" style={{ height: 54, minWidth: 140 }} disabled={loading}>
                                {loading ? <div className="spinner" /> : <>Track <ArrowRight size={17} /></>}
                            </button>
                        </div>
                        <p className="track-search-hint">You’ll find your tracking number on your booking confirmation and invoice.</p>
                    </form>

                    {/* Loading skeleton */}
                    {loading && !result && (
                        <div className="tr-skeleton" aria-busy="true">
                            <div style={{ height: 260 }} />
                            <div style={{ height: 90 }} />
                            <div style={{ height: 300 }} />
                        </div>
                    )}

                    {/* Not found / error */}
                    {error && !loading && (
                        <div className="track-message">
                            <AlertCircle size={40} color="var(--accent)" />
                            {error === 'not_found' ? (
                                <>
                                    <h2>We couldn’t find <span className="track-mono">{q}</span></h2>
                                    <p>Please check the number and try again. Tracking numbers look like <span className="track-mono">SHP-YYYYMMDD-XXXX</span>. New bookings can take a few minutes to appear.</p>
                                </>
                            ) : (
                                <>
                                    <h2>Tracking is temporarily unavailable</h2>
                                    <p>{error}</p>
                                </>
                            )}
                            <div className="track-message-actions">
                                <button className="btn btn-secondary" onClick={() => setReload(r => r + 1)}><RefreshCw size={15} /> Try again</button>
                                <Link href="/contact" className="btn btn-dark">Contact Support</Link>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && !error && (
                        <TrackResult
                            data={result}
                            refreshing={loading}
                            own={own}
                            helpHref={user ? '/dashboard/support' : '/contact'}
                            onRefresh={() => setReload(r => r + 1)}
                            onCopy={copyLink}
                        />
                    )}

                    {/* Empty state */}
                    {!q && (
                        <div className="track-help">
                            {[
                                { icon: <Search size={22} />, title: 'Enter your number', text: 'Type the tracking number from your booking confirmation, e.g. SHP-20240228-AB12.' },
                                { icon: <Truck size={22} />, title: 'Follow every step', text: 'See where your shipment is, from pickup through transit to final delivery.' },
                                { icon: <HelpCircle size={22} />, title: 'Need help?', text: `Call ${contact.phones[0]} or email ${contact.email} and our team will assist.` },
                            ].map(h => (
                                <div key={h.title} className="site-iconbox">
                                    <div className="site-iconbox-icon">{h.icon}</div>
                                    <div><h3>{h.title}</h3><p>{h.text}</p></div>
                                </div>
                            ))}
                        </div>
                    )}

            {!user && (
                <div className="track-cta">
                    <p>Have an account? <Link href={`/login?next=${encodeURIComponent('/dashboard/track')}`}>Sign in</Link> to see all your shipments, invoices and support tickets in one place.</p>
                </div>
            )}
        </div>
    );
}

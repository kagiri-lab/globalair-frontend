import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import PageHero from '@/components/site/PageHero';
import QuoteForm from '@/components/site/QuoteForm';
import { AreasWidget } from '@/components/site/Sidebar';
import ShipLink from '@/components/site/ShipLink';

export const metadata: Metadata = {
    title: 'Request a Quote',
    description: 'Need dependable, cost effective transportation of your commodities? Request a fast quote from Global Air Cargo & Logistics.',
};

const WHY_US = ['Over 10 years experience', 'Private charter flights', 'Reliable service', 'On-time deliveries', 'Professional drivers & pilots', 'Excellent customer service'];

export default function QuotePage() {
    return (
        <>
            <PageHero title="Request a Quote" image="/site/parallax/bg-parallax2.jpg" />
            <section className="site-section">
                <div className="site-container site-with-sidebar">
                    <div>
                        <div className="site-prose" style={{ marginBottom: '2rem' }}>
                            <h3>Get a quote from <span>Global Air Cargo &amp; Logistics</span></h3>
                            <p>Need dependable, cost effective transportation of your commodities? Fill out our easy quote request form below to get a fast quote on your job.</p>
                        </div>
                        <div className="card" style={{ padding: '2rem' }}>
                            <QuoteForm />
                        </div>
                    </div>

                    <aside className="site-sidebar">
                        <div className="card" style={{ borderColor: 'var(--accent)', background: 'rgba(226,52,58,0.04)' }}>
                            <h4 className="site-widget-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Zap size={17} color="var(--accent)" /> Need a price right now?
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Registered customers get instant online quotes and can book shipments directly from their dashboard.
                            </p>
                            <ShipLink className="btn btn-primary btn-full">Get an Instant Quote <ChevronRight size={15} /></ShipLink>
                        </div>
                        <div>
                            <h4 className="site-widget-title">Why choose us?</h4>
                            <ul className="site-checklist">
                                {WHY_US.map(w => <li key={w}><CheckCircle2 size={16} /> {w}</li>)}
                            </ul>
                            <Link href="/contact" className="btn btn-secondary btn-full">Ask Our Experts</Link>
                        </div>
                        <AreasWidget />
                    </aside>
                </div>
            </section>
        </>
    );
}

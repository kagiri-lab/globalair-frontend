import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import PageHero from '@/components/site/PageHero';
import ServiceIcon from '@/components/site/ServiceIcon';
import { SERVICES } from '@/lib/siteContent';

export const metadata: Metadata = {
    title: 'Services',
    description: 'Air charter flights, sea and air freight, forwarding, warehousing, logistics solutions and IT services from Global Air Cargo & Logistics.',
};

export default function ServicesPage() {
    return (
        <>
            <PageHero title="Services" image="/site/parallax/bg-parallax3.jpg" />
            <section className="site-section">
                <div className="site-container">
                    <h2 className="site-title" style={{ maxWidth: 820, marginBottom: '2.5rem' }}>
                        Global Air Cargo Limited is a full service, freight <span>transportation</span> and <span>logistics</span> company.
                    </h2>
                    <div className="site-grid-3">
                        {SERVICES.map(s => (
                            <article key={s.slug} className="site-card">
                                <img src={s.cardImage} alt="" className="site-card-img" />
                                <div className="site-card-body">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div className="site-iconbox-icon" style={{ width: 38, height: 38, borderRadius: 10 }}><ServiceIcon name={s.icon} size={18} /></div>
                                        <h3>{s.title}</h3>
                                    </div>
                                    <p>{s.summary}</p>
                                    <Link href={`/services/${s.slug}`} className="site-link">Read more <ChevronRight size={15} /></Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <div className="site-promo dark">
                <div className="site-container">
                    <h2>Contact us now to get a quote for all your global shipping and cargo needs.</h2>
                    <Link href="/quote" className="btn btn-primary">Request a Quote <ChevronRight size={15} /></Link>
                </div>
            </div>
        </>
    );
}

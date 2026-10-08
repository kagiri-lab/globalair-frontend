import type { Metadata } from 'next';
import { Star } from 'lucide-react';
import PageHero from '@/components/site/PageHero';
import Sidebar from '@/components/site/Sidebar';
import { COMPANY_LINKS, TESTIMONIALS } from '@/lib/siteContent';

export const metadata: Metadata = {
    title: 'Testimonials',
    description: 'What our clients say about Global Air Cargo & Logistics.',
};

export default function TestimonialsPage() {
    return (
        <>
            <PageHero title="Testimonials" image="/site/parallax/bg-parallax3.jpg" crumbs={[{ href: '/about', label: 'About us' }]} />
            <section className="site-section">
                <div className="site-container site-with-sidebar">
                    <div>
                        <img src="/site/img-single/clients2.jpg" alt="Our clients" className="site-img" />
                        <div className="site-prose" style={{ marginTop: '2.5rem' }}>
                            <h3>What clients <span>say.</span></h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {TESTIMONIALS.map(t => (
                                <figure key={t.author} className="site-testimonial">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                        <figcaption style={{ fontWeight: 700 }}>{t.author}</figcaption>
                                        <div style={{ display: 'flex', gap: 2 }} aria-label="5 out of 5 stars">
                                            {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />)}
                                        </div>
                                    </div>
                                    <blockquote>“{t.quote}”</blockquote>
                                </figure>
                            ))}
                        </div>
                    </div>
                    <Sidebar links={COMPANY_LINKS} active="/testimonials" />
                </div>
            </section>
        </>
    );
}

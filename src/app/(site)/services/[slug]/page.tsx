import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import PageHero from '@/components/site/PageHero';
import { SideNav, HelpBox } from '@/components/site/Sidebar';
import { Accordion, Tabs } from '@/components/site/Disclosure';
import { getService, SERVICES, type ServiceSection } from '@/lib/siteContent';
import ShipLink from '@/components/site/ShipLink';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
    return SERVICES.map(s => ({ slug: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const service = getService((await params).slug);
    return service ? { title: service.title, description: service.summary } : {};
}

function Section({ section }: { section: ServiceSection }) {
    switch (section.type) {
        case 'features':
            return (
                <div>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.25rem' }}>{section.heading}</h4>
                    <div className="site-grid-2" style={{ gap: '1rem' }}>
                        {section.items.map(f => (
                            <div key={f.title} className="card">
                                <h5 style={{ fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle2 size={17} color="var(--accent)" /> {f.title}
                                </h5>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'lists':
            return (
                <div className="site-grid-2" style={{ gap: '2rem' }}>
                    {section.items.map(l => (
                        <div key={l.heading}>
                            <img src={l.image} alt="" className="site-img" style={{ height: 200, marginBottom: '1.25rem' }} />
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>{l.heading}</h4>
                            <ul className="site-checklist">
                                {l.points.map(p => <li key={p}><CheckCircle2 size={16} /> {p}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            );
        case 'tabs':
        case 'accordion':
            return (
                <div>
                    {section.heading && <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.25rem' }}>{section.heading}</h4>}
                    {section.type === 'tabs' ? <Tabs items={section.items} /> : <Accordion items={section.items} />}
                </div>
            );
    }
}

export default async function ServiceDetailPage({ params }: Props) {
    const service = getService((await params).slug);
    if (!service) notFound();

    const [mainImage, ...moreImages] = service.images;

    return (
        <>
            <PageHero title={service.title} image="/site/parallax/bg-parallax3.jpg" crumbs={[{ href: '/services', label: 'Services' }]} />
            <section className="site-section">
                <div className="site-container site-with-sidebar">
                    <div>
                        <img src={mainImage} alt={service.title} className="site-img" style={{ maxHeight: 420 }} />
                        {moreImages.length > 0 && (
                            <div className="site-grid-2" style={{ marginTop: '1rem', gap: '1rem' }}>
                                {moreImages.map(img => <img key={img} src={img} alt="" className="site-img" style={{ height: 200 }} />)}
                            </div>
                        )}

                        <div className="site-prose" style={{ marginTop: '2.5rem' }}>
                            <h3>Service <span>overview</span></h3>
                            {service.overview.map(p => <p key={p}>{p}</p>)}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '2rem' }}>
                            {service.sections.map((s, i) => <Section key={i} section={s} />)}
                        </div>
                    </div>

                    <aside className="site-sidebar">
                        <SideNav links={SERVICES.map(s => ({ href: `/services/${s.slug}`, label: s.title }))} active={`/services/${service.slug}`} />
                        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                            <h4 className="site-widget-title">Ready to ship?</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                Get a tailored quote from our team, or book and track your shipment online.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <Link href="/quote" className="btn btn-primary btn-full">Request a Quote <ChevronRight size={15} /></Link>
                                <ShipLink className="btn btn-secondary btn-full">Ship Online</ShipLink>
                            </div>
                        </div>
                        <HelpBox />
                    </aside>
                </div>
            </section>
        </>
    );
}

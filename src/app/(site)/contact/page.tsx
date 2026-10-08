import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import PageHero from '@/components/site/PageHero';
import ContactForm from '@/components/site/ContactForm';
import { getSiteContact, telHref } from '@/lib/siteInfo';

export const metadata: Metadata = {
    title: 'Contact Us',
    description: 'Contact Global Air Cargo & Logistics — offices in Nairobi, Mogadishu, Bossaso and Dubai.',
};

export default async function ContactPage() {
    const contact = await getSiteContact();
    return (
        <>
            <PageHero title="Contact Us" image="/site/parallax/bg-parallax2.jpg" />

            <section className="site-section" style={{ paddingBottom: '3rem' }}>
                <div className="site-container site-grid-4">
                    {contact.offices.map(o => (
                        <div key={o.name} className="card">
                            <p className="site-eyebrow" style={{ marginBottom: '0.3rem' }}>Global Air Cargo {o.region}</p>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{o.name}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                                <MapPin size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: 3 }} />
                                <span>{o.lines.map(l => <span key={l} style={{ display: 'block' }}>{l}</span>)}</span>
                            </p>
                            {o.phones.map(p => (
                                <a key={p} href={telHref(p)} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', marginBottom: '0.25rem' }}>
                                    <Phone size={14} color="var(--accent)" /> {p}
                                </a>
                            ))}
                            <a href={`mailto:${o.email || contact.email}`} style={{ fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', marginTop: '0.5rem' }}>
                                <Mail size={14} /> {o.email || contact.email}
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {contact.map_embed && <iframe src={contact.map_embed} title={`${contact.company} — ${contact.address}`} width="100%" height="420" style={{ border: 0, display: 'block' }} loading="lazy" allowFullScreen />}

            <section className="site-section">
                <div className="site-container site-with-sidebar left">
                    <div>
                        <div className="site-prose">
                            <h3>Opening <span>hours</span></h3>
                            <p>Find out opening hours and information for Global Air Cargo &amp; Logistics.</p>
                        </div>
                        <ul className="site-checklist" style={{ gap: '0.75rem' }}>
                            {contact.opening_hours.map(h => (
                                <li key={h.day}><Clock size={16} /> <span><strong style={{ color: 'var(--text-primary)' }}>{h.day}:</strong> {h.hours}</span></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <div className="site-prose">
                            <h3>Send us a <span>message</span></h3>
                            <p>Please fill out the following form and a representative will contact you.</p>
                        </div>
                        <ContactForm />
                    </div>
                </div>
            </section>
        </>
    );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Plane, Truck, Package, Forward, Ship, Globe, UserPlus, Calculator, MapPin } from 'lucide-react';
import HeroSlider from '@/components/site/HeroSlider';
import TestimonialCarousel from '@/components/site/TestimonialCarousel';
import ContactForm from '@/components/site/ContactForm';
import TrackForm from '@/components/site/TrackForm';
import { CLIENTS } from '@/lib/siteContent';
import { getSiteContact } from '@/lib/siteInfo';
import ShipLink from '@/components/site/ShipLink';
import ShippingCountries from '@/components/site/ShippingCountries';

export async function generateMetadata(): Promise<Metadata> {
    const { company } = await getSiteContact();
    return {
        title: { absolute: `${company} — Air Charter, Freight & Logistics in Kenya and Somalia` },
        description: 'Air charter flights, bulk cargo handling, freight forwarding, customs clearance and warehousing across Kenya, Somalia and East Africa. Ship and track online.',
    };
}

const HIGHLIGHTS = [
    {
        image: '/site/imagebox/4.jpg',
        title: 'Why choose Global Air Cargo & Logistics?',
        text: 'At Global Air Cargo, we know time is of the essence. We have used our legacy Truckload service in the East African and Somalia regions to shape what our company is today.',
        href: '/about',
    },
    {
        image: '/site/imagebox/5.jpg',
        title: 'Are you optimising your warehouse space?',
        text: 'Warehousing, storage and 3PL services offered by Global Air Cargo have become an integral part of our clients’ requirements, as they continue to demand increased savings and efficiencies.',
        href: '/services/warehousing-and-storage',
    },
    {
        image: '/site/imagebox/3.jpg',
        title: 'The gallery of Global Air Cargo & Logistics',
        text: 'Some images highlighting our warehouse, transport, cargo and logistics expertise.',
        href: '/gallery',
    },
];

const OFFERINGS = [
    { icon: Plane, title: 'Air Charter Flights', text: 'We operate charter flights in Somalia from Mogadishu to Guriel, Adado, Abudwaq, Dhusamareb and more.', href: '/services/air-charter-flights' },
    { icon: Truck, title: 'Bulk Cargo Handling', text: 'We provide bulk cargo transportation to destinations within the East African region.', href: '/services/logistics-solutions' },
    { icon: Package, title: 'Diplomatic / NGO Parcels', text: 'Storage and distribution of officially procured goods, diplomatic pouches and confidential documents for NGOs, embassies and humanitarian agencies.', href: '/contact' },
    { icon: Forward, title: 'Forwarding Services', text: 'With our extensive network, we will find a competitive and efficient solution to your next assignment.', href: '/services/forwarding-services' },
    { icon: Ship, title: 'Sea and Air Freight', text: 'By using a combination of sea and air freight, you bring added flexibility to your supply chain.', href: '/services/sea-and-air-freight' },
    { icon: Globe, title: 'Customs Clearance', text: 'We advise clients in preparing import documents, completing appraisal and examination procedures, and payments.', href: '/services/forwarding-services' },
];

const RELIABILITY = [
    { image: '/site/blog/b10.jpg', text: 'The company’s entire infrastructure – its systems, services, facilities and personnel – has been developed largely in direct response to the transportation needs of the East African region’s commercial sectors.' },
    { image: '/site/blog/b7.jpg', text: 'Our flight charters facilitate access to common logistics services, providing logistics coordination and information management in support of operational decision-making and improving response efficiency.' },
    { image: '/site/blog/b8.jpg', text: 'Road transportation between key strategic locations is available on request, and sea cargo shipping runs on a regular basis via vessel from Mombasa to the main Somali ports.' },
];

const PORTAL_STEPS = [
    { icon: UserPlus, title: 'Create an account', text: 'Register in minutes to access your shipping dashboard.' },
    { icon: Calculator, title: 'Get an instant quote', text: 'Add your items and locations to see pricing straight away.' },
    { icon: MapPin, title: 'Track every step', text: 'Follow your shipment live from pickup to delivery.' },
];

export default async function HomePage() {
    const contact = await getSiteContact();
    return (
        <>
            <HeroSlider />

            {/* ── Track bar ──────────────────────────────────────────────── */}
            <div className="site-trackbar">
                <div className="site-container">
                    <div className="site-trackbar-card">
                        <h2>Track your shipment <small>Live status from pickup to delivery</small></h2>
                        <TrackForm className="site-trackbar-form" />
                        <div className="site-trackbar-links">
                            <ShipLink className="btn btn-secondary" style={{ height: 46 }}>Ship Now</ShipLink>
                            <Link href="/quote" className="btn btn-dark" style={{ height: 46 }}>Get a Quote</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Countries we ship to (managed in Settings → Website content) ── */}
            <ShippingCountries />

            {/* ── Highlights ─────────────────────────────────────────────── */}
            <section className="site-section">
                <div className="site-container">
                    <div className="site-grid-3">
                        {HIGHLIGHTS.map(h => (
                            <article key={h.title} className="site-card">
                                <img src={h.image} alt="" className="site-card-img" />
                                <div className="site-card-body">
                                    <h3>{h.title}</h3>
                                    <p>{h.text}</p>
                                    <Link href={h.href} className="site-link">Read more <ChevronRight size={15} /></Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <div className="site-promo">
                <div className="site-container">
                    <h2>We are honored to be a leading and reliable partner in the field of logistics in Somalia and Kenya.</h2>
                    <Link href="/contact" className="btn btn-dark">Contact Us <ChevronRight size={15} /></Link>
                </div>
            </div>

            {/* ── What we offer ──────────────────────────────────────────── */}
            <section className="site-section">
                <div className="site-container">
                    <div className="site-center" style={{ marginBottom: '3rem' }}>
                        <p className="site-eyebrow">Our Services</p>
                        <h2 className="site-title">What we <span>offer.</span></h2>
                    </div>
                    <div className="site-grid-3">
                        {OFFERINGS.map(o => (
                            <Link key={o.title} href={o.href} className="site-iconbox">
                                <div className="site-iconbox-icon"><o.icon size={24} /></div>
                                <div>
                                    <h3>{o.title}</h3>
                                    <p>{o.text}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                    <div className="site-center" style={{ marginTop: '2.5rem' }}>
                        <Link href="/services" className="btn btn-secondary">View all services <ChevronRight size={15} /></Link>
                    </div>
                </div>
            </section>

            {/* ── CTA band ───────────────────────────────────────────────── */}
            <section className="site-band" style={{ backgroundImage: 'url(/site/parallax/bg-parallax4.jpg)' }}>
                <div className="site-container site-center">
                    <h2>From around the corner to<br />around the globe.</h2>
                    <p>We will take care of your cargo or your passenger and deliver them safe and on time.</p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/quote" className="btn btn-primary btn-lg">Make a Quote <ChevronRight size={17} /></Link>
                        <Link href="/contact" className="btn btn-outline-light btn-lg">Contact Us <ChevronRight size={17} /></Link>
                    </div>
                </div>
            </section>

            {/* ── Ship online ────────────────────────────────────────────── */}
            <section className="site-section alt">
                <div className="site-container">
                    <div className="site-center" style={{ marginBottom: '3rem' }}>
                        <p className="site-eyebrow">Ship Online</p>
                        <h2 className="site-title">Book and manage shipments <span>from anywhere.</span></h2>
                        <p className="site-lead">Our online shipping portal lets you get quotes, book shipments, save addresses and track deliveries in real time.</p>
                    </div>
                    <div className="site-grid-3">
                        {PORTAL_STEPS.map((s, i) => (
                            <div key={s.title} className="card site-center" style={{ padding: '2rem 1.5rem' }}>
                                <div className="site-iconbox-icon" style={{ margin: '0 auto 1rem' }}><s.icon size={24} /></div>
                                <p className="site-eyebrow" style={{ marginBottom: '0.3rem' }}>Step {i + 1}</p>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>{s.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{s.text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="site-center" style={{ marginTop: '2.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/register" className="btn btn-primary btn-lg">Create Free Account <ChevronRight size={17} /></Link>
                        <Link href="/portal" className="btn btn-secondary btn-lg">How it works</Link>
                    </div>
                </div>
            </section>

            {/* ── Dependability ──────────────────────────────────────────── */}
            <section className="site-section">
                <div className="site-container">
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 className="site-title">Dependability &amp; Reliability <span>is all that matters.</span></h2>
                    </div>
                    <div className="site-grid-3">
                        {RELIABILITY.map(r => (
                            <article key={r.image} className="site-card">
                                <img src={r.image} alt="" className="site-card-img" />
                                <div className="site-card-body"><p>{r.text}</p></div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Clients ────────────────────────────────────────────────── */}
            <section className="site-section alt" style={{ padding: '3.5rem 0' }}>
                <div className="site-container">
                    <p className="site-eyebrow site-center" style={{ marginBottom: '1.5rem' }}>Trusted by leading organisations</p>
                    <div className="site-logos">
                        {CLIENTS.map(c => (
                            <div key={c.name} className="site-logo-tile" title={c.name}>
                                <img src={c.logo} alt={c.name} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials ───────────────────────────────────────────── */}
            <section className="site-band" style={{ backgroundImage: 'url(/site/banner.jpg)', padding: '5rem 0' }}>
                <div className="site-container">
                    <h2 className="site-center" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)', marginBottom: '2rem' }}>Testimonials</h2>
                    <TestimonialCarousel />
                </div>
            </section>

            {/* ── Quick quote + map ──────────────────────────────────────── */}
            <section className="site-section">
                <div className="site-container site-grid-2" style={{ gap: '3rem', alignItems: 'start' }}>
                    <div>
                        <p className="site-eyebrow">Get in touch</p>
                        <h2 className="site-title">Request a quick quote.</h2>
                        <p className="site-lead" style={{ marginBottom: '1.75rem' }}>
                            Fill out the form to get your quote within the hour. We guarantee safe and timely delivery of your products.
                        </p>
                        <ContactForm defaultSubject="Quick quote request" kind="quote" />
                    </div>
                    {contact.map_embed && <iframe
                        src={contact.map_embed}
                        title={`${contact.company} — ${contact.address}`}
                        width="100%"
                        height="520"
                        style={{ border: 0, borderRadius: 14 }}
                        loading="lazy"
                        allowFullScreen
                    />}
                </div>
            </section>
        </>
    );
}

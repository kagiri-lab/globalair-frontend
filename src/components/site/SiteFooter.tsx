import Link from 'next/link';
import { Mail, Phone, MapPin, ArrowRight, PackageSearch } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { getSiteContact, getSiteBrand, getSiteFooter, brandSrc, telHref } from '@/lib/siteInfo';
import { countryFlag } from '@/lib/countries';
import SocialLinks from './SocialLinks';
import TrackForm from './TrackForm';
import FooterAccountLinks from './FooterAccountLinks';
import ShipLink from './ShipLink';
import BackToTop from './BackToTop';

const COMPANY_LINKS = [
    { href: '/about', label: 'About us' },
    { href: '/services', label: 'Services' },
    { href: '/company-history', label: 'Our history' },
    { href: '/partners', label: 'Partners' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/testimonials', label: 'Testimonials' },
    { href: '/contact', label: 'Contact us' },
];

export default async function SiteFooter() {
    // Everything here comes from Settings: Business (contacts, offices) and Website content (footer description)
    const [contact, brand, footer] = await Promise.all([getSiteContact(), getSiteBrand(), getSiteFooter()]);
    const whatsapp = contact.whatsapp?.replace(/\D/g, '');

    return (
        <>
            <footer className="site-footer">
                {/* ── Call to action + tracking ── */}
                <div className="site-footer-cta">
                    <div className="site-container">
                        <div className="site-footer-cta-text">
                            <h2>Ready to ship?</h2>
                            <p>Get an instant price online, or ask us for a quote on anything, anywhere we go.</p>
                            <div className="site-footer-cta-actions">
                                <Link href="/quote" className="btn btn-dark">Get a quote <ArrowRight size={16} /></Link>
                                <ShipLink className="btn btn-outline-light">Ship online</ShipLink>
                            </div>
                        </div>
                        <div className="site-footer-track-card">
                            <p><PackageSearch size={18} /> Track your shipment</p>
                            <TrackForm className="site-footer-track" buttonClassName="btn btn-dark" />
                        </div>
                    </div>
                </div>

                <div className="site-footer-main">
                    <div className="site-container">
                        <div className="site-footer-grid">
                            {/* ── Brand & quick contact ── */}
                            <div className="site-footer-brand">
                                <img src={brandSrc('logo_dark', brand)} alt={contact.company} />
                                {footer.about && <p>{footer.about}</p>}
                                <div className="site-footer-reach">
                                    {contact.phones[0] && <a href={telHref(contact.phones[0])}><Phone size={15} /> {contact.phones[0]}</a>}
                                    {contact.email && <a href={`mailto:${contact.email}`}><Mail size={15} /> {contact.email}</a>}
                                    {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={15} /> Chat on WhatsApp</a>}
                                </div>
                                <div className="site-social">
                                    <SocialLinks social={contact.social} />
                                </div>
                            </div>

                            <nav className="site-footer-col" aria-label="Company">
                                <h4>Company</h4>
                                <ul>{COMPANY_LINKS.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
                            </nav>

                            <nav className="site-footer-col" aria-label="Ship online">
                                <FooterAccountLinks />
                            </nav>

                            {contact.offices.length > 0 && (
                                <div className="site-footer-col site-footer-col-wide">
                                    <h4>Our offices</h4>
                                    <div className="site-footer-offices">
                                        {contact.offices.map(o => (
                                            <div key={`${o.region}-${o.name}`} className="site-footer-office">
                                                <span className="site-footer-office-flag" aria-hidden="true">{countryFlag(o.region) || <MapPin size={14} />}</span>
                                                <div>
                                                    <strong>{o.name}</strong>
                                                    {o.phones[0] && <a href={telHref(o.phones[0])}><Phone size={12} /> {o.phones[0]}</a>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="site-footer-bottom">
                    <div className="site-container">
                        <span>© {new Date().getFullYear()} {contact.company}. All rights reserved.</span>
                    </div>
                </div>
            </footer>

            <BackToTop />

            {whatsapp && (
                <a className="site-whatsapp" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
                    <WhatsAppIcon size={22} /> <span>Talk to us</span>
                </a>
            )}
        </>
    );
}

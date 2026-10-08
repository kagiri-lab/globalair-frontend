'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Phone, Mail } from 'lucide-react';
import '@/app/(site)/site.css';
import { useBrandSrc, useSiteContact } from '@/components/SiteInfoProvider';
import { telHref } from '@/lib/siteInfo';

const BENEFITS = [
    'Instant quotes for air, sea and road freight',
    'Book shipments and save your addresses',
    'Live tracking from pickup to delivery',
    'Download invoices and get support in one place',
];

interface Props {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footer: React.ReactNode;
}

// Split-screen layout shared by the sign-in and registration pages
export default function AuthShell({ title, subtitle, children, footer }: Props) {
    const logoSrc = useBrandSrc('logo');
    const contact = useSiteContact();
    const { company } = contact;
    return (
        <div className="site-theme auth-page">
            <aside className="auth-brand" style={{ backgroundImage: 'url(/site/slides/2.jpg)' }}>
                <Link href="/" className="auth-brand-logo">
                    <img src={logoSrc} alt={company} />
                </Link>

                <div>
                    <p className="auth-brand-eyebrow">Shipping Portal</p>
                    <h1>From around the corner to around the globe.</h1>
                    <ul className="auth-benefits">
                        {BENEFITS.map(b => <li key={b}><CheckCircle2 size={18} /> {b}</li>)}
                    </ul>
                </div>

                <div className="auth-brand-contact">
                    <span>Need help?</span>
                    {contact.phones[0] && <a href={telHref(contact.phones[0])}><Phone size={14} /> {contact.phones[0]}</a>}
                    <a href={`mailto:${contact.email}`}><Mail size={14} /> {contact.email}</a>
                </div>
            </aside>

            <main className="auth-main">
                <div className="auth-topbar">
                    <Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to website</Link>
                    <Link href="/track" className="auth-back">Track a shipment</Link>
                </div>

                <div className="auth-panel">
                    <Link href="/" className="auth-mobile-logo">
                        <img src={logoSrc} alt={company} />
                    </Link>
                    <div className="auth-heading">
                        <h2>{title}</h2>
                        <p>{subtitle}</p>
                    </div>
                    {children}
                    <div className="auth-footer">{footer}</div>
                </div>

                <p className="auth-copyright">© {new Date().getFullYear()} {contact.company}</p>
            </main>
        </div>
    );
}

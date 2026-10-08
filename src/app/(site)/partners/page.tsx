import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import PageHero from '@/components/site/PageHero';
import Sidebar from '@/components/site/Sidebar';
import { COMPANY_LINKS, PARTNERS } from '@/lib/siteContent';
import { getSiteContact } from '@/lib/siteInfo';

export const metadata: Metadata = {
    title: 'Partners',
    description: 'Your full support logistics partner — from pickup and packaging to transportation and fleet management.',
};

export default async function PartnersPage() {
    const { phones } = await getSiteContact();
    return (
        <>
            <PageHero title="Partners" image="/site/parallax/bg-parallax3.jpg" crumbs={[{ href: '/about', label: 'About us' }]} />
            <section className="site-section">
                <div className="site-container site-with-sidebar">
                    <div>
                        <div className="site-prose">
                            <h3>Logistic <span>partner</span></h3>
                            <p>We are your full support partner and very happy to take care of all your logistic needs. We can do more than simply take your cargo from origin to destination. We can pick it up, sort it, package it and take care of all additional processes. We can also manage all your transportation needs.</p>
                            <p>You can also decide to outsource your fleet with or without your employees. By doing this you will achieve a higher efficiency and a better focus on your core business. You will have the assurance your logistic processes are in the best of hands.</p>
                        </div>

                        <div className="site-grid-4" style={{ margin: '2rem 0' }}>
                            {PARTNERS.map(p => (
                                <div key={p.name} className="site-logo-tile" title={p.name} style={{ height: 120 }}>
                                    <img src={p.logo} alt={p.name} />
                                </div>
                            ))}
                        </div>

                        <div className="site-promo" style={{ borderRadius: 12 }}>
                            <div className="site-container">
                                <h2>Would you like to learn more? Call {phones[0]}</h2>
                                <Link href="/contact" className="btn btn-dark">Contact <ChevronRight size={15} /></Link>
                            </div>
                        </div>
                    </div>
                    <Sidebar links={COMPANY_LINKS} active="/partners" />
                </div>
            </section>
        </>
    );
}

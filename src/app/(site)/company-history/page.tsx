import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import Sidebar from '@/components/site/Sidebar';
import { COMPANY_LINKS } from '@/lib/siteContent';

export const metadata: Metadata = {
    title: 'Company History',
    description: 'The story of Global Air Cargo & Logistics — express airfreight and shipping across East Africa and the Middle East.',
};

export default function CompanyHistoryPage() {
    return (
        <>
            <PageHero title="Company History" image="/site/parallax/bg-parallax3.jpg" crumbs={[{ href: '/about', label: 'About us' }]} />
            <section className="site-section">
                <div className="site-container site-with-sidebar">
                    <div>
                        <img src="/site/img-single/ch.jpg" alt="Global Air Cargo operations" className="site-img" />
                        <div className="site-prose" style={{ marginTop: '2.5rem' }}>
                            <h3>Company <span>history</span></h3>
                            <p>
                                <strong className="site-accent">At Global Air Cargo &amp; Logistics Ltd</strong> we provide personalized services that are best suited to meet our clients’ business needs. We provide express airfreight and shipping services for both the industrial and commercial sectors, as well as individual clients, charities and organizations. We deliver to numerous East African and Middle Eastern destinations and ensure air freight shipments arrive within 1–3 days.
                            </p>
                            <p>Our experienced staff can offer you a wealth of information and advice, helping you to select the right shipping option for your business needs wherever you need to send.</p>
                            <p>Our Director has been actively involved in the construction of most airstrips in Somalia, giving us an added advantage in the field of logistics — from the landing of aircraft to offering the best solutions in those areas. We have great partnerships with all airlines around Somalia and we co-own some of the aircraft in Somalia, making our prices very competitive.</p>
                        </div>
                    </div>
                    <Sidebar links={COMPANY_LINKS} active="/company-history" />
                </div>
            </section>
        </>
    );
}

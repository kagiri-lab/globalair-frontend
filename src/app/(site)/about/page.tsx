import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import PageHero from '@/components/site/PageHero';
import Sidebar from '@/components/site/Sidebar';
import { Tabs } from '@/components/site/Disclosure';
import { COMPANY_LINKS } from '@/lib/siteContent';

export const metadata: Metadata = {
    title: 'About Us',
    description: 'Global Air Cargo & Logistics — an accredited, family-run logistics company with over ten years of experience in the airline industry.',
};

const SAFETY_SECURITY = [
    {
        title: 'Safety',
        paragraphs: [
            'At Global Air Cargo & Logistics Ltd, ensuring the safety of our customers, employees and our communities is our priority. We understand the importance of continuous training and are proud of our safety knowledge, experienced staff and ability to exceed industry standards year after year. We have established and continually maintain excellent motor carrier safety ratings and low accident frequencies.',
            'As a company, we have a solid safety performance history and will continue to be a leader in the area of safety and compliance, due to the dedication and professionalism of our fleet of pilots, drivers and vehicle maintenance personnel.',
        ],
    },
    {
        title: 'Security',
        paragraphs: [
            'At Global Air Cargo & Logistics Ltd, we offer industry-leading asset protection and security compliance programs.',
            'Global Air Cargo & Logistics Ltd understands that our customers may have important and unique needs related to homeland security regulatory compliance, high-risk products, or brand protection. We offer consultation and proactive partnership to ensure that our customers’ security needs are met.',
            'By leveraging modern and proven technologies, we provide for the integrity of customer assets while in-transit or at one of our facilities.',
        ],
    },
];

export default function AboutPage() {
    return (
        <>
            <PageHero title="About Us" image="/site/parallax/bg-parallax2.jpg" />
            <section className="site-section">
                <div className="site-container site-with-sidebar">
                    <div>
                        <img src="/site/about/9.jpg" alt="Global Air Cargo aircraft" className="site-img" style={{ height: 380 }} />
                        <div className="site-grid-2" style={{ marginTop: '1rem', gap: '1rem' }}>
                            <img src="/site/about/2.jpg" alt="" className="site-img" style={{ height: 180 }} />
                            <img src="/site/about/3.jpg" alt="" className="site-img" style={{ height: 180 }} />
                        </div>

                        <div className="site-prose" style={{ marginTop: '2.5rem' }}>
                            <h3>Company <span>overview</span></h3>
                            <p>Global Air Cargo &amp; Logistics is an accredited travel agent well known for its reliable and dependable services. With ten years of experience in the airline industry, we carry with us strategic partnerships with relevant airlines such as African Express Airways, Astral Aviation, Jubba Airways and Daallo Airlines, to name but a few. It is through these services that the management detected a need by many of our clients to provide them with customized courier &amp; charter solutions.</p>
                            <p>Profit is not the legitimate purpose of business. The legitimate purpose of business is to provide a product or service that people need and do it so well that it’s profitable. Here at Global Air Cargo &amp; Logistics we provide personalized services that are best suited to meet our clients’ business needs.</p>
                            <p>Our family-run business values hard work, respect, commitment and teamwork and our workplace is characterized by the high energy, enthusiasm and effort of our employees who thrive in this positive environment. We are committed to providing our customers with first-rate service, which starts with our employees’ dedication to our enterprise of services.</p>
                            <p>The commitment we have to safety and security is unmatched. We pride ourselves on posting industry leading Compliance, Safety, Accountability (CSA) scores, as well as an industry low claims ratio to give you and your customers peace of mind when your freight is in our hands. Our primary obligation to our customers and our community starts with the hiring and training of our team members and our pledge to put the safest drivers and equipment on the road.</p>
                            <p>From our experienced drivers and pilots to our knowledgeable office staff, Global Air Cargo &amp; Logistics has the desire and commitment to work hand-in-hand to develop a transportation solution that is truly customized to your needs.</p>
                        </div>

                        <div className="card" style={{ background: 'var(--bg-secondary)', margin: '2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <p style={{ fontWeight: 700, maxWidth: 440 }}>We will take care of your cargo or your passenger and deliver them safe and on time.</p>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <Link href="/contact" className="btn btn-dark">Contact Us <ChevronRight size={15} /></Link>
                                <Link href="/services" className="btn btn-secondary">View Services <ChevronRight size={15} /></Link>
                            </div>
                        </div>

                        <div className="site-grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
                            <Tabs items={SAFETY_SECURITY} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <img src="/site/img-single/1.jpg" alt="" className="site-img" />
                                <img src="/site/img-single/2.jpg" alt="" className="site-img" />
                            </div>
                        </div>
                    </div>
                    <Sidebar links={COMPANY_LINKS} active="/about" />
                </div>
            </section>
        </>
    );
}

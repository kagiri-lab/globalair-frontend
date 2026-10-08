import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import './(site)/site.css';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import TrackForm from '@/components/site/TrackForm';

export default function NotFound() {
    return (
        <div className="site-theme">
            <SiteHeader />
            <main className="site-section">
                <div className="site-container site-center" style={{ maxWidth: 640 }}>
                    <img src="/site/404.png" alt="" style={{ maxWidth: 280, margin: '0 auto 2rem', display: 'block' }} />
                    <h1 className="site-title">Page not found</h1>
                    <p className="site-lead" style={{ marginBottom: '2rem' }}>
                        The page you were looking for doesn’t exist or has moved. Try one of these instead, or track a shipment below.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                        <Link href="/" className="btn btn-primary">Back to Home <ChevronRight size={15} /></Link>
                        <Link href="/services" className="btn btn-secondary">Our Services</Link>
                        <Link href="/contact" className="btn btn-secondary">Contact Us</Link>
                    </div>
                    <TrackForm className="site-trackbar-form" />
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}

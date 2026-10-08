import type { Metadata } from 'next';
import PageHero from '@/components/site/PageHero';
import GalleryGrid from './GalleryGrid';

export const metadata: Metadata = {
    title: 'Gallery',
    description: 'Photos of our warehouse, cargo, transport and logistics operations.',
};

export default function GalleryPage() {
    return (
        <>
            <PageHero title="Gallery" image="/site/parallax/bg-parallax2.jpg" />
            <section className="site-section">
                <div className="site-container">
                    <GalleryGrid />
                </div>
            </section>
        </>
    );
}

import Link from 'next/link';
import { MapPin } from 'lucide-react';

interface Crumb { href?: string; label: string }

export default function PageHero({ title, image = '/site/parallax/bg-parallax2.jpg', crumbs = [] }: { title: string; image?: string; crumbs?: Crumb[] }) {
    return (
        <>
            <section className="site-page-hero" style={{ backgroundImage: `url(${image})` }}>
                <div className="site-container">
                    <h1>{title}</h1>
                </div>
            </section>
            <div className="site-breadcrumbs">
                <div className="site-container">
                    <MapPin size={14} />
                    <span>You are here:</span>
                    <Link href="/">Home</Link>
                    {crumbs.map(c => (
                        <span key={c.label} style={{ display: 'contents' }}>
                            <span>/</span>
                            {c.href ? <Link href={c.href}>{c.label}</Link> : <strong>{c.label}</strong>}
                        </span>
                    ))}
                    <span>/</span>
                    <strong>{title}</strong>
                </div>
            </div>
        </>
    );
}

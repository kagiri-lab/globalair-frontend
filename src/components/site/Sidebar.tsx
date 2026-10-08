import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AREAS_OF_OPERATION } from '@/lib/siteContent';

interface SideLink { href: string; label: string }

export function SideNav({ links, active }: { links: SideLink[]; active: string }) {
    return (
        <nav className="site-side-nav">
            {links.map(l => (
                <Link key={l.href} href={l.href} className={l.href === active ? 'active' : ''}>
                    {l.label} <ChevronRight size={15} />
                </Link>
            ))}
        </nav>
    );
}

export function AreasWidget() {
    return (
        <div className="site-areas">
            <h4 className="site-widget-title">Our Areas of Operations</h4>
            {AREAS_OF_OPERATION.map(a => (
                <div key={a.title}>
                    <h5>{a.title}</h5>
                    <p>{a.places.join(', ')}</p>
                </div>
            ))}
        </div>
    );
}

export function HelpBox() {
    return (
        <div className="site-help-box">
            <h4>How can we help you?</h4>
            <p>Our customer service standards provide information on how we will handle your enquiry. There is also compliments and complaints information to help you when you lodge feedback with us.</p>
            <Link href="/contact" className="btn btn-primary btn-sm">Contact Us <ChevronRight size={14} /></Link>
        </div>
    );
}

export default function Sidebar({ links, active }: { links: SideLink[]; active: string }) {
    return (
        <aside className="site-sidebar">
            <SideNav links={links} active={active} />
            <AreasWidget />
            <HelpBox />
        </aside>
    );
}

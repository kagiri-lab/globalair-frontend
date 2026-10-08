'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

export interface DisclosureItem {
    title: string;
    lead?: string;
    paragraphs?: string[];
    points?: string[];
    footer?: string;
}

function ItemBody({ item }: { item: DisclosureItem }) {
    return (
        <div className="site-prose">
            {item.lead && <p><strong style={{ color: 'var(--text-primary)' }}>{item.lead}</strong></p>}
            {item.paragraphs?.map(p => <p key={p}>{p}</p>)}
            {item.points && (
                <ul className="site-checklist">
                    {item.points.map(pt => <li key={pt}><CheckCircle2 size={16} /> {pt}</li>)}
                </ul>
            )}
            {item.footer && <p>{item.footer}</p>}
        </div>
    );
}

export function Tabs({ items }: { items: DisclosureItem[] }) {
    const [active, setActive] = useState(0);
    return (
        <div>
            <div className="site-tabs-nav" role="tablist">
                {items.map((it, i) => (
                    <button key={it.title} role="tab" aria-selected={i === active} className={i === active ? 'active' : ''} onClick={() => setActive(i)}>
                        {it.title}
                    </button>
                ))}
            </div>
            <div role="tabpanel" key={active} className="fade-in">
                <ItemBody item={items[active]} />
            </div>
        </div>
    );
}

export function Accordion({ items }: { items: DisclosureItem[] }) {
    const [open, setOpen] = useState<number | null>(0);
    return (
        <div>
            {items.map((it, i) => (
                <div key={it.title} className={`site-accordion-item${open === i ? ' open' : ''}`}>
                    <button onClick={() => setOpen(o => (o === i ? null : i))} aria-expanded={open === i}>
                        {it.title} <ChevronDown size={18} />
                    </button>
                    {open === i && (
                        <div className="site-accordion-body fade-in">
                            <ItemBody item={it} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

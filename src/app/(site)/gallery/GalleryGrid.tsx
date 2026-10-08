'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { GALLERY, type GalleryCategory } from '@/lib/siteContent';

const FILTERS: ('All' | GalleryCategory)[] = ['All', 'Warehouse', 'Cargo', 'Transport', 'Logistics'];

export default function GalleryGrid() {
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
    // Position in the filtered list, so the arrows move through what's on screen
    const [open, setOpen] = useState<number | null>(null);
    const touchX = useRef<number | null>(null);

    const items = filter === 'All' ? GALLERY : GALLERY.filter(g => g.category === filter);
    const current = open !== null ? items[open] : null;

    const close = useCallback(() => setOpen(null), []);
    // Wraps around, so "next" on the last image goes back to the first
    const step = useCallback((dir: number) => setOpen(i => (i === null ? i : (i + dir + items.length) % items.length)), [items.length]);

    useEffect(() => {
        if (open === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowRight') step(1);
            else if (e.key === 'ArrowLeft') step(-1);
        };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); };
    }, [open, close, step]);

    // Load the neighbours early so moving through the gallery feels instant
    useEffect(() => {
        if (open === null || items.length < 2) return;
        [1, -1].forEach(d => { new Image().src = items[(open + d + items.length) % items.length].image; });
    }, [open, items]);

    // Swipe left/right on phones and tablets
    const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    };

    return (
        <>
            <div className="site-filter" role="tablist">
                {FILTERS.map(f => (
                    <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>
                ))}
            </div>

            <div className="site-grid-3">
                {items.map((g, i) => (
                    <button key={g.image} className="site-gallery-item fade-in" onClick={() => setOpen(i)} aria-label={`View ${g.title}`}>
                        <img src={g.image} alt={g.title} loading="lazy" />
                        <div className="site-gallery-caption">
                            <strong>{g.title}</strong>
                            <span>{g.category}</span>
                        </div>
                    </button>
                ))}
            </div>

            {current && open !== null && (
                <div className="site-lightbox" onClick={close} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
                    role="dialog" aria-modal="true" aria-label={`${current.title}, image ${open + 1} of ${items.length}`}>
                    <button className="site-lightbox-close" onClick={close} aria-label="Close"><X size={22} /></button>
                    {items.length > 1 && (
                        <>
                            <button className="site-lightbox-nav prev" onClick={e => { e.stopPropagation(); step(-1); }} aria-label="Previous image"><ChevronLeft size={28} /></button>
                            <button className="site-lightbox-nav next" onClick={e => { e.stopPropagation(); step(1); }} aria-label="Next image"><ChevronRight size={28} /></button>
                        </>
                    )}
                    <figure className="site-lightbox-figure" onClick={e => e.stopPropagation()}>
                        <img key={current.image} src={current.image} alt={current.title} />
                        <figcaption>
                            <span><strong>{current.title}</strong> · {current.category}</span>
                            <span className="site-lightbox-count">{open + 1} / {items.length}</span>
                        </figcaption>
                    </figure>
                </div>
            )}
        </>
    );
}

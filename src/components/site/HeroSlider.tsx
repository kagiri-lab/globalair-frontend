'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { HERO_SLIDES } from '@/lib/siteContent';

type Slide = (typeof HERO_SLIDES)[number];

export default function HeroSlider() {
    const [slides, setSlides] = useState<Slide[]>(HERO_SLIDES);
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);

    // Slides managed from the admin panel take precedence over the defaults
    useEffect(() => {
        api.get('/public/slides').then(r => {
            if (r.data.data && r.data.data.length > 0) {
                setSlides(r.data.data.map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    subtitle: s.subtitle,
                    image: s.image_url,
                    cta: s.cta_text || 'Get Started',
                    cta_link: s.cta_link || '/register',
                })));
                setCurrent(0);
            }
        }).catch(() => { });
    }, []);

    const go = useCallback((dir: number) => setCurrent(c => (c + dir + slides.length) % slides.length), [slides.length]);

    useEffect(() => {
        if (paused || slides.length < 2) return;
        const t = setInterval(() => go(1), 6500);
        return () => clearInterval(t);
    }, [go, paused, slides.length]);

    return (
        <section className="site-hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
            {slides.map((s, i) => (
                <div key={s.id} className={`site-hero-slide${i === current ? ' active' : ''}`} aria-hidden={i !== current}>
                    <img src={s.image} alt="" />
                    <div className="site-hero-content">
                        <div className="site-container" style={{ width: '100%' }}>
                            <div className="site-hero-text">
                                <h1>{s.title}</h1>
                                {s.subtitle && <p>{s.subtitle}</p>}
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <Link href={s.cta_link} className="btn btn-primary btn-lg" tabIndex={i === current ? 0 : -1}>
                                        {s.cta} <ChevronRight size={17} />
                                    </Link>
                                    <Link href="/contact" className="btn btn-dark btn-lg" tabIndex={i === current ? 0 : -1}>
                                        Contact Us
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {slides.length > 1 && (
                <>
                    <button className="site-hero-arrow prev" onClick={() => go(-1)} aria-label="Previous slide"><ChevronLeft size={20} /></button>
                    <button className="site-hero-arrow next" onClick={() => go(1)} aria-label="Next slide"><ChevronRight size={20} /></button>
                    <div className="site-hero-dots">
                        <div className="site-container">
                            {slides.map((s, i) => (
                                <button key={s.id} className={i === current ? 'active' : ''} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`} />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}

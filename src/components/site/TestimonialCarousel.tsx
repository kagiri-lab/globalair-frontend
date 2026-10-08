'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { HOME_TESTIMONIALS } from '@/lib/siteContent';

export default function TestimonialCarousel() {
    const [i, setI] = useState(0);
    const n = HOME_TESTIMONIALS.length;
    const t = HOME_TESTIMONIALS[i];

    useEffect(() => {
        const id = setInterval(() => setI(x => (x + 1) % n), 8000);
        return () => clearInterval(id);
    }, [i, n]);

    return (
        <div className="site-quote-card">
            <Quote size={34} color="var(--accent)" />
            <blockquote key={i} className="fade-in">“{t.quote}”</blockquote>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="site-quote-author">
                    <img src="/site/user.jpg" alt="" />
                    <div>
                        <strong style={{ display: 'block' }}>{t.author}</strong>
                        <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>{t.role}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline-light btn-sm" onClick={() => setI(x => (x - 1 + n) % n)} aria-label="Previous testimonial"><ChevronLeft size={16} /></button>
                    <button className="btn btn-outline-light btn-sm" onClick={() => setI(x => (x + 1) % n)} aria-label="Next testimonial"><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const R = 22;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Floating "scroll to top" button (bottom right): shows after scrolling down, its ring fills with progress */
export default function BackToTop() {
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            setVisible(window.scrollY > 400);
            setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, []);

    const toTop = () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    };

    return (
        <button type="button" className={`site-scrolltop${visible ? ' show' : ''}`} onClick={toTop}
            aria-label="Scroll back to the top" title="Back to top" tabIndex={visible ? 0 : -1} aria-hidden={!visible}>
            <svg viewBox="0 0 52 52" aria-hidden="true" className="site-scrolltop-ring">
                <circle cx="26" cy="26" r={R} className="track" />
                <circle cx="26" cy="26" r={R} className="bar" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - progress)} />
            </svg>
            <ArrowUp size={20} />
        </button>
    );
}

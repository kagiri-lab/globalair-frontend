'use client';

import { useEffect, useState } from 'react';
import { Toaster, toast, resolveValue, type Toast } from 'react-hot-toast';
import { Check, X, Info, AlertTriangle } from 'lucide-react';
import './app-toaster.css';

const DURATION = { success: 3500, error: 6000, blank: 4500 } as const;

// A short heading per kind, so the message underneath can be read at a glance
const HEADINGS: Partial<Record<Toast['type'], string>> = { success: 'Done', error: 'Something went wrong', loading: 'Working on it' };

function Icon({ t }: { t: Toast }) {
    if (t.icon) return <span className="atoast-icon custom">{t.icon}</span>;
    if (t.type === 'loading') return <span className="atoast-icon"><span className="atoast-spin" /></span>;
    const I = t.type === 'success' ? Check : t.type === 'error' ? X : String(resolveValue(t.message, t)).match(/couldn|can’t|cannot|not /i) ? AlertTriangle : Info;
    return <span className="atoast-icon"><I size={14} strokeWidth={3} /></span>;
}

/**
 * App-wide notifications. Same toast() calls everywhere; this only changes how they look:
 * a compact card with a coloured edge and icon, a short heading, the message, a close button
 * and a thin bar showing the time left (paused while hovered).
 */
export default function AppToaster() {
    // Phones: centred at the top; larger screens: top right
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)');
        const update = () => setNarrow(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    return (
        <Toaster
            position={narrow ? 'top-center' : 'top-right'}
            gutter={8}
            containerStyle={{ top: 14, right: 14, left: 14 }}
            toastOptions={{ duration: DURATION.blank, success: { duration: DURATION.success }, error: { duration: DURATION.error } }}
        >
            {t => {
                const heading = HEADINGS[t.type];
                const timed = Number.isFinite(t.duration) && t.type !== 'loading';
                return (
                    <div className={`atoast is-${t.type}${t.visible ? ' in' : ' out'}`} {...t.ariaProps}>
                        <Icon t={t} />
                        <div className="atoast-text">
                            {heading && <strong>{heading}</strong>}
                            <span>{resolveValue(t.message, t)}</span>
                        </div>
                        {t.type !== 'loading' && (
                            <button type="button" className="atoast-close" onClick={() => toast.dismiss(t.id)} aria-label="Dismiss">
                                <X size={14} />
                            </button>
                        )}
                        {timed && <span className="atoast-timer" style={{ animationDuration: `${t.duration}ms` }} />}
                    </div>
                );
            }}
        </Toaster>
    );
}

import { X, ArrowRight } from 'lucide-react';
import { promoBackgroundSrc, promoImageSrc, type PromoSettings } from '@/lib/promo';
import './promo-popup.css';

const external = (url: string) => /^https?:\/\//i.test(url);
const linkProps = (url: string) => (external(url) ? { target: '_blank', rel: 'noopener noreferrer' } : {});

// The popup's card: a flyer image, or a designed message. Shared by the website and the settings preview.
export default function PromoCard({ promo, onClose, onAction, imageSrc, backgroundSrc }: {
    promo: PromoSettings; onClose?: () => void; onAction?: () => void;
    /** Settings preview: load just-uploaded images straight from the API */
    imageSrc?: string; backgroundSrc?: string;
}) {
    const close = onClose && (
        <button type="button" className="promo-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
    );

    if (promo.mode === 'image') {
        const src = imageSrc || promoImageSrc(promo);
        const img = src ? <img src={src} alt={promo.image_alt || 'Special offer'} /> : <div className="promo-image-empty">Upload an image</div>;
        return (
            <div className="promo-card promo-image">
                {close}
                {promo.image_link ? <a href={promo.image_link} onClick={onAction} {...linkProps(promo.image_link)}>{img}</a> : img}
            </div>
        );
    }

    const bg = promo.background ? backgroundSrc || promoBackgroundSrc(promo) : '';
    return (
        <div className={`promo-card promo-content theme-${promo.theme} align-${promo.align}${bg ? ' has-bg' : ''}`}
            style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
            {bg && <span className="promo-overlay" style={{ opacity: promo.overlay / 100 }} />}
            {close}
            <div className="promo-body">
                {promo.badge && <span className="promo-badge">{promo.badge}</span>}
                {promo.highlight && <p className="promo-highlight">{promo.highlight}</p>}
                <h2 className="promo-title">{promo.title || 'Your headline'}</h2>
                {promo.message && promo.message.split('\n').filter(Boolean).map((line, i) => <p key={i} className="promo-message">{line}</p>)}
                {(promo.button_label || promo.secondary_label) && (
                    <div className="promo-actions">
                        {promo.button_label && (
                            <a className="promo-btn primary" href={promo.button_url || '#'} onClick={onAction} {...linkProps(promo.button_url)}>
                                {promo.button_label} <ArrowRight size={16} />
                            </a>
                        )}
                        {promo.secondary_label && (
                            <a className="promo-btn secondary" href={promo.secondary_url || '#'} onClick={onAction} {...linkProps(promo.secondary_url)}>
                                {promo.secondary_label}
                            </a>
                        )}
                    </div>
                )}
                {promo.footnote && <p className="promo-footnote">{promo.footnote}</p>}
            </div>
        </div>
    );
}

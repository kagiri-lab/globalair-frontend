// Promo popup on the public website, edited in Settings → Website content.
import { SITE_INFO_TAG } from './siteInfo';

export interface PromoSettings {
    /** Website only: true when this is the active popup */
    enabled: boolean;
    id: string;
    name: string;
    mode: 'image' | 'content';
    image_path: string;
    image_version: number;
    image_alt: string;
    image_link: string;
    badge: string;
    title: string;
    highlight: string;
    message: string;
    button_label: string;
    button_url: string;
    secondary_label: string;
    secondary_url: string;
    footnote: string;
    theme: 'dark' | 'light' | 'brand';
    align: 'left' | 'center';
    background: boolean;
    background_path: string;
    background_version: number;
    overlay: number;
    delay_seconds: number;
    frequency: 'session' | 'day' | 'week' | 'once' | 'always';
    pages: 'home' | 'all';
    start_date: string;
    end_date: string;
    version: number;
}

/** All popups; staff activate the one visitors see (Settings → Website content) */
export interface PromoLibrary { active_id: string; popups: PromoSettings[] }

export const DEFAULT_PROMO: PromoSettings = {
    enabled: false, id: '', name: '', mode: 'content', image_path: '', image_version: 0, image_alt: '', image_link: '',
    badge: 'New', title: '', highlight: '', message: '', button_label: '', button_url: '', secondary_label: '', secondary_url: '', footnote: '',
    theme: 'dark', align: 'center', background: false, background_path: '', background_version: 0, overlay: 55,
    delay_seconds: 1.5, frequency: 'session', pages: 'home', start_date: '', end_date: '', version: 0,
};

export function normalisePromo(raw: unknown): PromoSettings {
    let v: unknown = raw;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
    return v && typeof v === 'object' ? { ...DEFAULT_PROMO, ...(v as Partial<PromoSettings>) } : DEFAULT_PROMO;
}

export const promoBackgroundSrc = (p: PromoSettings) => (p.background && p.background_path ? `${p.background_path}?v=${p.background_version}` : '');
export const promoImageSrc = (p: PromoSettings) => (p.image_path ? `${p.image_path}${p.image_version ? `?v=${p.image_version}` : ''}` : '');

/** A new, empty popup with its own upload slots for the flyer and background photo */
export function newPopup(name = 'New popup'): PromoSettings {
    const id = `p-${Date.now().toString(36)}`;
    return {
        ...DEFAULT_PROMO, id, name, mode: 'content',
        image_path: `/site/uploads/promo-${id}.jpg`, background_path: `/site/uploads/promo-${id}-bg.jpg`,
    };
}

export function normaliseLibrary(raw: unknown): PromoLibrary {
    const v = raw as Partial<PromoLibrary> | null;
    const popups = Array.isArray(v?.popups) ? v.popups.map(p => ({ ...DEFAULT_PROMO, ...p })) : [];
    return { active_id: popups.some(p => p.id === v?.active_id) ? String(v?.active_id) : '', popups };
}

/** Server components: the popup settings (same cached request as the contact details) */
export async function getPromo(): Promise<PromoSettings> {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
    try {
        const res = await fetch(`${base}/public/settings`, { next: { tags: [SITE_INFO_TAG], revalidate: 300 } });
        if (!res.ok) return DEFAULT_PROMO;
        return normalisePromo((await res.json())?.data?.settings?.promo_popup);
    } catch {
        return DEFAULT_PROMO;
    }
}

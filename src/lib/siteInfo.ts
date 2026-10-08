// Website contact details (emails, phones, offices, opening hours, social links, map).
// Edited in the ops portal under Settings → Website content; these defaults are only used
// if the API can't be reached.
import { CONTACT, OFFICES, OPENING_HOURS } from './siteContent';

export interface SiteOffice { region: string; name: string; lines: string[]; phones: string[]; email?: string }
export interface SiteContact {
    company: string;
    email: string;
    support_email: string;
    phones: string[];
    address: string;
    whatsapp: string;
    social: { facebook?: string; instagram?: string; linkedin?: string; x?: string; tiktok?: string; youtube?: string };
    header: { location_title: string; location_subtitle: string; phone: string; phone_label: string };
    map_embed: string;
    opening_hours: { day: string; hours: string }[];
    offices: SiteOffice[];
}

export const DEFAULT_SITE_CONTACT: SiteContact = {
    company: CONTACT.company,
    email: CONTACT.email,
    support_email: CONTACT.supportEmail,
    phones: CONTACT.phones,
    address: CONTACT.address,
    whatsapp: CONTACT.whatsapp,
    social: { facebook: CONTACT.facebook },
    header: { location_title: 'Movcon, Halane, Mogadishu Airport', location_subtitle: 'Mogadishu, Somalia', phone: '+252 616 774 004', phone_label: 'Talk to us' },
    map_embed: CONTACT.mapEmbed,
    opening_hours: OPENING_HOURS,
    offices: OFFICES,
};

export const SITE_INFO_TAG = 'site-info';

/** Merge whatever the API returned over the defaults, so a missing field never breaks the site */
export function normaliseSiteContact(raw: unknown): SiteContact {
    let v: any = raw;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
    if (!v || typeof v !== 'object') return DEFAULT_SITE_CONTACT;
    const d = DEFAULT_SITE_CONTACT;
    return {
        company: v.company || d.company,
        email: v.email || d.email,
        support_email: v.support_email || v.email || d.support_email,
        phones: Array.isArray(v.phones) && v.phones.length ? v.phones : d.phones,
        address: v.address ?? d.address,
        whatsapp: v.whatsapp ?? d.whatsapp,
        social: { ...v.social },
        header: { ...d.header, ...(v.header || {}) },
        map_embed: v.map_embed ?? d.map_embed,
        opening_hours: Array.isArray(v.opening_hours) ? v.opening_hours : d.opening_hours,
        offices: Array.isArray(v.offices) ? v.offices : d.offices,
    };
}

/** Server components: cached and refreshed the moment staff save new details */
export async function getSiteContact(): Promise<SiteContact> {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
    try {
        const res = await fetch(`${base}/public/settings`, { next: { tags: [SITE_INFO_TAG], revalidate: 300 } });
        if (!res.ok) return DEFAULT_SITE_CONTACT;
        const body = await res.json();
        return normaliseSiteContact(body?.data?.settings?.site_contact);
    } catch {
        return DEFAULT_SITE_CONTACT;
    }
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** Server components: "Countries we ship to" (Settings → Website content), also the footer's areas of operation */
export async function getShippingCountries(): Promise<string[]> {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
    try {
        const res = await fetch(`${base}/public/settings`, { next: { tags: [SITE_INFO_TAG], revalidate: 300 } });
        if (!res.ok) return [];
        let list = (await res.json())?.data?.settings?.shipping_countries;
        if (typeof list === 'string') list = JSON.parse(list);
        return Array.isArray(list) ? list.filter((c: unknown): c is string => typeof c === 'string' && !!c.trim()) : [];
    } catch {
        return [];
    }
}

// ── Footer (Settings → Website content) ─────────────────────────────────────
export interface FooterStat { label: string; source: 'offices' | 'countries' | 'custom'; value: string }
export interface SiteFooter { about: string; stats: FooterStat[] }
export const DEFAULT_FOOTER: SiteFooter = {
    about: 'A leading and reliable partner in the field of logistics in Somalia, Kenya and the wider East African region.',
    stats: [
        { label: 'Offices worldwide', source: 'offices', value: '' },
        { label: 'Hardworking people', source: 'custom', value: '23' },
        { label: 'Countries covered', source: 'countries', value: '' },
    ],
};

export function normaliseFooter(raw: unknown): SiteFooter {
    let v: any = raw;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
    if (!v || typeof v !== 'object') return DEFAULT_FOOTER;
    return { about: typeof v.about === 'string' ? v.about : DEFAULT_FOOTER.about, stats: Array.isArray(v.stats) ? v.stats : DEFAULT_FOOTER.stats };
}

/** A stat's number: counted from the settings it follows, or the number staff typed */
export const footerStatValue = (stat: FooterStat, offices: number, countries: number) =>
    stat.source === 'offices' ? String(offices) : stat.source === 'countries' ? String(countries) : stat.value;

export async function getSiteFooter(): Promise<SiteFooter> {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
    try {
        const res = await fetch(`${base}/public/settings`, { next: { tags: [SITE_INFO_TAG], revalidate: 300 } });
        if (!res.ok) return DEFAULT_FOOTER;
        return normaliseFooter((await res.json())?.data?.settings?.site_footer);
    } catch {
        return DEFAULT_FOOTER;
    }
}

// ── Brand images (Settings → Branding) ──────────────────────────────────────
export type BrandAsset = 'logo' | 'logo_dark' | 'favicon';
/** When each image was last uploaded (ms); null means the built-in image is used */
export type BrandVersions = Record<BrandAsset, number | null>;
export const DEFAULT_BRAND: BrandVersions = { logo: null, logo_dark: null, favicon: null };

/** Same-origin URL that serves the uploaded image or the built-in default; the version busts caches after an upload */
export const brandSrc = (asset: BrandAsset, versions: BrandVersions = DEFAULT_BRAND) =>
    `/brand/${asset.replace('_', '-')}${versions[asset] ? `?v=${versions[asset]}` : ''}`;

/** Server components: brand image versions (same cached request as getSiteContact) */
export async function getSiteBrand(): Promise<BrandVersions> {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
    try {
        const res = await fetch(`${base}/public/settings`, { next: { tags: [SITE_INFO_TAG], revalidate: 300 } });
        if (!res.ok) return DEFAULT_BRAND;
        const body = await res.json();
        return { ...DEFAULT_BRAND, ...(body?.data?.settings?.brand || {}) };
    } catch {
        return DEFAULT_BRAND;
    }
}

'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_SITE_CONTACT, DEFAULT_BRAND, brandSrc, type SiteContact, type BrandVersions, type BrandAsset } from '@/lib/siteInfo';

const SiteInfoContext = createContext<SiteContact>(DEFAULT_SITE_CONTACT);
const BrandContext = createContext<BrandVersions>(DEFAULT_BRAND);

// Makes the website contact details and brand images (set in the ops portal) available to client components
export function SiteInfoProvider({ value, brand = DEFAULT_BRAND, children }: { value: SiteContact; brand?: BrandVersions; children: React.ReactNode }) {
    return (
        <SiteInfoContext.Provider value={value}>
            <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
        </SiteInfoContext.Provider>
    );
}

export const useSiteContact = () => useContext(SiteInfoContext);

/** URL of a brand image (uploaded in Settings → Branding, else the built-in one) */
export const useBrandSrc = (asset: BrandAsset) => brandSrc(asset, useContext(BrandContext));

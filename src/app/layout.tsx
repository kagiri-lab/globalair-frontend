import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import AppToaster from '@/components/AppToaster';

import { Suspense } from 'react';
import NavigationTracker from '@/components/NavigationTracker';
import Script from 'next/script';
import { SiteInfoProvider } from '@/components/SiteInfoProvider';
import { getSiteContact, getSiteBrand, brandSrc } from '@/lib/siteInfo';

// Phones: the browser bar takes the brand's dark colour, matching the site header
export const viewport: Viewport = { themeColor: '#282c37' };

// Tab titles follow the company name set in Settings → Website content
export async function generateMetadata(): Promise<Metadata> {
  const [{ company }, brand] = await Promise.all([getSiteContact(), getSiteBrand()]);
  return {
    title: { template: `%s | ${company}`, default: company },
    icons: { icon: brandSrc('favicon', brand) },
    description: 'Air charter, freight forwarding, warehousing and logistics across Kenya, Somalia and East Africa. Ship, manage and track your packages online.',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [siteContact, brand] = await Promise.all([getSiteContact(), getSiteBrand()]);
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <Script 
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`} 
          strategy="beforeInteractive"
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');`}
            </Script>
          </>
        )}
      </head>
      <body>
        <SiteInfoProvider value={siteContact} brand={brand}>
        <AuthProvider>
          <Suspense fallback={null}>
            <NavigationTracker />
          </Suspense>
          {children}
          <AppToaster />
        </AuthProvider>
        </SiteInfoProvider>
      </body>
    </html>
  );
}

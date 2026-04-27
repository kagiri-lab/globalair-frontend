import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';

import { Suspense } from 'react';
import NavigationTracker from '@/components/NavigationTracker';
import Script from 'next/script';

export const metadata: Metadata = {
  title: {
    template: '%s | Global Air Cargo',
    default: 'Global Air Cargo — Professional Shipping Solutions',
  },
  description: 'Track, manage and ship your packages worldwide with Global Air Cargo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </head>
      <body>
        <AuthProvider>
          <Suspense fallback={null}>
            <NavigationTracker />
          </Suspense>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#141c2e',
                color: '#f1f5f9',
                border: '1px solid #1e2d4a',
                borderRadius: '10px',
                fontSize: '0.875rem',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#141c2e' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#141c2e' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

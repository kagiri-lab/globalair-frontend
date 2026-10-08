// Brand images uploaded in Settings → Branding, served from the website's own domain so pages and
// emails can link to them. Falls back to the built-in image when nothing has been uploaded.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

const ASSETS: Record<string, { key: string; fallback: string }> = {
    logo: { key: 'logo', fallback: '/logo-transparent.png' },
    'logo-dark': { key: 'logo_dark', fallback: '/site/logo1.png' },
    favicon: { key: 'favicon', fallback: '/icon.svg' },
};

export async function GET(req: Request, { params }: { params: Promise<{ asset: string }> }) {
    const asset = ASSETS[(await params).asset];
    if (!asset) return new Response('Not found', { status: 404 });
    try {
        const res = await fetch(`${API}/public/brand/${asset.key}`, { cache: 'no-store' });
        if (res.ok) {
            return new Response(res.body, {
                headers: {
                    'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
                    // Links carry ?v=<upload time>, so a fresh upload gets a fresh URL
                    'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
                    'X-Content-Type-Options': 'nosniff',
                },
            });
        }
    } catch { /* API unreachable: use the built-in image */ }
    return Response.redirect(new URL(asset.fallback, req.url), 307);
}

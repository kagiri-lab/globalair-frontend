// Serves an image replaced in Settings → Website images. proxy.ts rewrites /site/... requests here
// only when a replacement exists, so the original address keeps working everywhere.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const path = `/${(await params).path.join('/')}`;
    const etag = req.headers.get('if-none-match');
    try {
        const res = await fetch(`${API}/public/images/file?path=${encodeURIComponent(path)}`, {
            cache: 'no-store',
            headers: etag ? { 'If-None-Match': etag } : undefined,
        });
        if (res.status === 304) return new Response(null, { status: 304, headers: { ETag: etag || '' } });
        if (res.ok) {
            return new Response(res.body, {
                headers: {
                    'Content-Type': res.headers.get('content-type') || 'image/webp',
                    ETag: res.headers.get('etag') || '',
                    // Same address as the original file, so browsers must check back for a newer version
                    'Cache-Control': 'public, max-age=0, must-revalidate',
                    'X-Content-Type-Options': 'nosniff',
                },
            });
        }
    } catch { /* API unreachable: fall back to the original file */ }
    // No replacement (e.g. just restored): the original file, which sits outside the proxy's rewrite
    return Response.redirect(new URL(`${path}?original=1`, req.url), 307);
}

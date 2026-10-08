import { NextResponse, type NextRequest } from 'next/server';
import { destinationFor, homeFor, isCustomerPath, isOpsPath, isStaffRole, loginUrl } from '@/lib/roles';

// Reads the role and expiry from the JWT payload for ROUTING ONLY. The signature is not verified
// here — the API verifies it on every request, so a forged cookie can't reach any data.
function readSession(request: NextRequest): { role: string } | null {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return { role: payload.role };
    } catch {
        return null;
    }
}

// Website images replaced in Settings → Website images. Checked at most every few seconds,
// so an upload shows on the site almost immediately without asking the API on every image request.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
const REPLACED_TTL = 10_000;
let replaced: { at: number; paths: Set<string>; pending?: Promise<void> } = { at: 0, paths: new Set() };

async function replacedImages() {
    if (Date.now() - replaced.at > REPLACED_TTL && !replaced.pending) {
        replaced.pending = fetch(`${API}/public/images`, { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : null))
            .then(body => { if (body?.data?.images) replaced = { at: Date.now(), paths: new Set(Object.keys(body.data.images)) }; })
            .catch(() => { replaced.at = Date.now(); }) // API down: keep serving what we have
            .finally(() => { replaced.pending = undefined; });
    }
    await replaced.pending; // only waits when the list is being refreshed
    return replaced.paths;
}

export async function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // A replaced website image is served from the database at the original address
    if (pathname.startsWith('/site/')) {
        if (request.nextUrl.searchParams.has('original')) return NextResponse.next();
        return (await replacedImages()).has(pathname)
            ? NextResponse.rewrite(new URL(`/img${pathname}`, request.url))
            : NextResponse.next();
    }

    const session = readSession(request);
    const redirect = (to: string) => NextResponse.redirect(new URL(to, request.url));

    // Sign-in pages: already signed in → go straight to the right portal
    if (pathname === '/login' || pathname === '/register') {
        return session ? redirect(destinationFor(session.role, request.nextUrl.searchParams.get('next'))) : NextResponse.next();
    }

    // Protected areas: must be signed in…
    if (!session) {
        return redirect(loginUrl(pathname + search));
    }
    // …and in the right portal for their role
    if (isOpsPath(pathname) && !isStaffRole(session.role)) return redirect(homeFor(session.role));
    if (isCustomerPath(pathname) && isStaffRole(session.role)) return redirect(homeFor(session.role));

    return NextResponse.next();
}

export const config = {
    matcher: ['/ops/:path*', '/dashboard/:path*', '/shipments/:path*', '/login', '/register', '/site/:path*'],
};

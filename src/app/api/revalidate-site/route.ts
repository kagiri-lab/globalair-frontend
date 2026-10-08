import { revalidateTag } from 'next/cache';
import { SITE_INFO_TAG } from '@/lib/siteInfo';

// Called by the ops portal after website content is saved, so the public site shows it straight away.
// It only expires a cache entry (the next visitor refetches), so it needs no authentication.
export async function POST() {
    revalidateTag(SITE_INFO_TAG, { expire: 0 });
    return Response.json({ revalidated: true });
}

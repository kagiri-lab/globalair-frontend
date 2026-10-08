'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutTemplate, SlidersHorizontal, Mail, Eye, Activity, Palette, Images, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { OpsPage, Tabs, Loader } from '@/components/ops/ui';
import PlatformTab from './PlatformTab';
import EmailTab from './EmailTab';
import WebsiteTab from './WebsiteTab';
import BrandingTab from './BrandingTab';
import BusinessTab from './BusinessTab';
import SnapshotPanel from './SnapshotPanel';
import WebsiteImagesTab from './WebsiteImagesTab';
import StaffTab from './StaffTab';
import ActivityTab from './ActivityTab';

type Tab = 'business' | 'platform' | 'email' | 'website' | 'images' | 'branding' | 'staff' | 'activity';

const SUBTITLES: Record<Tab, string> = {
    business: 'Your company name, website address, contact details, offices and opening hours, used everywhere: website, portals, emails and invoices.',
    platform: 'Less common options such as address search with Google Maps. Pricing rules and delivery times are on the Pricing page.',
    email: 'The mailboxes the platform sends from, and which one sends each kind of email.',
    website: 'Content shown on the public website.',
    images: 'Every photo and picture on the public website. Replace, crop and optimise them so pages load fast.',
    branding: 'Your logo, favicon and the look of every email the platform sends.',
    staff: 'Everyone who can sign in to the operations portal, and what they can do.',
    activity: 'Sign-ins, changes and page views across the platform.',
};

function SettingsCentre() {
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('manage_settings');
    const canView = hasPermission('view_settings');
    const canManageStaff = hasPermission('manage_admins');
    const canViewLogs = hasPermission('view_logs');
    const router = useRouter();
    const pathname = usePathname();
    const requested = useSearchParams().get('tab');
    // Each tab needs its own permission; open the first one this person can see
    const allowed: Tab[] = [
        ...(canView ? ['business', 'website', 'images', 'branding', 'email', 'platform'] as Tab[] : []),
        ...(canManageStaff ? ['staff'] as Tab[] : []),
        ...(canViewLogs ? ['activity'] as Tab[] : []),
    ];
    const tab: Tab = allowed.includes(requested as Tab) ? requested as Tab : allowed[0] || 'business';
    const setTab = (next: Tab) => router.replace(next === allowed[0] ? pathname : `${pathname}?tab=${next}`, { scroll: false });

    return (
        <OpsPage title="Settings" subtitle={SUBTITLES[tab]}>
            <Tabs
                label="Settings sections"
                value={tab}
                onChange={setTab}
                tabs={([
                    { value: 'business', label: 'Business', icon: Building2 },
                    { value: 'website', label: 'Website content', icon: LayoutTemplate },
                    { value: 'images', label: 'Website images', icon: Images },
                    { value: 'branding', label: 'Branding', icon: Palette },
                    { value: 'email', label: 'Email', icon: Mail },
                    { value: 'platform', label: 'Advanced', icon: SlidersHorizontal },
                    { value: 'staff', label: 'Staff & access', icon: Users },
                    { value: 'activity', label: 'Activity logs', icon: Activity },
                ] as const).filter(t => allowed.includes(t.value)).map(t => ({ ...t }))}
            />

            {!canEdit && ['business', 'platform', 'email', 'website', 'images', 'branding'].includes(tab) && (
                <div className="oset-readonly"><Eye size={16} /> You can view these settings. Ask a super admin if something needs changing.</div>
            )}

            {tab === 'business' && <BusinessTab canEdit={canEdit} />}
            {tab === 'platform' && <><PlatformTab canEdit={canEdit} /><SnapshotPanel canEdit={canEdit} /></>}
            {tab === 'email' && <EmailTab canEdit={canEdit} />}
            {tab === 'website' && <WebsiteTab canEdit={canEdit} />}
            {tab === 'images' && <WebsiteImagesTab canEdit={canEdit} />}
            {tab === 'branding' && <BrandingTab canEdit={canEdit} />}
            {tab === 'staff' && <StaffTab />}
            {tab === 'activity' && <ActivityTab />}
        </OpsPage>
    );
}

export default function AdminSettingsPage() {
    return <Suspense fallback={<Loader />}><SettingsCentre /></Suspense>;
}

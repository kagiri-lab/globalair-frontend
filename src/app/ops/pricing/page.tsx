'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Table2, Calculator, MapPin, Tag, SlidersHorizontal, Eye } from 'lucide-react';
import { OpsPage, Tabs, Loader, Panel, EmptyState } from '@/components/ops/ui';
import { useAuth } from '@/lib/auth';
import PlatformTab, { PRICING_GROUPS } from '../settings/PlatformTab';
import PriceTable from './PriceTable';
import PriceChecker from './PriceChecker';
import LocationsManager from './LocationsManager';

type Tab = 'table' | 'locations' | 'rules' | 'checker';
const TABS: Tab[] = ['table', 'locations', 'rules', 'checker'];

const SUBTITLES: Record<Tab, string> = {
    table: 'One price per route. Edit the table like a spreadsheet, or paste straight from Excel.',
    locations: 'Where we pick up and deliver, plus extras for single routes.',
    rules: 'What’s added on top of the table price: minimum charge, Express and Overnight, handling surcharges, tax and delivery times.',
    checker: 'See exactly what a customer would pay, and how the price is worked out.',
};

// Everything about prices in one place: the table, the places it covers, the rules on top, and a checker
function PricingCentre() {
    const router = useRouter();
    const pathname = usePathname();
    const { hasPermission } = useAuth();
    const requested = useSearchParams().get('tab') as Tab;
    const tab: Tab = TABS.includes(requested) ? requested : 'table';
    const canSeeRules = hasPermission('view_settings');

    return (
        <OpsPage
            narrow={false}
            title="Pricing"
            subtitle={SUBTITLES[tab]}
            actions={<Link href="/ops/categories" className="btn btn-secondary"><Tag size={15} /> Categories</Link>}
        >
            <Tabs
                label="Pricing"
                value={tab}
                onChange={next => router.replace(next === 'table' ? pathname : `${pathname}?tab=${next}`, { scroll: false })}
                tabs={[
                    { value: 'table', label: 'Price table', icon: Table2 },
                    { value: 'locations', label: 'Locations', icon: MapPin },
                    { value: 'rules', label: 'Rules', icon: SlidersHorizontal },
                    { value: 'checker', label: 'Price checker', icon: Calculator },
                ]}
            />
            {tab === 'table' && <PriceTable />}
            {tab === 'locations' && <LocationsManager />}
            {tab === 'rules' && (canSeeRules ? (
                <>
                    {!hasPermission('manage_settings') && <div className="oset-readonly"><Eye size={16} /> You can view these rules. Ask a super admin if something needs changing.</div>}
                    <PlatformTab canEdit={hasPermission('manage_settings')} groups={PRICING_GROUPS} />
                </>
            ) : (
                <Panel><EmptyState icon={SlidersHorizontal} title="No access to pricing rules" text="Ask a super admin to give you access to settings." /></Panel>
            ))}
            {tab === 'checker' && <PriceChecker />}
        </OpsPage>
    );
}

export default function PricingPage() {
    return <Suspense fallback={<Loader />}><PricingCentre /></Suspense>;
}

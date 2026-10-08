import { redirect } from 'next/navigation';

// Locations now live as a tab on the Pricing page
export default function LocationsRedirect() {
    redirect('/ops/pricing?tab=locations');
}

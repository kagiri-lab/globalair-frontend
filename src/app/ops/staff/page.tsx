import { redirect } from 'next/navigation';

// Staff management now lives as a tab on the Settings page
export default function StaffRedirect() {
    redirect('/ops/settings?tab=staff');
}

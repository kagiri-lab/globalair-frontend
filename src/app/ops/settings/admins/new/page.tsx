import { redirect } from 'next/navigation';

// Staff accounts are managed in Staff Management; keep the old URL working
export default function NewAdminRedirect() {
    redirect('/ops/settings?tab=staff');
}

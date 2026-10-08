import { redirect } from 'next/navigation';

// Activity logs now live as a tab on the Settings page
export default function LogsRedirect() {
    redirect('/ops/settings?tab=activity');
}

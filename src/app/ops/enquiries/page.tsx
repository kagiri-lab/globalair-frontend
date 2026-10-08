import { redirect } from 'next/navigation';

// Website enquiries now live as a tab on the Support & Enquiries page
export default function EnquiriesRedirect() {
    redirect('/ops/support');
}

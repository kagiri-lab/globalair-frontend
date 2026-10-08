import { redirect } from 'next/navigation';

// Staff accounts are managed in Staff Management; keep the old URL working
export default async function AdminDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/ops/staff/${id}`);
}

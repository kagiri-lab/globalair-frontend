'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Printer, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

/** The shipment's invoice: the same PDF that's emailed, shown in the page with download and print */
export default function InvoicePage() {
    const { id } = useParams<{ id: string }>();
    const [url, setUrl] = useState('');
    const [name, setName] = useState('Invoice.pdf');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let objectUrl = '';
        api.get(`/shipments/${id}/invoice`, { responseType: 'blob' })
            .then(res => {
                objectUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                const m = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] || '');
                if (m) setName(m[1]);
                setUrl(objectUrl);
            })
            .catch(() => setFailed(true));
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [id]);

    const download = () => {
        const a = Object.assign(document.createElement('a'), { href: url, download: name });
        document.body.appendChild(a); a.click(); a.remove();
    };
    const print = () => {
        const frame = document.getElementById('invoice-frame') as HTMLIFrameElement | null;
        try { frame?.contentWindow?.print(); } catch { toast('Download the PDF to print it'); }
    };

    return (
        <div className="portal-page cpi">
            <div className="cpi-bar">
                <Link href={`/shipments/${id}`} className="cpi-back"><ArrowLeft size={16} /> Back to shipment</Link>
                <span className="cpi-title"><Receipt size={16} /> {name.replace(/\.pdf$/, '').replace(/^Invoice-/, 'Invoice ')}</span>
                <div className="cpi-actions">
                    <Link href="/dashboard/billing" className="btn btn-secondary btn-sm">How to pay</Link>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={print} disabled={!url}><Printer size={14} /> Print</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={download} disabled={!url}><Download size={14} /> Download PDF</button>
                </div>
            </div>

            {failed ? (
                <div className="cpi-empty">We couldn’t load this invoice. <Link href={`/shipments/${id}`}>Back to the shipment</Link></div>
            ) : !url ? (
                <div className="cpi-empty"><div className="spinner" /></div>
            ) : (
                <iframe id="invoice-frame" className="cpi-frame" src={`${url}#toolbar=0&view=FitH`} title="Invoice" />
            )}
        </div>
    );
}

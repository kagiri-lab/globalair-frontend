'use client';

import { useRef, useState } from 'react';
import { Archive, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Modal } from '@/components/ops/ui';

// Settings → Advanced: copy this server's setup (settings, content, logos, images) to another server
export default function SnapshotPanel({ canEdit }: { canEdit: boolean }) {
    const [downloading, setDownloading] = useState(false);
    const [pending, setPending] = useState<File | null>(null);
    const [restoring, setRestoring] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    const download = async () => {
        setDownloading(true);
        try {
            const res = await api.get('/admin/settings/snapshot', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `settings-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Could not create the snapshot');
        } finally {
            setDownloading(false);
        }
    };

    const restore = async () => {
        if (!pending) return;
        setRestoring(true);
        try {
            const res = await api.post('/admin/settings/snapshot', pending, { headers: { 'Content-Type': 'application/octet-stream' } });
            await fetch('/api/revalidate-site', { method: 'POST' }).catch(() => { });
            toast.success(res.data.message);
            setPending(null);
            setTimeout(() => window.location.reload(), 900);
        } catch (err) {
            toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not restore the snapshot');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <Panel title="Settings snapshot" icon={Archive}
            subtitle="Copy this setup to another server: business details, website content, pricing rules, email design, logos and website images. Passwords, keys and the website address stay behind.">
            <div className="osn">
                <div>
                    <strong>Download</strong>
                    <p>One file with everything. Developers can also place it in the code as <code>database/seed-data/site-settings.json</code> so new servers start with it.</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={download} disabled={downloading}>
                        {downloading ? <div className="spinner" /> : <><Download size={14} /> Download snapshot</>}
                    </button>
                </div>
                {canEdit && (
                    <div>
                        <strong>Restore</strong>
                        <p>Replace this server’s settings with the ones in a snapshot file. Anything not in the file is left as it is.</p>
                        <input ref={input} type="file" accept="application/json,.json" hidden onChange={e => { setPending(e.target.files?.[0] || null); e.target.value = ''; }} />
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()}><Upload size={14} /> Restore from file…</button>
                    </div>
                )}
            </div>

            <Modal open={!!pending} onClose={() => setPending(null)} title="Restore settings from this snapshot?" width={460}
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setPending(null)}>Cancel</button>
                    <button type="button" className="btn btn-danger" onClick={restore} disabled={restoring}>
                        {restoring ? <div className="spinner" /> : 'Replace settings'}
                    </button>
                </>}>
                <p className="o-muted">“{pending?.name}” will replace the matching settings, website content, logos and images on this server. This can’t be undone, so download a snapshot of the current setup first if you might need it.</p>
            </Modal>
        </Panel>
    );
}

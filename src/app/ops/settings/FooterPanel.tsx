'use client';

import { useEffect, useState } from 'react';
import { PanelBottom, Save, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Field, Loader } from '@/components/ops/ui';
import { normaliseFooter, type SiteFooter } from '@/lib/siteInfo';

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

// The description under the logo in the website footer (Settings → Website content)
export default function FooterPanel({ canEdit }: { canEdit: boolean }) {
    const [saved, setSaved] = useState<SiteFooter | null>(null);
    const [about, setAbout] = useState('');
    const [saving, setSaving] = useState(false);

    const load = () => api.get('/admin/landing/content').then(r => {
        const f = normaliseFooter(r.data.data?.site_footer);
        setSaved(f);
        setAbout(f.about);
    });

    useEffect(() => { load().catch(() => toast.error('Could not load the footer')); }, []);

    if (!saved) return <Panel collapsible defaultOpen={false} title="Footer" icon={PanelBottom}><Loader /></Panel>;

    const dirty = about !== saved.about;

    const save = async () => {
        setSaving(true);
        try {
            // Keep any other footer settings as they are; only the description is edited here
            await api.patch('/admin/landing/content', { key: 'site_footer', content: { ...saved, about } });
            await fetch('/api/revalidate-site', { method: 'POST' }).catch(() => { });
            await load();
            toast.success('Footer updated');
        } catch (err) {
            toast.error(errMsg(err, 'Could not save the footer'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Panel collapsible defaultOpen={false} title="Footer" subtitle="The description under the logo in the website footer." icon={PanelBottom}
            actions={<>
                <a className="btn btn-secondary btn-sm" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View site</a>
                {canEdit && <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving}>
                    {saving ? <div className="spinner" /> : <><Save size={14} /> {dirty ? 'Save' : 'Saved'}</>}
                </button>}
            </>}>
            <Field label="Description" hint="Contact details and offices come from Settings → Business">
                <textarea className="input" rows={2} maxLength={400} value={about} disabled={!canEdit} onChange={e => setAbout(e.target.value)} />
            </Field>
        </Panel>
    );
}

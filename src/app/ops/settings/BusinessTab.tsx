'use client';

import { useCallback, useEffect, useState } from 'react';
import { Globe, Save, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Loader, Field } from '@/components/ops/ui';
import { normaliseSiteContact, type SiteContact } from '@/lib/siteInfo';
import ContactDetailsPanel from './ContactDetailsPanel';
import BillingDetailsPanel from './BillingDetailsPanel';

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

// Settings → Business: the one place for who you are and how to reach you.
// Used by the website, both portals, emails and invoices.
export default function BusinessTab({ canEdit }: { canEdit: boolean }) {
    const [contact, setContact] = useState<SiteContact | null>(null);
    const [savedContact, setSavedContact] = useState<SiteContact | null>(null);
    const [siteUrl, setSiteUrl] = useState('');
    const [savedUrl, setSavedUrl] = useState('');
    const [saving, setSaving] = useState<'' | 'contact' | 'url'>('');

    const load = useCallback(async () => {
        const [content, settings] = await Promise.all([api.get('/admin/landing/content'), api.get('/admin/settings')]);
        const c = normaliseSiteContact(content.data.data?.site_contact);
        setContact(c);
        setSavedContact(c);
        const url = (Object.values(settings.data.data.settings || {}) as { key: string; value: string }[][]).flat().find(s => s.key === 'site_url')?.value || '';
        setSiteUrl(url);
        setSavedUrl(url);
    }, []);

    useEffect(() => { load().catch(() => toast.error('Could not load business details')); }, [load]);

    if (!contact || !savedContact) return <Loader label="Loading business details…" />;

    const contactDirty = JSON.stringify(contact) !== JSON.stringify(savedContact);
    const urlDirty = siteUrl.trim() !== savedUrl;
    const urlLooksLocal = /localhost|127\.0\.0\.1/.test(siteUrl);

    const saveContact = async () => {
        setSaving('contact');
        try {
            await api.patch('/admin/landing/content', { key: 'site_contact', content: contact });
            // The public site caches these; refresh it so the change shows straight away
            await fetch('/api/revalidate-site', { method: 'POST' }).catch(() => { });
            await load();
            toast.success('Business details updated everywhere');
        } catch (err) {
            toast.error(errMsg(err, 'Could not save'));
        } finally {
            setSaving('');
        }
    };

    const saveUrl = async () => {
        const url = siteUrl.trim().replace(/\/+$/, '');
        if (url && !/^https?:\/\/[^\s/]+\.[^\s]+$|^https?:\/\/localhost(:\d+)?$/.test(url)) {
            toast.error('Enter the full address, e.g. https://globalaircargoke.net');
            return;
        }
        setSaving('url');
        try {
            await api.patch('/admin/settings/site_url', { value: url });
            await load();
            toast.success('Website address saved');
        } catch (err) {
            toast.error(errMsg(err, 'Could not save'));
        } finally {
            setSaving('');
        }
    };

    const saveButton = canEdit && (
        <button type="button" className="btn btn-primary btn-sm" onClick={saveContact} disabled={!contactDirty || saving === 'contact'}>
            {saving === 'contact' ? <div className="spinner" /> : <><Save size={14} /> {contactDirty ? 'Save' : 'Saved'}</>}
        </button>
    );

    return (
        <>
            <Panel title="Website address" subtitle="Used for links in emails (reset password, track shipment, view quote) and for your logo in emails." icon={Globe}
                actions={canEdit && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={saveUrl} disabled={!urlDirty || saving === 'url'}>
                        {saving === 'url' ? <div className="spinner" /> : <><Save size={14} /> {urlDirty ? 'Save' : 'Saved'}</>}
                    </button>
                )}>
                <Field label="Address" hint={urlLooksLocal ? 'This is a test address: links in emails won’t work for customers until you set your real one.' : 'e.g. https://globalaircargoke.net'}>
                    <input className="input" value={siteUrl} disabled={!canEdit} onChange={e => setSiteUrl(e.target.value)} placeholder="https://globalaircargoke.net" />
                </Field>
            </Panel>

            <ContactDetailsPanel
                value={contact}
                canEdit={canEdit}
                onChange={setContact}
                saveButton={saveButton}
                actions={<>
                    <a className="btn btn-secondary btn-sm" href="/contact" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View contact page</a>
                    {saveButton}
                </>}
            />

            <BillingDetailsPanel canEdit={canEdit} />
        </>
    );
}

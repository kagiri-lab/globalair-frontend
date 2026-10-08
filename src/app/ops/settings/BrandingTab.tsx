'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Mail, Upload, RotateCcw, Save, Send, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Loader, Field, Segmented } from '@/components/ops/ui';
import { brandSrc, DEFAULT_BRAND, type BrandAsset, type BrandVersions } from '@/lib/siteInfo';

const SLOTS: { key: BrandAsset; title: string; hint: string; accept: string; dark?: boolean }[] = [
    { key: 'logo', title: 'Logo', hint: 'Website header, sign-in pages, customer and ops portals, invoices and light email headers. PNG, JPG or WebP, ideally a wide image about 280 × 50 px.', accept: 'image/png,image/jpeg,image/webp' },
    { key: 'logo_dark', title: 'Logo for dark backgrounds', hint: 'Website footer, the sticky menu bar and dark email headers. Use a version with light or white lettering.', accept: 'image/png,image/jpeg,image/webp', dark: true },
    { key: 'favicon', title: 'Favicon', hint: 'The small icon in the browser tab. Square PNG (at least 64 × 64 px) or ICO.', accept: 'image/png,image/x-icon,.ico' },
];

type Design = {
    brand_color: string; header_background: string; header_text_color: string; body_background: string;
    header_content: 'logo' | 'name' | 'logo_name'; header_tagline: string; sign_off: string; footer_text: string; footer_legal: string;
    footer_show_address: boolean; footer_show_phone: boolean; footer_show_email: boolean; footer_show_website: boolean; footer_show_social: boolean;
};

const COLORS: { key: keyof Design; label: string }[] = [
    { key: 'header_background', label: 'Header background' },
    { key: 'header_text_color', label: 'Header text' },
    { key: 'brand_color', label: 'Buttons & accent line' },
    { key: 'body_background', label: 'Page background' },
];

const FOOTER_FLAGS: { key: keyof Design; label: string }[] = [
    { key: 'footer_show_address', label: 'Address' },
    { key: 'footer_show_phone', label: 'Phone' },
    { key: 'footer_show_email', label: 'Email' },
    { key: 'footer_show_website', label: 'Website' },
    { key: 'footer_show_social', label: 'Social links' },
];

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

// Ask the website to drop its cached settings so new images show straight away
const refreshSite = () => fetch('/api/revalidate-site', { method: 'POST' }).catch(() => { });

export default function BrandingTab({ canEdit }: { canEdit: boolean }) {
    return (
        <>
            <LogosPanel canEdit={canEdit} />
            <EmailDesignPanel canEdit={canEdit} />
        </>
    );
}

// ── Logos & favicon ──────────────────────────────────────────────────────────
function LogosPanel({ canEdit }: { canEdit: boolean }) {
    const [versions, setVersions] = useState<BrandVersions>(DEFAULT_BRAND);
    const [busy, setBusy] = useState<BrandAsset | null>(null);
    const inputs = useRef<Partial<Record<BrandAsset, HTMLInputElement | null>>>({});

    useEffect(() => {
        api.get('/admin/brand').then(r => setVersions({ ...DEFAULT_BRAND, ...r.data.data.versions })).catch(() => toast.error('Could not load brand images'));
    }, []);

    const upload = async (key: BrandAsset, file?: File) => {
        if (!file) return;
        if (file.size > 1024 * 1024) { toast.error('The image must be 1 MB or smaller'); return; }
        setBusy(key);
        try {
            const res = await api.put(`/admin/brand/${key}`, file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } });
            setVersions({ ...DEFAULT_BRAND, ...res.data.data.versions });
            await refreshSite();
            toast.success(res.data.message);
        } catch (err) {
            toast.error(errMsg(err, 'Upload failed'));
        } finally {
            setBusy(null);
            const input = inputs.current[key];
            if (input) input.value = '';
        }
    };

    const restore = async (key: BrandAsset) => {
        setBusy(key);
        try {
            const res = await api.delete(`/admin/brand/${key}`);
            setVersions({ ...DEFAULT_BRAND, ...res.data.data.versions });
            await refreshSite();
            toast.success(res.data.message);
        } catch (err) {
            toast.error(errMsg(err, 'Could not restore the default'));
        } finally {
            setBusy(null);
        }
    };

    return (
        <Panel collapsible title="Logo & favicon" subtitle="Used across the website, both portals, invoices and emails. Changes show as soon as you upload." icon={ImageIcon}
            actions={<a className="btn btn-secondary btn-sm" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View site</a>}>
            <div className="obr-slots">
                {SLOTS.map(slot => (
                    <div key={slot.key} className="obr-slot">
                        <div className={`obr-preview${slot.dark ? ' dark' : ''}${slot.key === 'favicon' ? ' icon' : ''}`}>
                            <img src={brandSrc(slot.key, versions)} alt={`Current ${slot.title.toLowerCase()}`} />
                        </div>
                        <div className="obr-slot-body">
                            <strong>{slot.title} <span className={`obr-tag${versions[slot.key] ? ' custom' : ''}`}>{versions[slot.key] ? 'Custom' : 'Default'}</span></strong>
                            <p>{slot.hint}</p>
                            {canEdit && (
                                <div className="obr-slot-actions">
                                    <input ref={el => { inputs.current[slot.key] = el; }} type="file" accept={slot.accept} hidden onChange={e => upload(slot.key, e.target.files?.[0])} />
                                    <button type="button" className="btn btn-primary btn-sm" disabled={busy === slot.key} onClick={() => inputs.current[slot.key]?.click()}>
                                        {busy === slot.key ? <div className="spinner" /> : <><Upload size={14} /> {versions[slot.key] ? 'Replace' : 'Upload'}</>}
                                    </button>
                                    {versions[slot.key] && (
                                        <button type="button" className="btn btn-secondary btn-sm" disabled={busy === slot.key} onClick={() => restore(slot.key)}>
                                            <RotateCcw size={14} /> Use default
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Panel>
    );
}

// ── Email design ─────────────────────────────────────────────────────────────
function EmailDesignPanel({ canEdit }: { canEdit: boolean }) {
    const [saved, setSaved] = useState<Design | null>(null);
    const [defaults, setDefaults] = useState<Design | null>(null);
    const [draft, setDraft] = useState<Design | null>(null);
    const [preview, setPreview] = useState('');
    const [saving, setSaving] = useState(false);
    const [testTo, setTestTo] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        api.get('/admin/email/design').then(r => {
            setSaved(r.data.data.design);
            setDraft(r.data.data.design);
            setDefaults(r.data.data.defaults);
        }).catch(() => toast.error('Could not load the email design'));
    }, []);

    // Live preview of the unsaved design (debounced; colour pickers fire on every drag)
    const draftKey = draft ? JSON.stringify(draft) : '';
    const renderPreview = useCallback((key: string) => api.post('/admin/email/design/preview', { design: JSON.parse(key) })
        .then(r => setPreview(r.data.data.html))
        .catch(() => { /* invalid colour mid-typing: keep the last good preview */ }), []);
    useEffect(() => {
        if (!draftKey) return;
        const t = setTimeout(() => renderPreview(draftKey), 350);
        return () => clearTimeout(t);
    }, [draftKey, renderPreview]);

    if (!draft || !saved || !defaults) return <Panel collapsible title="Email design" icon={Mail}><Loader label="Loading email design…" /></Panel>;

    const set = (patch: Partial<Design>) => setDraft(d => (d ? { ...d, ...patch } : d));
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

    const save = async () => {
        setSaving(true);
        try {
            const res = await api.put('/admin/email/design', { design: draft });
            setSaved(res.data.data.design);
            setDraft(res.data.data.design);
            toast.success('Email design saved. Every email now uses it.');
        } catch (err) {
            toast.error(errMsg(err, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    const sendTest = async () => {
        setSending(true);
        try {
            const res = await api.post('/admin/email/design/test', { to: testTo, design: draft });
            toast.success(res.data.message);
        } catch (err) {
            toast.error(errMsg(err, 'Could not send the test'));
        } finally {
            setSending(false);
        }
    };

    return (
        <Panel collapsible title="Email design" subtitle="Colours, header and footer for every email the platform sends: welcome, bookings, status updates, support replies and enquiries." icon={Mail}
            actions={canEdit && <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDraft(defaults)} disabled={JSON.stringify(draft) === JSON.stringify(defaults)}><RotateCcw size={14} /> Defaults</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving}>
                    {saving ? <div className="spinner" /> : <><Save size={14} /> {dirty ? 'Save' : 'Saved'}</>}
                </button>
            </>}>
            <div className="obr-email">
                <fieldset className="obr-form" disabled={!canEdit}>
                    <h3>Colours</h3>
                    <div className="obr-colors">
                        {COLORS.map(c => (
                            <label key={c.key} className="obr-color">
                                <input type="color" value={String(draft[c.key])} onChange={e => set({ [c.key]: e.target.value } as Partial<Design>)} aria-label={`${c.label} colour`} />
                                <span>
                                    <small>{c.label}</small>
                                    <input className="input" value={String(draft[c.key])} maxLength={7} onChange={e => set({ [c.key]: e.target.value } as Partial<Design>)} aria-label={`${c.label} hex value`} />
                                </span>
                            </label>
                        ))}
                    </div>

                    <h3>Header</h3>
                    <div className="o-stack">
                        <div>
                            <span className="o-field-label">Show in the header</span>
                            <Segmented value={draft.header_content} onChange={v => set({ header_content: v })}
                                options={[{ value: 'logo', label: 'Logo' }, { value: 'logo_name', label: 'Logo + name' }, { value: 'name', label: 'Company name' }]} />
                        </div>
                        <Field label="Tagline" hint="Optional line under the logo, e.g. “Air cargo & logistics across East Africa”">
                            <input className="input" value={draft.header_tagline} maxLength={120} onChange={e => set({ header_tagline: e.target.value })} />
                        </Field>
                    </div>

                    <h3>Message</h3>
                    <Field label="Sign-off" hint="Optional, shown after every message, e.g. “The Global Air Cargo team”">
                        <textarea className="input" rows={2} value={draft.sign_off} maxLength={200} onChange={e => set({ sign_off: e.target.value })} />
                    </Field>

                    <h3>Footer</h3>
                    <div className="o-stack">
                        <div>
                            <span className="o-field-label">Contact details to include</span>
                            <div className="obr-flags">
                                {FOOTER_FLAGS.map(f => (
                                    <label key={f.key} className={draft[f.key] ? 'on' : ''}>
                                        <input type="checkbox" checked={!!draft[f.key]} onChange={e => set({ [f.key]: e.target.checked } as Partial<Design>)} /> {f.label}
                                    </label>
                                ))}
                            </div>
                            <span className="o-field-hint">Taken from Website content → Contact details.</span>
                        </div>
                        <Field label="Footer text" hint="Optional, one line per paragraph: office hours, a promotion, registration numbers…">
                            <textarea className="input" rows={3} value={draft.footer_text} maxLength={1000} onChange={e => set({ footer_text: e.target.value })} />
                        </Field>
                        <Field label="Small print" hint="Optional, e.g. why the reader is receiving this email">
                            <textarea className="input" rows={2} value={draft.footer_legal} maxLength={600} onChange={e => set({ footer_legal: e.target.value })} />
                        </Field>
                    </div>

                    {canEdit && (
                        <>
                            <h3>Send a test</h3>
                            <div className="obr-test">
                                <input className="input" type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="you@company.com" aria-label="Send the test to" />
                                <button type="button" className="btn btn-secondary" onClick={sendTest} disabled={sending || !testTo.trim()}>
                                    {sending ? <div className="spinner" /> : <><Send size={15} /> Send</>}
                                </button>
                            </div>
                            <span className="o-field-hint">Sends the sample below with the current (unsaved) design, from the account that sends status updates.</span>
                        </>
                    )}
                </fieldset>

                <div className="obr-preview-pane">
                    <span className="o-field-label">Preview</span>
                    {preview
                        ? <iframe className="obr-frame" title="Email preview" srcDoc={preview} sandbox="" />
                        : <Loader label="Rendering preview…" />}
                </div>
            </div>
        </Panel>
    );
}

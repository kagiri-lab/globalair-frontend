'use client';

import { useEffect, useRef, useState } from 'react';
import { Megaphone, Save, Upload, Trash2, ExternalLink, Image as ImageIcon, Type, Plus, Copy, Eye, EyeOff, Check, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Field, Segmented, Loader, Drawer } from '@/components/ops/ui';
import PromoCard from '@/components/site/PromoCard';
import { newPopup, normaliseLibrary, type PromoLibrary, type PromoSettings } from '@/lib/promo';
import { ImageEditor } from './WebsiteImagesTab';

// Uploads are read straight from the API here: the website picks them up a few seconds later
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
const apiImage = (path: string, v: number) => `${API}/public/images/file?path=${encodeURIComponent(path)}&v=${v}`;
// The original flyer is a file on the website until it's replaced; uploads only exist in the API
const imageSrc = (p: PromoSettings) => (!p.image_path ? '' : p.image_version || p.image_path.startsWith('/site/uploads/') ? apiImage(p.image_path, p.image_version) : p.image_path);

const FREQUENCIES: { value: PromoSettings['frequency']; label: string }[] = [
    { value: 'session', label: 'Once per visit' },
    { value: 'day', label: 'Once a day' },
    { value: 'week', label: 'Once a week' },
    { value: 'once', label: 'Only once' },
    { value: 'always', label: 'Every page load' },
];

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });

const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

/** One line about whether visitors actually see the active popup right now */
const liveNote = (p: PromoSettings) => {
    const d = today();
    if (p.start_date && d < p.start_date) return `Starts ${fmt(p.start_date)}`;
    if (p.end_date && d > p.end_date) return `Ended ${fmt(p.end_date)}`;
    return `Showing now${p.end_date ? ` until ${fmt(p.end_date)}` : ''}`;
};

// Settings → Website content: a library of popups; one is active and shown to visitors.
// The list saves straight away (show / stop / delete); creating and editing happen in a slide-over.
export default function PromoPanel({ canEdit }: { canEdit: boolean }) {
    const [lib, setLib] = useState<PromoLibrary | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState('');
    const [editing, setEditing] = useState<{ popup: PromoSettings; isNew: boolean; show: boolean } | null>(null);

    const load = () => api.get('/admin/landing/content').then(r => setLib(normaliseLibrary(r.data.data?.promo_popup)));
    useEffect(() => { load().catch(() => toast.error('Could not load the promo popups')); }, []);

    /** Save the whole library, refresh the website, report what visitors see now */
    const persist = async (next: PromoLibrary, done?: string) => {
        setBusy(true);
        try {
            await api.patch('/admin/landing/content', { key: 'promo_popup', content: next });
            await fetch('/api/revalidate-site', { method: 'POST' }).catch(() => { });
            await load();
            const on = next.popups.find(p => p.id === next.active_id);
            toast.success(done || (on ? `Visitors now see “${on.name}”.` : 'No popup is showing on the website.'));
            return true;
        } catch (err) {
            toast.error(errMsg(err, 'Could not save the popups'));
            return false;
        } finally {
            setBusy(false);
        }
    };

    if (!lib) return <Panel collapsible defaultOpen={false} title="Promo popups" icon={Megaphone}><Loader /></Panel>;

    const active = lib.popups.find(p => p.id === lib.active_id) || null;

    const openNew = (from?: PromoSettings) => {
        const fresh = newPopup(from ? `${from.name} (copy)` : `Popup ${lib.popups.length + 1}`);
        // A copy keeps the design but gets its own image slots
        const popup = from ? { ...from, id: fresh.id, name: fresh.name, image_path: fresh.image_path, image_version: 0, background_path: fresh.background_path, background: false, background_version: 0 } : fresh;
        setEditing({ popup, isNew: true, show: false });
    };

    const saveEditing = async () => {
        if (!editing) return;
        const { popup, isNew, show } = editing;
        const popups = isNew ? [...lib.popups, popup] : lib.popups.map(p => (p.id === popup.id ? popup : p));
        const active_id = show ? popup.id : lib.active_id === popup.id ? '' : lib.active_id;
        const ok = await persist({ active_id, popups }, isNew
            ? `“${popup.name}” created${show ? ' and showing on the website' : ''}.`
            : `“${popup.name}” saved${show ? ' and showing on the website' : ''}.`);
        if (ok) setEditing(null);
    };

    return (
        <Panel collapsible defaultOpen={false} title="Promo popups"
            subtitle={active ? `Showing: ${active.name}` : 'No popup is showing'} icon={Megaphone}
            actions={<>
                <a className="btn btn-secondary btn-sm" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View site</a>
                {canEdit && lib.popups.length < 20 && <button type="button" className="btn btn-primary btn-sm" onClick={() => openNew()}><Plus size={14} /> New popup</button>}
            </>}>
            <div className="opr-list">
                {lib.popups.map(p => {
                    const isActive = p.id === lib.active_id;
                    return (
                        <div key={p.id} className={`opr-item${isActive ? ' active' : ''}`}>
                            <button type="button" className="opr-item-main" onClick={() => setEditing({ popup: structuredClone(p), isNew: false, show: isActive })} title="Edit">
                                <span className="opr-item-icon">{p.mode === 'image' ? <ImageIcon size={16} /> : <Type size={16} />}</span>
                                <span className="opr-item-text">
                                    <strong>{p.name}</strong>
                                    <small>{isActive ? liveNote(p) : p.mode === 'image' ? 'Image / flyer' : p.title || 'Designed message'}</small>
                                </span>
                                {isActive && <span className="opr-live"><span /> Live</span>}
                            </button>
                            {canEdit && (
                                <div className="opr-item-actions">
                                    {isActive
                                        ? <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => persist({ ...lib, active_id: '' })}><EyeOff size={13} /> Stop showing</button>
                                        : <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => persist({ ...lib, active_id: p.id })}><Eye size={13} /> Show this one</button>}
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing({ popup: structuredClone(p), isNew: false, show: isActive })} title="Edit" aria-label={`Edit ${p.name}`}><Pencil size={13} /></button>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openNew(p)} title="Duplicate" aria-label={`Duplicate ${p.name}`}><Copy size={13} /></button>
                                    {confirmDelete === p.id
                                        ? <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={async () => {
                                            setConfirmDelete('');
                                            await persist({ active_id: isActive ? '' : lib.active_id, popups: lib.popups.filter(x => x.id !== p.id) }, `“${p.name}” deleted.`);
                                        }}><Check size={13} /> Delete?</button>
                                        : <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(p.id)} title="Delete" aria-label={`Delete ${p.name}`}><Trash2 size={13} /></button>}
                                </div>
                            )}
                        </div>
                    );
                })}
                {lib.popups.length === 0 && (
                    <div className="opr-empty">
                        <Megaphone size={22} />
                        <p>No popups yet. Create one to promote an offer or a new feature.</p>
                        {canEdit && <button type="button" className="btn btn-primary btn-sm" onClick={() => openNew()}><Plus size={14} /> New popup</button>}
                    </div>
                )}
            </div>

            {editing && (
                <Drawer
                    open
                    onClose={() => setEditing(null)}
                    title={editing.isNew ? 'New popup' : `Edit “${editing.popup.name}”`}
                    subtitle={editing.isNew ? 'Design it, preview it, then create it. You can show it now or later.' : 'Changes go live when you save.'}
                    footer={<>
                        <label className="opr-show">
                            <input type="checkbox" checked={editing.show} disabled={!canEdit} onChange={e => setEditing({ ...editing, show: e.target.checked })} />
                            Show this popup on the website{active && active.id !== editing.popup.id && editing.show ? ` (replaces “${active.name}”)` : ''}
                        </label>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                        {canEdit && <button type="button" className="btn btn-primary" onClick={saveEditing} disabled={busy}>
                            {busy ? <div className="spinner" /> : <><Save size={15} /> {editing.isNew ? 'Create popup' : 'Save'}</>}
                        </button>}
                    </>}
                >
                    <PopupForm
                        draft={editing.popup}
                        canEdit={canEdit}
                        onChange={patch => setEditing(e => (e ? { ...e, popup: { ...e.popup, ...patch } } : e))}
                    />
                </Drawer>
            )}
        </Panel>
    );
}

// ── One popup: the form and its live preview ─────────────────────────────────
function PopupForm({ draft, canEdit, onChange: update }: { draft: PromoSettings; canEdit: boolean; onChange: (patch: Partial<PromoSettings>) => void }) {
    const [editor, setEditor] = useState<{ target: 'image' | 'background'; file: File } | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const target = useRef<'image' | 'background'>('image');

    const pick = (which: 'image' | 'background') => { target.current = which; fileInput.current?.click(); };
    const onFile = (file?: File) => {
        if (fileInput.current) fileInput.current.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Choose an image file (JPG, PNG or WebP)'); return; }
        if (file.size > 15 * 1024 * 1024) { toast.error('The image must be 15 MB or smaller'); return; }
        setEditor({ target: target.current, file });
    };

    return (
        <>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => onFile(e.target.files?.[0])} />
            <div className="opr-layout">
                <fieldset className="opr-form" disabled={!canEdit}>
                    <div className="o-form-grid">
                        <Field label="Name" hint="For your team only, e.g. October air freight offer">
                            <input className="input" value={draft.name} maxLength={80} onChange={e => update({ name: e.target.value })} />
                        </Field>
                        <div>
                            <span className="o-field-label">Type</span>
                            <Segmented value={draft.mode} onChange={mode => update({ mode })} options={[
                                { value: 'content', label: <><Type size={14} /> Designed message</> },
                                { value: 'image', label: <><ImageIcon size={14} /> Image / flyer</> },
                            ]} />
                        </div>
                    </div>

                    {draft.mode === 'image' ? (
                        <>
                            <h3>Image</h3>
                            <div className="opr-image">
                                {imageSrc(draft) ? <img src={imageSrc(draft)} alt="" /> : <span className="opr-image-empty"><ImageIcon size={22} /></span>}
                                <div>
                                    <p className="o-muted">A ready-made flyer or poster. Portrait images work best on phones.</p>
                                    {canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => pick('image')}><Upload size={14} /> {draft.image_version || draft.image_path === '/site/promo.jpg' ? 'Replace image' : 'Upload image'}</button>}
                                </div>
                            </div>
                            <Field label="Description" hint="What the image says, for screen readers and if it can't load">
                                <input className="input" value={draft.image_alt} maxLength={200} onChange={e => update({ image_alt: e.target.value })} />
                            </Field>
                            <Field label="Link when clicked" hint="Optional: https://…, a page on this site like /quote, or tel:+254…">
                                <input className="input" value={draft.image_link} maxLength={500} onChange={e => update({ image_link: e.target.value })} placeholder="/quote" />
                            </Field>
                        </>
                    ) : (
                        <>
                            <h3>Message</h3>
                            <div className="o-form-grid">
                                <Field label="Badge" hint="e.g. New, Limited offer">
                                    <input className="input" value={draft.badge} maxLength={40} onChange={e => update({ badge: e.target.value })} />
                                </Field>
                                <Field label="Highlight" hint="Big text, e.g. 20% OFF">
                                    <input className="input" value={draft.highlight} maxLength={40} onChange={e => update({ highlight: e.target.value })} />
                                </Field>
                            </div>
                            <Field label="Title *">
                                <input className="input" value={draft.title} maxLength={120} onChange={e => update({ title: e.target.value })} placeholder="Ship to Mogadishu for less this month" />
                            </Field>
                            <Field label="Message" hint="One paragraph per line">
                                <textarea className="input" rows={3} value={draft.message} maxLength={600} onChange={e => update({ message: e.target.value })} />
                            </Field>
                            <div className="o-form-grid">
                                <Field label="Button text"><input className="input" value={draft.button_label} maxLength={40} onChange={e => update({ button_label: e.target.value })} placeholder="Get a quote" /></Field>
                                <Field label="Button link"><input className="input" value={draft.button_url} maxLength={500} onChange={e => update({ button_url: e.target.value })} placeholder="/quote" /></Field>
                                <Field label="Second button" hint="Optional"><input className="input" value={draft.secondary_label} maxLength={40} onChange={e => update({ secondary_label: e.target.value })} placeholder="Call us" /></Field>
                                <Field label="Second button link"><input className="input" value={draft.secondary_url} maxLength={500} onChange={e => update({ secondary_url: e.target.value })} placeholder="tel:+254728744300" /></Field>
                            </div>
                            <Field label="Small print" hint="Optional, e.g. Offer ends 31 October. Terms apply.">
                                <input className="input" value={draft.footnote} maxLength={160} onChange={e => update({ footnote: e.target.value })} />
                            </Field>

                            <h3>Style</h3>
                            <div className="o-form-grid">
                                <div>
                                    <span className="o-field-label">Colours</span>
                                    <Segmented value={draft.theme} onChange={theme => update({ theme })} options={[
                                        { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'brand', label: 'Red' },
                                    ]} />
                                </div>
                                <div>
                                    <span className="o-field-label">Text alignment</span>
                                    <Segmented value={draft.align} onChange={align => update({ align })} options={[
                                        { value: 'center', label: 'Centre' }, { value: 'left', label: 'Left' },
                                    ]} />
                                </div>
                            </div>
                            <div className="opr-bg">
                                <span className="o-field-label">Background photo</span>
                                {draft.background ? (
                                    <div className="opr-image">
                                        <img src={apiImage(draft.background_path, draft.background_version)} alt="" />
                                        <div>
                                            {canEdit && <div className="o-row" style={{ gap: '0.5rem' }}>
                                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => pick('background')}><Upload size={14} /> Replace</button>
                                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => update({ background: false })}><Trash2 size={14} /> Remove</button>
                                            </div>}
                                            <label className="opr-range">
                                                <span>Darken photo: {draft.overlay}%</span>
                                                <input type="range" min={0} max={90} step={5} value={draft.overlay} onChange={e => update({ overlay: Number(e.target.value) })} />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => pick('background')}><Upload size={14} /> Add a photo</button>}
                                        <span className="o-field-hint">Optional. Text turns white over the photo; darken it until the text is easy to read.</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <h3>When and where</h3>
                    <div className="o-form-grid">
                        <div>
                            <span className="o-field-label">Show on</span>
                            <Segmented value={draft.pages} onChange={pages => update({ pages })} options={[
                                { value: 'home', label: 'Home page' }, { value: 'all', label: 'Every page' },
                            ]} />
                        </div>
                        <Field label="How often">
                            <select className="input" value={draft.frequency} onChange={e => update({ frequency: e.target.value as PromoSettings['frequency'] })}>
                                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Start date" hint="Optional">
                            <input type="date" className="input" value={draft.start_date} onChange={e => update({ start_date: e.target.value })} />
                        </Field>
                        <Field label="End date" hint="Optional: hides itself after this day">
                            <input type="date" className="input" value={draft.end_date} onChange={e => update({ end_date: e.target.value })} />
                        </Field>
                        <Field label="Delay (seconds)" hint="Wait before it appears">
                            <input type="number" min={0} max={60} step={0.5} className="input" value={draft.delay_seconds} onChange={e => update({ delay_seconds: Number(e.target.value) })} />
                        </Field>
                    </div>
                </fieldset>

                <div className="opr-preview">
                    <span className="o-field-label">Preview</span>
                    <div className="opr-stage">
                        <PromoCard promo={draft} onClose={() => { }}
                            imageSrc={imageSrc(draft) || undefined}
                            backgroundSrc={draft.background ? apiImage(draft.background_path, draft.background_version) : undefined} />
                    </div>
                </div>
            </div>
            {editor && (
                <ImageEditor
                    image={{ path: editor.target === 'image' ? draft.image_path : draft.background_path, label: `${draft.name}: ${editor.target === 'image' ? 'image' : 'background'}`, group: 'Promo popups', usedOn: ['Promo popup'], maxWidth: editor.target === 'image' ? 1000 : 1200 }}
                    file={editor.file}
                    presetAspect={editor.target === 'background' ? 4 / 5 : draft.image_path === '/site/promo.jpg' ? undefined : 3 / 4}
                    onClose={() => setEditor(null)}
                    onSaved={msg => {
                        if (editor.target === 'image') update({ image_version: Date.now() });
                        else update({ background: true, background_version: Date.now() });
                        // The original flyer's file is replaced on the website straight away; new uploads go live on save
                        const live = editor.target === 'image' && draft.image_path === '/site/promo.jpg';
                        toast.success(`${msg}. ${live ? 'The new image is live on the website.' : 'Save the popup to publish it.'}`);
                        setEditor(null);
                    }}
                />
            )}
        </>
    );
}

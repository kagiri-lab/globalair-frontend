'use client';

import { Contact, Building2, Clock, Share2, Plus, Trash2 } from 'lucide-react';
import { Panel, Field } from '@/components/ops/ui';
import type { SiteContact, SiteOffice } from '@/lib/siteInfo';

const SOCIAL: { key: keyof SiteContact['social']; label: string }[] = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'x', label: 'X (Twitter)' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'youtube', label: 'YouTube' },
];

// Lists edited as one entry per line
const toLines = (v?: string[]) => (v || []).join('\n');
const fromLines = (v: string) => v.split('\n').map(s => s.trimStart());

const EMPTY_OFFICE: SiteOffice = { region: '', name: '', lines: [], phones: [], email: '' };

// All four panels save together; saveButton is repeated on each so it's always in reach
export default function ContactDetailsPanel({ value: c, canEdit, actions, saveButton, onChange }: {
    value: SiteContact;
    canEdit: boolean;
    actions: React.ReactNode;
    saveButton: React.ReactNode;
    onChange: (next: SiteContact) => void;
}) {
    const set = (patch: Partial<SiteContact>) => onChange({ ...c, ...patch });
    const setHeader = (patch: Partial<SiteContact['header']>) => set({ header: { ...c.header, ...patch } });
    const setOffice = (idx: number, patch: Partial<SiteOffice>) => set({ offices: c.offices.map((o, i) => (i === idx ? { ...o, ...patch } : o)) });
    const setHours = (idx: number, patch: Partial<{ day: string; hours: string }>) => set({ opening_hours: c.opening_hours.map((h, i) => (i === idx ? { ...h, ...patch } : h)) });
    const off = !canEdit;

    return (
        <>
            <Panel collapsible title="Contact details" subtitle="Shown in the website header, footer, contact page and portal. Changes appear on the site as soon as you save." icon={Contact} actions={actions}>
                <div className="o-form-grid">
                    <Field label="Company name"><input className="input" value={c.company} disabled={off} onChange={e => set({ company: e.target.value })} /></Field>
                    <Field label="Head office address"><input className="input" value={c.address} disabled={off} onChange={e => set({ address: e.target.value })} /></Field>
                    <Field label="Main email"><input type="email" className="input" value={c.email} disabled={off} onChange={e => set({ email: e.target.value })} /></Field>
                    <Field label="Support email" hint="Optional — the main email is used if empty"><input type="email" className="input" value={c.support_email} disabled={off} onChange={e => set({ support_email: e.target.value })} /></Field>
                    <Field label="Phone numbers" hint="One per line. The first is the main number.">
                        <textarea className="input" rows={3} value={toLines(c.phones)} disabled={off} onChange={e => set({ phones: fromLines(e.target.value) })} />
                    </Field>
                    <Field label="WhatsApp number" hint="Digits with country code, e.g. 254737450114. Leave empty to hide the WhatsApp button.">
                        <input className="input" inputMode="numeric" value={c.whatsapp} disabled={off} onChange={e => set({ whatsapp: e.target.value })} />
                    </Field>
                    <Field label="Header location" hint="The office shown in the top bar of the website">
                        <input className="input" value={c.header.location_title} disabled={off} onChange={e => setHeader({ location_title: e.target.value })} />
                    </Field>
                    <Field label="Header location (second line)">
                        <input className="input" value={c.header.location_subtitle} disabled={off} onChange={e => setHeader({ location_subtitle: e.target.value })} />
                    </Field>
                    <Field label="Header phone"><input className="input" value={c.header.phone} disabled={off} onChange={e => setHeader({ phone: e.target.value })} /></Field>
                    <Field label="Header phone label"><input className="input" value={c.header.phone_label} disabled={off} onChange={e => setHeader({ phone_label: e.target.value })} /></Field>
                    <Field label="Google Maps embed" hint="In Google Maps: Share → Embed a map → copy HTML, then paste it here. Leave empty to hide the map." full>
                        <textarea className="input" rows={2} value={c.map_embed} disabled={off} onChange={e => set({ map_embed: e.target.value })} />
                    </Field>
                </div>
            </Panel>

            <Panel collapsible defaultOpen={false} title="Social media" subtitle="Icons appear for each profile you fill in. Links must start with https://" icon={Share2} actions={saveButton}>
                <div className="o-form-grid">
                    {SOCIAL.map(s => (
                        <Field key={s.key} label={s.label}>
                            <input type="url" className="input" value={c.social[s.key] || ''} disabled={off} placeholder="https://" onChange={e => set({ social: { ...c.social, [s.key]: e.target.value } })} />
                        </Field>
                    ))}
                </div>
            </Panel>

            <Panel
                collapsible
                defaultOpen={false}
                title="Opening hours"
                subtitle="Listed on the contact page."
                icon={Clock}
                actions={<>{canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ opening_hours: [...c.opening_hours, { day: '', hours: '' }] })}><Plus size={14} /> Add</button>}{saveButton}</>}
            >
                {c.opening_hours.length === 0 ? <p className="o-muted">No opening hours listed.</p> : (
                    <div className="o-stack" style={{ gap: '0.6rem' }}>
                        {c.opening_hours.map((h, idx) => (
                            <div key={idx} className="o-row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
                                <input className="input" style={{ flex: '1 1 180px' }} value={h.day} disabled={off} placeholder="Monday – Friday" aria-label="Days" onChange={e => setHours(idx, { day: e.target.value })} />
                                <input className="input" style={{ flex: '1 1 180px' }} value={h.hours} disabled={off} placeholder="08:00 a.m – 05:00 p.m" aria-label="Hours" onChange={e => setHours(idx, { hours: e.target.value })} />
                                {canEdit && <button type="button" className="btn btn-secondary btn-sm" aria-label="Remove" onClick={() => set({ opening_hours: c.opening_hours.filter((_, i) => i !== idx) })}><Trash2 size={14} /></button>}
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <Panel
                collapsible
                defaultOpen={false}
                title="Offices"
                subtitle="Each office gets a card on the contact page; the first two also appear in the footer."
                icon={Building2}
                actions={<>{canEdit && <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ offices: [...c.offices, { ...EMPTY_OFFICE }] })}><Plus size={14} /> Add office</button>}{saveButton}</>}
            >
                {c.offices.length === 0 ? <p className="o-muted">No offices listed.</p> : (
                    <div className="oset-steps">
                        {c.offices.map((o, idx) => (
                            <div key={idx} className="oset-step">
                                <span className="oset-step-num">{idx + 1}</span>
                                <div className="o-form-grid" style={{ flex: 1, minWidth: 0 }}>
                                    <Field label="Office name"><input className="input" value={o.name} disabled={off} placeholder="Headquarters — Nairobi" onChange={e => setOffice(idx, { name: e.target.value })} /></Field>
                                    <Field label="Country / region"><input className="input" value={o.region} disabled={off} placeholder="Kenya" onChange={e => setOffice(idx, { region: e.target.value })} /></Field>
                                    <Field label="Address" hint="One line per row">
                                        <textarea className="input" rows={2} value={toLines(o.lines)} disabled={off} onChange={e => setOffice(idx, { lines: fromLines(e.target.value) })} />
                                    </Field>
                                    <Field label="Phone numbers" hint="One per line">
                                        <textarea className="input" rows={2} value={toLines(o.phones)} disabled={off} onChange={e => setOffice(idx, { phones: fromLines(e.target.value) })} />
                                    </Field>
                                    <Field label="Email" hint="Optional — the main email is shown if empty">
                                        <input type="email" className="input" value={o.email || ''} disabled={off} onChange={e => setOffice(idx, { email: e.target.value })} />
                                    </Field>
                                    {canEdit && (
                                        <div className="o-row" style={{ alignItems: 'end' }}>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ offices: c.offices.filter((_, i) => i !== idx) })}><Trash2 size={14} /> Remove office</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </>
    );
}

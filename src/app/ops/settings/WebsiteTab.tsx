'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, LayoutTemplate, BarChart3, Sparkles, Save, X, Plus, ArrowDownAZ, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { countryFlag, allCountryNames } from '@/lib/countries';
import { Panel, Loader, Field } from '@/components/ops/ui';
import type { LucideIcon } from 'lucide-react';
import { normaliseSiteContact } from '@/lib/siteInfo';
import PromoPanel from './PromoPanel';
import FooterPanel from './FooterPanel';

type Item = Record<string, string | number>;
type ContentKey = 'site_contact' | 'shipping_countries' | 'landing_how_it_works' | 'landing_stats' | 'landing_features';

// Editable text fields for each list of cards on the website
const LIST_EDITORS: { key: Exclude<ContentKey, 'shipping_countries' | 'site_contact'>; title: string; subtitle: string; icon: LucideIcon; fields: { name: string; label: string; long?: boolean }[] }[] = [
    { key: 'landing_how_it_works', title: '“How it works” steps', subtitle: 'The numbered steps on the Shipping Portal page.', icon: LayoutTemplate, fields: [{ name: 'title', label: 'Title' }, { name: 'description', label: 'Description', long: true }] },
    { key: 'landing_stats', title: 'Headline numbers', subtitle: 'The statistics band on the Shipping Portal page.', icon: BarChart3, fields: [{ name: 'value', label: 'Number' }, { name: 'label', label: 'Label' }] },
    { key: 'landing_features', title: 'Feature highlights', subtitle: 'The feature cards on the Shipping Portal page.', icon: Sparkles, fields: [{ name: 'title', label: 'Title' }, { name: 'description', label: 'Description', long: true }] },
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function SaveButton({ dirty, saving, onClick }: { dirty: boolean; saving: boolean; onClick: () => void }) {
    return (
        <button className="btn btn-primary btn-sm" onClick={onClick} disabled={!dirty || saving}>
            {saving ? <div className="spinner" /> : <><Save size={14} /> {dirty ? 'Save' : 'Saved'}</>}
        </button>
    );
}

export default function WebsiteTab({ canEdit }: { canEdit: boolean }) {
    const [original, setOriginal] = useState<Record<string, any>>({});
    const [draft, setDraft] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<ContentKey | null>(null);
    const [newCountry, setNewCountry] = useState('');

    const load = useCallback(() => api.get('/admin/landing/content')
        .then(r => {
            const d = r.data.data || {};
            // Contact details are filled in from the website's defaults so the form never starts blank
            const normalised = { ...d, shipping_countries: Array.isArray(d.shipping_countries) ? d.shipping_countries : [], site_contact: normaliseSiteContact(d.site_contact) };
            setOriginal(normalised);
            setDraft(structuredClone(normalised));
        })
        .catch(() => toast.error('Could not load website content'))
        .finally(() => setLoading(false)), []);

    useEffect(() => { load(); }, [load]);

    const suggestions = useMemo(() => allCountryNames(), []);
    const countries: string[] = draft.shipping_countries || [];

    const save = async (key: ContentKey) => {
        setSaving(key);
        try {
            await api.patch('/admin/landing/content', { key, content: draft[key] });
            // Ask the public site to drop its cached copy so the change shows straight away
            await fetch('/api/revalidate-site', { method: 'POST' }).catch(() => {});
            toast.success('Website updated');
            await load();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Could not save');
        } finally {
            setSaving(null);
        }
    };

    // Accepts one name or a pasted list ("Kenya, Uganda; Tanzania")
    const addCountries = () => {
        const names = newCountry.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        if (!names.length) return;
        const have = new Set(countries.map(c => c.toLowerCase()));
        const added = names.filter(n => !have.has(n.toLowerCase()) && have.add(n.toLowerCase()));
        if (!added.length) { toast.error('Already in the list'); return; }
        setDraft(d => ({ ...d, shipping_countries: [...countries, ...added] }));
        setNewCountry('');
    };

    const updateItem = (key: string, idx: number, field: string, value: string) =>
        setDraft(d => ({ ...d, [key]: d[key].map((it: Item, i: number) => (i === idx ? { ...it, [field]: value } : it)) }));

    if (loading) return <Loader label="Loading website content…" />;

    const countriesDirty = !same(countries, original.shipping_countries);
    return (
        <>
            <p className="oset-note">Company name, contact details, offices and opening hours are under <a href="/ops/settings?tab=business">Business</a>.</p>

            <PromoPanel canEdit={canEdit} />

            <FooterPanel canEdit={canEdit} />

            <Panel
                collapsible
                defaultOpen={false}
                title="Countries we ship to"
                subtitle="Shown as a scrolling band on the home page. Leave it empty to hide the band."
                icon={Globe2}
                actions={<>
                    <a className="btn btn-secondary btn-sm" href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View site</a>
                    {canEdit && <SaveButton dirty={countriesDirty} saving={saving === 'shipping_countries'} onClick={() => save('shipping_countries')} />}
                </>}
            >
                {countries.length === 0 ? (
                    <p className="o-muted" style={{ marginBottom: '1rem' }}>No countries yet — the band is hidden on the website.</p>
                ) : (
                    <div className="oset-chips">
                        {countries.map(c => {
                            const f = countryFlag(c);
                            return (
                                <span key={c} className="oset-chip" title={f ? undefined : 'Not a recognised country name — it will show without a flag'}>
                                    {f ? <b>{f}</b> : <Globe2 size={15} />}
                                    {c}
                                    {canEdit && <button type="button" onClick={() => setDraft(d => ({ ...d, shipping_countries: countries.filter(x => x !== c) }))} aria-label={`Remove ${c}`}><X size={12} /></button>}
                                </span>
                            );
                        })}
                    </div>
                )}

                {canEdit && (
                    <div className="oset-add">
                        <input
                            className="input"
                            list="country-suggestions"
                            value={newCountry}
                            onChange={e => setNewCountry(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCountries(); } }}
                            placeholder="Type a country, or paste several separated by commas"
                            aria-label="Add a country"
                        />
                        <datalist id="country-suggestions">{suggestions.map(n => <option key={n} value={n} />)}</datalist>
                        <button type="button" className="btn btn-secondary" onClick={addCountries} disabled={!newCountry.trim()}><Plus size={15} /> Add</button>
                        {countries.length > 1 && (
                            <button type="button" className="btn btn-secondary" onClick={() => setDraft(d => ({ ...d, shipping_countries: [...countries].sort((a, b) => a.localeCompare(b)) }))} title="Sort A to Z">
                                <ArrowDownAZ size={15} /> Sort
                            </button>
                        )}
                    </div>
                )}
            </Panel>

            {LIST_EDITORS.map(ed => {
                const items: Item[] = draft[ed.key] || [];
                const dirty = !same(items, original[ed.key]);
                return (
                    <Panel
                        collapsible
                        defaultOpen={false}
                        key={ed.key}
                        title={ed.title}
                        subtitle={ed.subtitle}
                        icon={ed.icon}
                        actions={canEdit && <SaveButton dirty={dirty} saving={saving === ed.key} onClick={() => save(ed.key)} />}
                    >
                        {items.length === 0 ? <p className="o-muted">Nothing configured.</p> : (
                            <div className="oset-steps">
                                {items.map((item, idx) => (
                                    <div key={String(item.id ?? idx)} className="oset-step">
                                        <span className="oset-step-num">{idx + 1}</span>
                                        <div className="o-stack" style={{ gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                            {ed.fields.map(f => (
                                                <Field key={f.name} label={f.label}>
                                                    {f.long
                                                        ? <textarea className="input" rows={2} value={String(item[f.name] ?? '')} disabled={!canEdit} onChange={e => updateItem(ed.key, idx, f.name, e.target.value)} />
                                                        : <input className="input" value={String(item[f.name] ?? '')} disabled={!canEdit} onChange={e => updateItem(ed.key, idx, f.name, e.target.value)} />}
                                                </Field>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                );
            })}
        </>
    );
}

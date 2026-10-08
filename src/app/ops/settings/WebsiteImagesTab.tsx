'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Images, Upload, Crop, RotateCcw, Zap, ZoomIn, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Panel, Loader, Modal, Segmented, StatGrid, Stat, EmptyState } from '@/components/ops/ui';
import { SITE_IMAGES, type SiteImage } from '@/lib/siteImageCatalog';

type Replaced = { path: string; width: number; height: number; size: number; original_size: number; updated_at: string };

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const errMsg = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

// The untouched file; ?original=1 skips the replacement so crops always start from full quality
const originalSrc = (path: string) => `${path}?original=1`;
// What the website shows now (cache-busted after each change)
const currentSrc = (path: string, r?: Replaced) => (r ? `${path}?v=${new Date(r.updated_at).getTime()}` : originalSrc(path));

const GROUPS = [...new Set(SITE_IMAGES.map(i => i.group))];

export default function WebsiteImagesTab({ canEdit }: { canEdit: boolean }) {
    const [replaced, setReplaced] = useState<Record<string, Replaced>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'replaced' | 'original'>('all');
    const [editing, setEditing] = useState<{ image: SiteImage; file?: File } | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [bulk, setBulk] = useState<{ done: number; total: number; saved: number } | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const pendingImage = useRef<SiteImage | null>(null);

    const load = useCallback(() => api.get('/admin/images')
        .then(r => setReplaced(Object.fromEntries((r.data.data.images as Replaced[]).map(i => [i.path, i]))))
        .catch(() => toast.error('Could not load website images'))
        .finally(() => setLoading(false)), []);
    useEffect(() => { load(); }, [load]);

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return SITE_IMAGES.filter(i =>
            (filter === 'all' || (filter === 'replaced') === !!replaced[i.path]) &&
            (!q || `${i.label} ${i.path} ${i.group} ${i.usedOn.join(' ')}`.toLowerCase().includes(q)));
    }, [search, filter, replaced]);

    const replacedList = Object.values(replaced);
    const saved = replacedList.reduce((n, r) => n + Math.max(0, r.original_size - r.size), 0);

    // "Replace": pick a file first, then open the editor with it
    const pickFile = (image: SiteImage) => { pendingImage.current = image; fileInput.current?.click(); };
    const onFile = (file?: File) => {
        const image = pendingImage.current;
        if (fileInput.current) fileInput.current.value = '';
        if (!file || !image) return;
        if (!file.type.startsWith('image/')) { toast.error('Choose an image file (JPG, PNG or WebP)'); return; }
        if (file.size > 15 * 1024 * 1024) { toast.error('The image must be 15 MB or smaller'); return; }
        setEditing({ image, file });
    };

    const restore = async (image: SiteImage) => {
        setBusy(image.path);
        try {
            await api.delete('/admin/images', { params: { path: image.path } });
            toast.success('Original image restored');
            await load();
        } catch (err) {
            toast.error(errMsg(err, 'Could not restore'));
        } finally {
            setBusy(null);
        }
    };

    // Re-save every original as a resized WebP when that's smaller; each one can be restored later
    const optimiseAll = async () => {
        const todo = SITE_IMAGES.filter(i => !replaced[i.path]);
        if (!todo.length) return;
        setBulk({ done: 0, total: todo.length, saved: 0 });
        let savedBytes = 0, failed = 0;
        for (const [n, image] of todo.entries()) {
            try {
                const blob = await fetch(originalSrc(image.path)).then(r => { if (!r.ok) throw new Error(); return r.blob(); });
                const res = await api.put('/admin/images', blob, {
                    params: { path: image.path, maxWidth: image.maxWidth, skipIfLarger: 1 },
                    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
                });
                if (!res.data.data.skipped) savedBytes += res.data.data.original_size - res.data.data.size;
            } catch {
                failed++;
            }
            setBulk({ done: n + 1, total: todo.length, saved: savedBytes });
        }
        setBulk(null);
        await load();
        toast.success(`Optimised the website’s images: ${kb(savedBytes)} smaller in total${failed ? ` (${failed} couldn’t be processed)` : ''}`);
    };

    if (loading) return <Loader label="Loading website images…" />;

    const unoptimised = SITE_IMAGES.filter(i => !replaced[i.path]).length;

    return (
        <>
            <StatGrid cols={3}>
                <Stat icon={Images} label="Website images" value={SITE_IMAGES.length} />
                <Stat icon={Crop} label="Replaced or optimised" value={replacedList.length} tone="brand" onClick={() => setFilter(f => (f === 'replaced' ? 'all' : 'replaced'))} active={filter === 'replaced'} />
                <Stat icon={Zap} label="Saved in page weight" value={kb(saved)} tone="success" />
            </StatGrid>

            <div className="owi-toolbar">
                <label className="owi-search">
                    <Search size={16} />
                    <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, page or file…" aria-label="Search images" />
                </label>
                <Segmented value={filter} onChange={setFilter} options={[
                    { value: 'all', label: 'All' },
                    { value: 'replaced', label: 'Replaced', count: replacedList.length },
                    { value: 'original', label: 'Original', count: unoptimised },
                ]} />
                {canEdit && unoptimised > 0 && (
                    <button type="button" className="btn btn-secondary" onClick={optimiseAll} disabled={!!bulk}>
                        {bulk ? <><div className="spinner" /> Optimising {bulk.done}/{bulk.total}…</> : <><Zap size={15} /> Optimise all originals ({unoptimised})</>}
                    </button>
                )}
            </div>
            {bulk && <div className="owi-progress"><span style={{ width: `${(bulk.done / bulk.total) * 100}%` }} /></div>}

            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => onFile(e.target.files?.[0])} />

            {shown.length === 0 && <EmptyState icon={Images} title="No images match" text="Try another search or filter." />}

            {GROUPS.map(group => {
                const items = shown.filter(i => i.group === group);
                if (!items.length) return null;
                const count = items.filter(i => replaced[i.path]).length;
                return (
                    <Panel key={group} collapsible defaultOpen={!!search || group === GROUPS[0]} title={group}
                        subtitle={`${items.length} image${items.length === 1 ? '' : 's'}${count ? ` · ${count} replaced` : ''}`} icon={Images}>
                        <div className="owi-grid">
                            {items.map(image => {
                                const r = replaced[image.path];
                                return (
                                    <div key={image.path} className="owi-card">
                                        <div className="owi-thumb">
                                            <img src={currentSrc(image.path, r)} alt={image.label} loading="lazy" />
                                            {r && <span className="owi-badge">{kb(r.size)}{r.original_size > r.size ? ` · −${Math.round((1 - r.size / r.original_size) * 100)}%` : ''}</span>}
                                        </div>
                                        <div className="owi-info">
                                            <strong title={image.label}>{image.label}</strong>
                                            <small title={image.usedOn.join(', ')}>{image.usedOn.join(', ')}</small>
                                        </div>
                                        {canEdit && (
                                            <div className="owi-actions">
                                                <button type="button" className="btn btn-primary btn-sm" onClick={() => pickFile(image)} disabled={busy === image.path}><Upload size={13} /> Replace</button>
                                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing({ image })} disabled={busy === image.path} title="Crop, resize and optimise the current image"><Crop size={13} /> Edit</button>
                                                {r && <button type="button" className="btn btn-secondary btn-sm" onClick={() => restore(image)} disabled={busy === image.path} title="Go back to the original image"><RotateCcw size={13} /></button>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>
                );
            })}

            {editing && (
                <ImageEditor
                    image={editing.image}
                    file={editing.file}
                    onClose={() => setEditing(null)}
                    onSaved={async (msg) => { setEditing(null); toast.success(msg); await load(); }}
                />
            )}
        </>
    );
}

// ── Crop, resize & optimise ──────────────────────────────────────────────────
const WIDTHS = [480, 800, 1200, 1400, 1920];

/** Crop, resize and optimise one website image. presetAspect: the shape to crop to when the image has no original file (e.g. a new upload slot) */
export function ImageEditor({ image, file, onClose, onSaved, presetAspect }: {
    image: SiteImage; file?: File; onClose: () => void; onSaved: (msg: string) => void; presetAspect?: number;
}) {
    const [slotAspect, setSlotAspect] = useState<number | null>(presetAspect ?? null);   // shape of the image on the website
    const [sourceAspect, setSourceAspect] = useState<number | null>(null);
    const [shape, setShape] = useState<'slot' | 'whole' | '16:9' | '4:3' | '1:1'>('slot');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [area, setArea] = useState<Area | null>(null);
    const [maxWidth, setMaxWidth] = useState(image.maxWidth);
    const [saving, setSaving] = useState(false);

    // Source: the chosen file, or the original image for "Edit"
    const src = useMemo(() => (file ? URL.createObjectURL(file) : originalSrc(image.path)), [file, image.path]);
    useEffect(() => () => { if (file) URL.revokeObjectURL(src); }, [file, src]);

    // The website's current shape, so a new image fits the same space without stretching the layout
    useEffect(() => {
        if (presetAspect) return;
        const el = new Image();
        el.onload = () => setSlotAspect(el.naturalWidth / el.naturalHeight);
        el.src = originalSrc(image.path);
    }, [image.path, presetAspect]);

    const aspect = shape === 'slot' ? slotAspect : shape === 'whole' ? sourceAspect : shape === '16:9' ? 16 / 9 : shape === '4:3' ? 4 / 3 : 1;
    // The cropper reports the source's shape only once it's showing, so give it a starting shape
    const shownAspect = aspect || slotAspect || 4 / 3;

    const save = async () => {
        setSaving(true);
        try {
            const blob: Blob = file ?? await fetch(originalSrc(image.path)).then(r => r.blob());
            const res = await api.put('/admin/images', blob, {
                params: {
                    path: image.path, maxWidth,
                    ...(area && shape !== 'whole' ? { x: area.x, y: area.y, width: area.width, height: area.height } : {}),
                },
                headers: { 'Content-Type': blob.type || 'application/octet-stream' },
            });
            const d = res.data.data;
            onSaved(`Saved ${d.width} × ${d.height} px: ${kb(d.original_size)} → ${kb(d.size)}`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not save the image'));
            setSaving(false);
        }
    };

    return (
        <Modal open onClose={onClose} width={860}
            title={file ? `Replace “${image.label}”` : `Edit “${image.label}”`}
            subtitle={`Used on: ${image.usedOn.join(', ')}`}
            footer={<>
                <span className="owi-out">Saved as WebP, up to {maxWidth}px wide. Usually 70–90% smaller than a camera photo.</span>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !src || !aspect}>
                    {saving ? <div className="spinner" /> : <><Zap size={15} /> Save & optimise</>}
                </button>
            </>}>
            <div className="owi-editor">
                <div className="owi-crop">
                    {src ? (
                        <Cropper
                            image={src}
                            crop={crop}
                            zoom={zoom}
                            aspect={shownAspect}
                            minZoom={1}
                            maxZoom={4}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={(_, px) => setArea(px)}
                            onMediaLoaded={m => setSourceAspect(m.naturalWidth / m.naturalHeight)}
                            showGrid
                        />
                    ) : <Loader label="Loading image…" />}
                </div>
                <div className="owi-controls">
                    <div>
                        <span className="o-field-label">Shape</span>
                        <Segmented value={shape} onChange={v => { setShape(v); setZoom(1); setCrop({ x: 0, y: 0 }); }} options={[
                            { value: 'slot', label: 'Same as website' },
                            { value: 'whole', label: 'Whole image' },
                            { value: '16:9', label: '16:9' },
                            { value: '4:3', label: '4:3' },
                            { value: '1:1', label: 'Square' },
                        ]} />
                        <span className="o-field-hint">“Same as website” keeps the space this image fills, so pages don’t shift.</span>
                    </div>
                    <label className="owi-zoom">
                        <ZoomIn size={16} />
                        <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} disabled={shape === 'whole'} aria-label="Zoom" />
                    </label>
                    <div>
                        <span className="o-field-label">Maximum width</span>
                        <Segmented value={String(maxWidth)} onChange={v => setMaxWidth(Number(v))}
                            options={WIDTHS.map(w => ({ value: String(w), label: `${w}px${w === image.maxWidth ? ' ★' : ''}` }))} />
                        <span className="o-field-hint">★ recommended for where this image appears. Smaller widths load faster.</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

'use client';

import { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
    ArrowRight, Check, MapPin, Package, Plus, ChevronDown, BookHeart, ArrowLeft, Trash2,
    AlertTriangle, Snowflake, Plane, Ship, Truck, Search, Pencil, Calendar, Weight, Info, Navigation, Flag,
} from 'lucide-react';
import api from '@/lib/api';
import { ProductCategory, QuoteResult, QuoteProblem, TransportMode } from '@/lib/types';
import GoogleAddressPicker from '@/components/GoogleAddressPicker';
import QuoteRequestModal, { QuotePrefill } from '@/components/portal/QuoteRequestModal';
import '@/components/portal/new-shipment.css';

// ── Schema ────────────────────────────────────────────────────────────────────
const itemSchema = z.object({
    category_id: z.string().min(2, 'Select a category'),
    description: z.string().min(2, 'Description required'),
    weight_kg: z.coerce.number().min(0.001, 'Weight must be > 0'),
    length_cm: z.coerce.number().optional(),
    width_cm: z.coerce.number().optional(),
    height_cm: z.coerce.number().optional(),
    quantity: z.coerce.number().min(1).default(1),
    declared_value: z.coerce.number().optional(),
    is_fragile: z.boolean().default(false),
    is_hazardous: z.boolean().default(false),
    requires_refrigeration: z.boolean().default(false),
    special_instructions: z.string().optional(),
});

const schema = z.object({
    items: z.array(itemSchema).min(1, 'Add at least one item'),
    origin_country_id: z.string().min(1, 'Please select origin country'),
    origin_id: z.string().min(1, 'Please select origin city'),
    destination_country_id: z.string().min(1, 'Please select destination country'),
    destination_id: z.string().min(1, 'Please select destination city'),

    pickup_address: z.string().min(5, 'Address is required'),
    pickup_city: z.string().optional(),
    pickup_state: z.string().optional(),
    pickup_country: z.string().optional(),
    pickup_postal_code: z.string().optional(),
    pickup_contact_name: z.string().optional(),
    pickup_contact_phone: z.string().optional(),

    destination_address: z.string().min(5, 'Address is required'),
    destination_city: z.string().optional(),
    destination_state: z.string().optional(),
    destination_country: z.string().optional(),
    destination_postal_code: z.string().optional(),
    destination_contact_name: z.string().optional(),
    destination_contact_phone: z.string().optional(),

    shipment_type: z.enum(['standard', 'express', 'overnight']).default('standard'),
    transport_mode: z.enum(['air', 'sea', 'road']).default('air'),
    notes: z.string().optional(),
    save_pickup_address: z.boolean().default(false),
    save_destination_address: z.boolean().default(false),

    pickup_latitude: z.number().optional(),
    pickup_longitude: z.number().optional(),
    destination_latitude: z.number().optional(),
    destination_longitude: z.number().optional(),
});
type FormData = z.infer<typeof schema>;

const EMPTY_ITEM = { category_id: '', description: '', weight_kg: 1, quantity: 1, is_fragile: false, is_hazardous: false, requires_refrigeration: false };

const MODE_META: Record<string, { label: string; icon: typeof Plane; blurb: string }> = {
    air: { label: 'Air freight', icon: Plane, blurb: 'Fastest — ideal for urgent and high-value cargo' },
    sea: { label: 'Sea freight', icon: Ship, blurb: 'Most economical for heavy or bulky loads' },
    road: { label: 'Road freight', icon: Truck, blurb: 'Door-to-door overland across the region' },
};

const money = (n: number | string) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Searchable select ────────────────────────────────────────────────────────
interface Option { id: string; name: string }

function SearchableSelect({ id, label, options, value, onChange, placeholder, disabled, error }: {
    id: string; label: string; options: Option[]; value: string; onChange: (v: string) => void;
    placeholder: string; disabled?: boolean; error?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = options.find(o => o.id === value);
    const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={containerRef} className={`ns-select${isOpen ? ' open' : ''}`}>
            <label className="label" htmlFor={id}>{label}</label>
            <button
                id={id}
                type="button"
                className={`ns-select-trigger${error ? ' error' : ''}`}
                onClick={() => !disabled && setIsOpen(o => !o)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={selected ? '' : 'placeholder'}>{selected ? selected.name : placeholder}</span>
                <ChevronDown size={16} />
            </button>
            {isOpen && (
                <div className="ns-select-menu">
                    <div className="ns-select-search">
                        <Search size={14} />
                        <input autoFocus className="input" placeholder="Type to search…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <ul role="listbox">
                        {filtered.length > 0 ? filtered.map(o => (
                            <li key={o.id} role="option" aria-selected={o.id === value}>
                                <button type="button" className={o.id === value ? 'active' : ''} onClick={() => { onChange(o.id); setIsOpen(false); setSearch(''); }}>
                                    {o.name} {o.id === value && <Check size={14} />}
                                </button>
                            </li>
                        )) : <li className="ns-select-empty">No results found</li>}
                    </ul>
                </div>
            )}
            {error && <p className="field-error">{error}</p>}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = [
    { label: 'Pickup', hint: 'Where we collect' },
    { label: 'Delivery', hint: 'Where it goes' },
    { label: 'Package', hint: 'What you’re sending' },
    { label: 'Review', hint: 'Confirm & book' },
];

const STEP_FIELDS: (keyof FormData)[][] = [
    ['origin_country_id', 'origin_id', 'pickup_address'],
    ['destination_country_id', 'destination_id', 'destination_address'],
    ['items'],
    [],
];

export default function NewShipmentPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>}>
            <NewShipmentForm />
        </Suspense>
    );
}

function NewShipmentForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const draftId = searchParams.get('draftId');
    const [step, setStep] = useState(0);
    const [furthestStep, setFurthestStep] = useState(0);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [hierarchy, setHierarchy] = useState<any>(null);
    const [quote, setQuote] = useState<QuoteResult | null>(null);
    const [quoteProblem, setQuoteProblem] = useState<QuoteProblem | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [draftLoading, setDraftLoading] = useState(false);
    const [isDraftSuccess, setIsDraftSuccess] = useState(false);
    const [expandedItemIdx, setExpandedItemIdx] = useState(0);
    const [googleMapsEnabled, setGoogleMapsEnabled] = useState(false);
    const [pickedAddress, setPickedAddress] = useState<{ pickup?: string; destination?: string }>({});
    const [quoteRequest, setQuoteRequest] = useState<QuotePrefill | null>(null);
    const topRef = useRef<HTMLDivElement>(null);

    const { register, handleSubmit, control, watch, trigger, setValue, getValues, reset, formState: { errors, isSubmitting } } = useForm<any>({
        resolver: zodResolver(schema),
        defaultValues: {
            origin_country_id: '',
            origin_id: '',
            destination_country_id: '',
            destination_id: '',
            pickup_address: '',
            destination_address: '',
            shipment_type: 'standard',
            transport_mode: 'air',
            items: [{ ...EMPTY_ITEM, weight_kg: 0.5 }],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const watchedValues = watch();

    useEffect(() => {
        // Load static data once (and the draft, when resuming one)
        const loadInitialData = async () => {
            try {
                const [cats, locs, addrs, settingsRes] = await Promise.all([
                    api.get('/categories'),
                    api.get('/locations/hierarchy'),
                    api.get('/addresses'),
                    api.get('/public/settings'),
                ]);
                setCategories(cats.data.data.categories);
                setHierarchy(locs.data.data);
                setSavedAddresses(addrs.data.data.addresses);
                setGoogleMapsEnabled(settingsRes.data.data.settings.google_maps_enabled === 'true');

                if (draftId) {
                    const res = await api.get(`/shipments/${draftId}`);
                    const s = res.data.data.shipment;
                    if (s.status === 'draft') {
                        // Find country IDs from town IDs in the hierarchy
                        let origin_country_id = '';
                        let destination_country_id = '';
                        const h = locs.data.data;
                        if (h) {
                            for (const country of h.origins) {
                                if (s.origin_id && country.cities.some((c: any) => c.id === s.origin_id)) {
                                    origin_country_id = country.id;
                                    break;
                                } else if (!s.origin_id && country.name === s.pickup_country) {
                                    origin_country_id = country.id;
                                    const city = country.cities.find((c: any) => c.name === s.pickup_city);
                                    if (city) s.origin_id = city.id;
                                    break;
                                }
                            }
                            for (const country of h.destinations) {
                                if (s.destination_id && country.cities.some((c: any) => c.id === s.destination_id)) {
                                    destination_country_id = country.id;
                                    break;
                                } else if (!s.destination_id && country.name === s.destination_country) {
                                    destination_country_id = country.id;
                                    const city = country.cities.find((c: any) => c.name === s.destination_city);
                                    if (city) s.destination_id = city.id;
                                    break;
                                }
                            }
                        }

                        reset({
                            origin_country_id,
                            origin_id: s.origin_id || '',
                            destination_country_id,
                            destination_id: s.destination_id || '',
                            pickup_address: s.pickup_address || '',
                            pickup_city: s.pickup_city || '',
                            pickup_state: s.pickup_state || '',
                            pickup_country: s.pickup_country || '',
                            pickup_postal_code: s.pickup_postal_code || '',
                            pickup_contact_name: s.pickup_contact_name || '',
                            pickup_contact_phone: s.pickup_contact_phone || '',
                            destination_address: s.destination_address || '',
                            destination_city: s.destination_city || '',
                            destination_state: s.destination_state || '',
                            destination_country: s.destination_country || '',
                            destination_postal_code: s.destination_postal_code || '',
                            destination_contact_name: s.destination_contact_name || '',
                            destination_contact_phone: s.destination_contact_phone || '',
                            pickup_latitude: s.pickup_latitude ? Number(s.pickup_latitude) : undefined,
                            pickup_longitude: s.pickup_longitude ? Number(s.pickup_longitude) : undefined,
                            destination_latitude: s.destination_latitude ? Number(s.destination_latitude) : undefined,
                            destination_longitude: s.destination_longitude ? Number(s.destination_longitude) : undefined,
                            shipment_type: s.shipment_type || 'standard',
                            transport_mode: s.transport_mode || 'air',
                            notes: s.notes || '',
                            items: s.items.map((i: any) => ({
                                category_id: i.category_id,
                                description: i.description,
                                weight_kg: Number(i.weight_kg),
                                length_cm: i.length_cm ? Number(i.length_cm) : undefined,
                                width_cm: i.width_cm ? Number(i.width_cm) : undefined,
                                height_cm: i.height_cm ? Number(i.height_cm) : undefined,
                                quantity: Number(i.quantity || 1),
                                declared_value: i.declared_value ? Number(i.declared_value) : undefined,
                                is_fragile: !!i.is_fragile,
                                is_hazardous: !!i.is_hazardous,
                                requires_refrigeration: !!i.requires_refrigeration,
                                special_instructions: i.special_instructions || '',
                            })),
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to load initial data', err);
            }
        };

        loadInitialData();
    }, [draftId, reset]);

    // Helper to find a location name by ID
    const findLocName = (id: string) => {
        if (!hierarchy || !id) return '';
        for (const list of [hierarchy.origins, hierarchy.destinations]) {
            for (const country of list) {
                if (country.id === id) return country.name;
                const city = country.cities.find((c: any) => c.id === id);
                if (city) return city.name;
            }
        }
        return '';
    };

    // Modes with a price from the chosen origin to the chosen destination, that every chosen category allows
    const itemCategoryIds = (watchedValues.items || []).map((i: any) => i.category_id).filter(Boolean).join(',');
    const transportModes = useMemo(() => {
        const destCountry = hierarchy?.destinations.find((d: any) => d.id === watchedValues.destination_country_id);
        const destCity = destCountry?.cities.find((c: any) => c.id === watchedValues.destination_id);
        let modes: string[] = ['air', 'sea', 'road'];
        if (destCity && watchedValues.origin_id) modes = destCity.routes?.[watchedValues.origin_id] || [];
        else if (!destCity) modes = ['air'];
        for (const id of itemCategoryIds.split(',').filter(Boolean)) {
            const allowed = categories.find(c => c.id === id)?.allowed_modes;
            if (allowed?.length) modes = modes.filter(m => allowed.includes(m as TransportMode));
        }
        return ['air', 'sea', 'road'].filter(m => modes.includes(m));
    }, [hierarchy, watchedValues.destination_country_id, watchedValues.destination_id, watchedValues.origin_id, itemCategoryIds, categories]);
    const routeUnpriced = !!(watchedValues.destination_id && watchedValues.origin_id && transportModes.length === 0);

    useEffect(() => {
        if (transportModes.length > 0 && !transportModes.includes(watchedValues.transport_mode)) {
            setValue('transport_mode', transportModes[0] as any);
        }
    }, [transportModes, watchedValues.transport_mode, setValue]);

    // ── Live price estimate: re-quote (debounced) whenever route, mode or items change ──
    // Send everything the backend prices on — dimensions (volumetric weight) and handling flags (15% surcharge) —
    // so the estimate matches the price the shipment is booked at
    const quotableItems = (watchedValues.items || [])
        .filter((i: any) => i.category_id && Number(i.weight_kg) > 0)
        .map((i: any) => ({
            category_id: i.category_id,
            weight_kg: Number(i.weight_kg),
            quantity: Number(i.quantity) || 1,
            length_cm: Number(i.length_cm) || undefined,
            width_cm: Number(i.width_cm) || undefined,
            height_cm: Number(i.height_cm) || undefined,
            declared_value: Number(i.declared_value) || undefined,
            description: i.description || undefined,
            is_fragile: !!i.is_fragile,
            is_hazardous: !!i.is_hazardous,
            requires_refrigeration: !!i.requires_refrigeration,
        }));
    const quoteKey = watchedValues.origin_id && watchedValues.destination_id && quotableItems.length
        ? JSON.stringify([watchedValues.origin_id, watchedValues.destination_id, watchedValues.transport_mode, quotableItems])
        : '';

    useEffect(() => {
        if (!quoteKey) return;
        let cancelled = false;
        const t = setTimeout(async () => {
            const [origin_id, destination_id, transport_mode, items] = JSON.parse(quoteKey);
            setQuoteLoading(true);
            try {
                const res = await api.post('/shipments/quote', { origin_id, destination_id, transport_mode, items });
                if (!cancelled) { setQuote(res.data.data); setQuoteProblem(null); }
            } catch (err: any) {
                // No price for the route, or an item breaks its category's rules
                if (!cancelled) {
                    setQuote(null);
                    const d = err.response?.data;
                    setQuoteProblem(d?.message ? { code: d.code, message: d.message, contact: d.contact } : { message: 'We couldn’t price this shipment right now.', contact: true });
                }
            } finally {
                if (!cancelled) setQuoteLoading(false);
            }
        }, 450);
        return () => { cancelled = true; clearTimeout(t); };
    }, [quoteKey]);

    const shownQuote = quoteKey ? quote : null;
    const shownProblem = routeUnpriced
        ? { code: 'NO_RATE', message: `We don’t have a set price for this route yet. Contact us and we’ll send you a quote.`, contact: true }
        : quoteKey ? quoteProblem : null;

    // Picking a category pre-ticks the handling it always needs (e.g. cold chain for perishables)
    const applyCategoryDefaults = (idx: number, categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) return;
        if (cat.default_fragile) setValue(`items.${idx}.is_fragile`, true);
        if (cat.default_hazardous) setValue(`items.${idx}.is_hazardous`, true);
        if (cat.default_refrigeration) setValue(`items.${idx}.requires_refrigeration`, true);
    };

    // No set price: open the in-portal quote request, filled with what's been entered so far
    const openQuoteRequest = () => {
        const v = getValues();
        const its: any[] = (v.items || []).filter((i: any) => i.category_id || i.description);
        const catName = (id: string) => categories.find(c => c.id === id)?.name;
        const flags = (i: any) => [i.is_fragile && 'fragile', i.is_hazardous && 'hazardous', i.requires_refrigeration && 'refrigerated'].filter(Boolean);
        const weight = its.reduce((n, i) => n + (Number(i.weight_kg) || 0) * (Number(i.quantity) || 1), 0);
        const dims = (i: any) => i.length_cm && i.width_cm && i.height_cm ? `${i.length_cm} × ${i.width_cm} × ${i.height_cm} cm` : '';
        setQuoteRequest({
            pickup_city: findLocName(v.origin_id),
            pickup_region: findLocName(v.origin_country_id),
            pickup_address: v.pickup_address || '',
            dropoff_city: findLocName(v.destination_id),
            dropoff_region: findLocName(v.destination_country_id),
            dropoff_address: v.destination_address || '',
            transport_mode: routeUnpriced ? '' : MODE_META[v.transport_mode]?.label || '',
            commodity: [...new Set(its.map(i => i.description || catName(i.category_id)).filter(Boolean))].join(', '),
            weight: weight > 0 ? `${weight.toFixed(1)} kg` : '',
            dimensions: its.length === 1 ? dims(its[0]) : '',
            booking: {
                origin_country_id: v.origin_country_id, origin_id: v.origin_id,
                destination_country_id: v.destination_country_id, destination_id: v.destination_id,
                transport_mode: routeUnpriced ? undefined : v.transport_mode, shipment_type: v.shipment_type,
                items: its,
            },
            items: its.map(i => {
                const extra = [dims(i), ...flags(i)].filter(Boolean).join(', ');
                return `${Number(i.quantity) || 1} × ${i.description || 'Item'}${catName(i.category_id) ? ` (${catName(i.category_id)})` : ''}, ${Number(i.weight_kg) || 0} kg each${extra ? `, ${extra}` : ''}`;
            }).join('; '),
        });
    };

    const goToStep = (n: number) => {
        setStep(n);
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const goNext = async () => {
        const valid = await trigger(STEP_FIELDS[step] as any);
        if (!valid) {
            // Open the first item with a problem so the user can see it
            if (step === 2 && Array.isArray(errors.items)) {
                const firstBad = (errors.items as any[]).findIndex(Boolean);
                if (firstBad >= 0) setExpandedItemIdx(firstBad);
            }
            toast.error('Please complete the highlighted fields');
            return;
        }
        const next = step + 1;
        setFurthestStep(f => Math.max(f, next));
        goToStep(next);
    };

    const onSubmit = async (data: FormData, status = 'pending') => {
        if (status === 'draft') setDraftLoading(true);
        try {
            let originCountryName = '';
            let originCityName = '';
            if (hierarchy) {
                for (const country of hierarchy.origins) {
                    if (country.id === data.origin_country_id) {
                        originCountryName = country.name;
                        const city = country.cities.find((c: any) => c.id === data.origin_id);
                        if (city) originCityName = city.name;
                    }
                }
            }
            const destCountry = hierarchy?.destinations.find((d: any) => d.id === data.destination_country_id);
            const destCity = destCountry?.cities.find((c: any) => c.id === data.destination_id);

            const payload = {
                ...data,
                status,
                pickup_city: originCityName,
                pickup_country: originCountryName,
                destination_city: destCity?.name,
                destination_country: destCountry?.name,
            };

            const res = draftId
                ? await api.put(`/shipments/${draftId}`, payload)
                : await api.post('/shipments', payload);

            if (status === 'draft') {
                setIsDraftSuccess(true);
                toast.success('Saved as draft');
            } else {
                setTrackingNumber(res.data.data.shipment.tracking_number);
                toast.success(draftId ? 'Shipment finalized!' : 'Shipment booked!');
            }
            goToStep(4);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to process shipment');
        } finally {
            setDraftLoading(false);
        }
    };

    const startOver = () => {
        reset({
            origin_country_id: '', origin_id: '', destination_country_id: '', destination_id: '',
            pickup_address: '', destination_address: '', shipment_type: 'standard', transport_mode: 'air',
            items: [{ ...EMPTY_ITEM, weight_kg: 0.5 }],
        });
        setTrackingNumber(''); setQuote(null); setIsDraftSuccess(false); setFurthestStep(0); setPickedAddress({});
        if (draftId) router.replace('/shipments/new');
        goToStep(0);
    };

    // ── Derived summary values ──
    const items: any[] = watchedValues.items || [];
    const totalWeight = items.reduce((n, i) => n + (Number(i.weight_kg) || 0) * (Number(i.quantity) || 1), 0);
    const totalPieces = items.reduce((n, i) => n + (Number(i.quantity) || 1), 0);
    const originName = findLocName(watchedValues.origin_id);
    const destName = findLocName(watchedValues.destination_id);
    const ModeIcon = MODE_META[watchedValues.transport_mode]?.icon || Plane;

    // ── Done ──
    if (step === 4) {
        return (
            <div className="portal-page ns-page" ref={topRef}>
                <div className="ns-done card fade-in">
                    <div className={`ns-done-icon${isDraftSuccess ? ' draft' : ''}`}>
                        {isDraftSuccess ? <BookHeart size={34} /> : <Check size={36} />}
                    </div>
                    <h1>{isDraftSuccess ? 'Draft saved' : 'Shipment booked!'}</h1>
                    <p>
                        {isDraftSuccess
                            ? 'Your shipment is saved as a draft. Finish booking it any time from My Shipments.'
                            : 'We’ve received your booking. Our team will confirm it and schedule the pickup shortly.'}
                    </p>
                    {!isDraftSuccess && (
                        <div className="ns-done-tn">
                            <span>Tracking number</span>
                            <strong>{trackingNumber}</strong>
                        </div>
                    )}
                    <div className="ns-done-actions">
                        {!isDraftSuccess && (
                            <Link href={`/dashboard/track?q=${encodeURIComponent(trackingNumber)}`} className="btn btn-primary"><Navigation size={16} /> Track shipment</Link>
                        )}
                        <Link href="/shipments" className="btn btn-secondary">View my shipments</Link>
                        <button type="button" onClick={startOver} className="btn btn-secondary"><Plus size={16} /> Book another</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Pickup / delivery step (same layout for both ends) ──
    const renderLocationStep = (kind: 'pickup' | 'destination') => {
        const isPickup = kind === 'pickup';
        const list = isPickup ? hierarchy?.origins : hierarchy?.destinations;
        const countryField = isPickup ? 'origin_country_id' : 'destination_country_id';
        const cityField = isPickup ? 'origin_id' : 'destination_id';
        const countryId = watchedValues[countryField];
        const country = list?.find((c: any) => c.id === countryId);

        return (
            <div className="fade-in">
                <div className="ns-card">
                    <div className="ns-card-head">
                        <span className="ns-card-icon">{isPickup ? <MapPin size={18} /> : <Flag size={18} />}</span>
                        <div>
                            <h2>{isPickup ? 'Pickup details' : 'Delivery details'}</h2>
                            <p>{isPickup ? 'Where should we collect your shipment?' : 'Where should we deliver it?'}</p>
                        </div>
                    </div>

                    {savedAddresses.length > 0 && (
                        <div className="ns-saved">
                            <p><BookHeart size={14} /> Use a saved address</p>
                            <div className="ns-saved-list">
                                {savedAddresses.map(a => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        className={pickedAddress[kind] === a.id ? 'active' : ''}
                                        onClick={() => {
                                            setValue(`${kind}_address`, a.address, { shouldValidate: true });
                                            setValue(`${kind}_contact_name`, a.contact_name || '');
                                            setValue(`${kind}_contact_phone`, a.contact_phone || '');
                                            setPickedAddress(p => ({ ...p, [kind]: a.id }));
                                            // Saved addresses keep the country and town by name: pick the matching ones we serve
                                            const same = (x?: string, y?: string) => !!x && !!y && x.trim().toLowerCase() === y.trim().toLowerCase();
                                            const savedCountry = (list || []).find((c: any) => same(c.name, a.country) || same(c.code, a.country));
                                            const savedCity = savedCountry?.cities.find((c: any) => same(c.name, a.city));
                                            if (savedCountry) {
                                                setValue(countryField, savedCountry.id, { shouldValidate: true });
                                                setValue(cityField, savedCity?.id || '', { shouldValidate: !!savedCity });
                                            }
                                            if (!savedCountry || !savedCity) {
                                                toast(`We don’t ${isPickup ? 'collect from' : 'deliver to'} ${a.city || a.country} yet. Choose the nearest ${savedCountry ? 'town' : 'country and town'}.`);
                                            }
                                        }}
                                    >
                                        <strong>{a.label}</strong>
                                        <span>{a.address}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="ns-grid">
                        <SearchableSelect
                            id={`${kind}-country`}
                            label="Country *"
                            placeholder="Select country"
                            options={list || []}
                            value={countryId}
                            onChange={val => { setValue(countryField, val, { shouldValidate: true }); setValue(cityField, ''); }}
                            error={errors[countryField]?.message as string}
                        />
                        <SearchableSelect
                            id={`${kind}-city`}
                            label="Town / City *"
                            placeholder={countryId ? 'Select town' : 'Choose a country first'}
                            options={country?.cities || []}
                            value={watchedValues[cityField]}
                            onChange={val => setValue(cityField, val, { shouldValidate: true })}
                            disabled={!countryId}
                            error={errors[cityField]?.message as string}
                        />
                        <div className="span-2">
                            <GoogleAddressPicker
                                key={`${kind}-${pickedAddress[kind] || 'manual'}`}
                                label={isPickup ? 'Street address / building *' : 'Delivery street address / building *'}
                                placeholder={isPickup ? 'e.g. Bruce House, Standard Street' : 'e.g. Halane Road, near the airport'}
                                defaultValue={watchedValues[`${kind}_address`]}
                                countryCode={country?.country_code}
                                onAddressSelect={(address, lat, lng) => {
                                    setValue(`${kind}_address`, address, { shouldValidate: !!errors[`${kind}_address`] });
                                    setValue(`${kind}_latitude`, lat);
                                    setValue(`${kind}_longitude`, lng);
                                }}
                                error={errors[`${kind}_address`]?.message as string}
                                disabled={!googleMapsEnabled}
                            />
                        </div>
                        <div>
                            <label className="label" htmlFor={`${kind}-contact`}>{isPickup ? 'Contact name' : 'Recipient name'}</label>
                            <input id={`${kind}-contact`} {...register(`${kind}_contact_name`)} className="input" placeholder={isPickup ? 'Person handing over' : 'Person receiving'} autoComplete="name" />
                        </div>
                        <div>
                            <label className="label" htmlFor={`${kind}-phone`}>{isPickup ? 'Contact phone' : 'Recipient phone'}</label>
                            <input id={`${kind}-phone`} {...register(`${kind}_contact_phone`)} className="input" placeholder="+254 700 000 000" type="tel" autoComplete="tel" />
                        </div>
                    </div>

                    <label className="ns-check">
                        <input type="checkbox" {...register(isPickup ? 'save_pickup_address' : 'save_destination_address')} />
                        <span>Save this address to my address book</span>
                    </label>
                </div>
            </div>
        );
    };

    const itemErrors = (idx: number) => (errors.items as any)?.[idx] || {};

    return (
        <div className="portal-page ns-page" ref={topRef}>
            <div className="portal-page-head">
                <div>
                    <h1>{draftId ? 'Finish your shipment' : 'New shipment'}</h1>
                    <p>{draftId ? 'Pick up where you left off.' : 'Book a pickup in four quick steps — prices update as you go.'}</p>
                </div>
            </div>

            {/* Stepper */}
            <ol className="ns-stepper" aria-label="Booking steps">
                {STEPS.map((s, i) => {
                    const state = i < step ? 'done' : i === step ? 'current' : '';
                    const canJump = i <= furthestStep && i !== step;
                    return (
                        <li key={s.label} className={state} aria-current={i === step ? 'step' : undefined}>
                            <button type="button" disabled={!canJump} onClick={() => canJump && goToStep(i)}>
                                <span className="ns-step-dot">{i < step ? <Check size={14} /> : i + 1}</span>
                                <span className="ns-step-text">
                                    <strong>{s.label}</strong>
                                    <small>{s.hint}</small>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <div className="ns-layout">
                <div className="ns-main">
                    <form noValidate onSubmit={e => e.preventDefault()}>
                        {step === 0 && renderLocationStep('pickup')}
                        {step === 1 && renderLocationStep('destination')}

                        {step === 2 && (
                            <div className="fade-in">
                                <div className="ns-card">
                                    <div className="ns-card-head">
                                        <span className="ns-card-icon"><Package size={18} /></span>
                                        <div>
                                            <h2>What are you sending?</h2>
                                            <p>{fields.length} {fields.length === 1 ? 'item' : 'items'} · {totalWeight.toFixed(1)} kg total</p>
                                        </div>
                                    </div>

                                    <div className="ns-items">
                                        {fields.map((field, idx) => {
                                            const isExpanded = expandedItemIdx === idx;
                                            const v = items[idx] || {};
                                            const category = categories.find(c => c.id === v.category_id);
                                            const ie = itemErrors(idx);
                                            const hasError = Object.keys(ie).length > 0;
                                            return (
                                                <div key={field.id} className={`ns-item${isExpanded ? ' open' : ''}${hasError ? ' has-error' : ''}`}>
                                                    <div className="ns-item-head">
                                                        <button type="button" className="ns-item-toggle" onClick={() => setExpandedItemIdx(isExpanded ? -1 : idx)} aria-expanded={isExpanded}>
                                                            <span className="ns-item-num">{idx + 1}</span>
                                                            <span className="ns-item-title">
                                                                <strong>{v.description || `Item ${idx + 1}`}</strong>
                                                                <small>
                                                                    {category ? category.name : 'No category yet'} · {Number(v.weight_kg) || 0} kg × {Number(v.quantity) || 1}
                                                                    {v.is_fragile && ' · Fragile'}{v.is_hazardous && ' · Hazardous'}{v.requires_refrigeration && ' · Cold chain'}
                                                                </small>
                                                            </span>
                                                            <ChevronDown size={18} className="ns-item-chevron" />
                                                        </button>
                                                        {fields.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="ns-icon-btn danger"
                                                                aria-label={`Remove item ${idx + 1}`}
                                                                onClick={() => { remove(idx); if (expandedItemIdx >= idx) setExpandedItemIdx(Math.max(0, expandedItemIdx - 1)); }}
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="ns-item-body fade-in">
                                                            <div className="ns-grid">
                                                                <div>
                                                                    <label className="label" htmlFor={`item-${idx}-cat`}>Category *</label>
                                                                    <select id={`item-${idx}-cat`} {...register(`items.${idx}.category_id`, { onChange: e => applyCategoryDefaults(idx, e.target.value) })} className={`input${ie.category_id ? ' error' : ''}`}>
                                                                        <option value="">Select category…</option>
                                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                    </select>
                                                                    {ie.category_id && <p className="field-error">{ie.category_id.message}</p>}
                                                                    {(() => {
                                                                        const cat = categories.find(c => c.id === v.category_id);
                                                                        if (!cat) return null;
                                                                        const bits = [
                                                                            cat.max_weight_kg ? `up to ${Number(cat.max_weight_kg)} kg per piece` : null,
                                                                            cat.allowed_modes?.length ? `${cat.allowed_modes.map(m => MODE_META[m]?.label || m).join(' or ')} only` : null,
                                                                            cat.requires_declared_value ? 'declared value required' : null,
                                                                        ].filter(Boolean);
                                                                        return bits.length ? <p className="ns-hint">{bits.join(' · ')}</p> : null;
                                                                    })()}
                                                                </div>
                                                                <div>
                                                                    <label className="label" htmlFor={`item-${idx}-desc`}>Description *</label>
                                                                    <input id={`item-${idx}-desc`} {...register(`items.${idx}.description`)} className={`input${ie.description ? ' error' : ''}`} placeholder="e.g. Laptop, medical supplies" />
                                                                    {ie.description && <p className="field-error">{ie.description.message}</p>}
                                                                </div>
                                                                <div>
                                                                    <label className="label" htmlFor={`item-${idx}-weight`}>Weight per piece (kg) *</label>
                                                                    <input id={`item-${idx}-weight`} {...register(`items.${idx}.weight_kg`)} type="number" step="0.1" min="0" inputMode="decimal" className={`input${ie.weight_kg ? ' error' : ''}`} />
                                                                    {ie.weight_kg && <p className="field-error">{ie.weight_kg.message}</p>}
                                                                </div>
                                                                <div>
                                                                    <label className="label" htmlFor={`item-${idx}-qty`}>Quantity</label>
                                                                    <input id={`item-${idx}-qty`} {...register(`items.${idx}.quantity`)} type="number" min="1" inputMode="numeric" className="input" />
                                                                </div>
                                                                <div className="span-2">
                                                                    <label className="label">Dimensions per piece (cm) <span className="ns-optional">optional</span></label>
                                                                    <div className="ns-dims">
                                                                        <input {...register(`items.${idx}.length_cm`)} type="number" min="0" inputMode="decimal" className="input" placeholder="Length" aria-label="Length in cm" />
                                                                        <span>×</span>
                                                                        <input {...register(`items.${idx}.width_cm`)} type="number" min="0" inputMode="decimal" className="input" placeholder="Width" aria-label="Width in cm" />
                                                                        <span>×</span>
                                                                        <input {...register(`items.${idx}.height_cm`)} type="number" min="0" inputMode="decimal" className="input" placeholder="Height" aria-label="Height in cm" />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="label" htmlFor={`item-${idx}-value`}>Declared value (USD) {categories.find(c => c.id === v.category_id)?.requires_declared_value ? '*' : <span className="ns-optional">optional</span>}</label>
                                                                    <input id={`item-${idx}-value`} {...register(`items.${idx}.declared_value`)} type="number" min="0" inputMode="decimal" className="input" placeholder="0.00" />
                                                                </div>
                                                                <div>
                                                                    <span className="label">Handling</span>
                                                                    <div className="ns-flags">
                                                                        <label className={v.is_fragile ? 'on' : ''}><input type="checkbox" {...register(`items.${idx}.is_fragile`)} /><Info size={14} /> Fragile</label>
                                                                        <label className={v.is_hazardous ? 'on' : ''}><input type="checkbox" {...register(`items.${idx}.is_hazardous`)} /><AlertTriangle size={14} /> Hazardous</label>
                                                                        <label className={v.requires_refrigeration ? 'on' : ''}><input type="checkbox" {...register(`items.${idx}.requires_refrigeration`)} /><Snowflake size={14} /> Cold chain</label>
                                                                    </div>
                                                                </div>
                                                                <div className="span-2">
                                                                    <label className="label" htmlFor={`item-${idx}-notes`}>Special instructions <span className="ns-optional">optional</span></label>
                                                                    <input id={`item-${idx}-notes`} {...register(`items.${idx}.special_instructions`)} className="input" placeholder="e.g. Keep upright" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button type="button" className="ns-add-item" onClick={() => { append({ ...EMPTY_ITEM }); setExpandedItemIdx(fields.length); }}>
                                        <Plus size={16} /> Add another item
                                    </button>
                                </div>

                                <div className="ns-card">
                                    <div className="ns-card-head">
                                        <span className="ns-card-icon"><ModeIcon size={18} /></span>
                                        <div>
                                            <h2>How should we ship it?</h2>
                                            <p>{transportModes.length > 1 ? 'Choose a transport mode for this route.' : 'Available transport for this route.'}</p>
                                        </div>
                                    </div>
                                    {routeUnpriced && (
                                        <div className="ns-contact">
                                            <AlertTriangle size={18} />
                                            <div>
                                                <strong>No set price for this route yet</strong>
                                                <p>We still ship here — send us the details and our team will reply with a quote, usually within one business day.</p>
                                            </div>
                                            <button type="button" className="btn btn-primary btn-sm" onClick={openQuoteRequest}>Request a quote</button>
                                        </div>
                                    )}
                                    <div className="ns-modes">
                                        {transportModes.map(m => {
                                            const meta = MODE_META[m];
                                            const Icon = meta.icon;
                                            return (
                                                <label key={m} className={watchedValues.transport_mode === m ? 'active' : ''}>
                                                    <input type="radio" {...register('transport_mode')} value={m} />
                                                    <span className="ns-mode-icon"><Icon size={22} /></span>
                                                    <strong>{meta.label}</strong>
                                                    <small>{meta.blurb}</small>
                                                    {watchedValues.transport_mode === m && <span className="ns-mode-check"><Check size={13} /></span>}
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div style={{ marginTop: '1.25rem' }}>
                                        <label className="label" htmlFor="ns-notes">Notes for our team <span className="ns-optional">optional</span></label>
                                        <textarea id="ns-notes" {...register('notes')} className="input" rows={3} placeholder="Pickup times, gate codes, customs documents…" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="fade-in">
                                <div className="ns-card">
                                    <div className="ns-review-head">
                                        <h2>Route</h2>
                                        <button type="button" onClick={() => goToStep(0)}><Pencil size={13} /> Edit</button>
                                    </div>
                                    <div className="ns-route">
                                        <div>
                                            <span className="ns-route-label"><MapPin size={13} /> Pickup</span>
                                            <strong>{originName}</strong>
                                            <span>{findLocName(watchedValues.origin_country_id)}</span>
                                            <p>{watchedValues.pickup_address}</p>
                                            {(watchedValues.pickup_contact_name || watchedValues.pickup_contact_phone) && (
                                                <p className="ns-route-contact">{[watchedValues.pickup_contact_name, watchedValues.pickup_contact_phone].filter(Boolean).join(' · ')}</p>
                                            )}
                                        </div>
                                        <div className="ns-route-arrow"><ModeIcon size={18} /></div>
                                        <div>
                                            <span className="ns-route-label"><Flag size={13} /> Delivery</span>
                                            <strong>{destName}</strong>
                                            <span>{findLocName(watchedValues.destination_country_id)}</span>
                                            <p>{watchedValues.destination_address}</p>
                                            {(watchedValues.destination_contact_name || watchedValues.destination_contact_phone) && (
                                                <p className="ns-route-contact">{[watchedValues.destination_contact_name, watchedValues.destination_contact_phone].filter(Boolean).join(' · ')}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="ns-card">
                                    <div className="ns-review-head">
                                        <h2>Package · {MODE_META[watchedValues.transport_mode]?.label}</h2>
                                        <button type="button" onClick={() => goToStep(2)}><Pencil size={13} /> Edit</button>
                                    </div>
                                    <div className="ns-review-items">
                                        {items.map((item, i) => {
                                            const line = shownQuote?.item_breakdown?.[i];
                                            return (
                                                <div key={i}>
                                                    <span className="ns-item-num">{Number(item.quantity) || 1}×</span>
                                                    <span style={{ flex: 1, minWidth: 0 }}>
                                                        <strong>{item.description}</strong>
                                                        <small>
                                                            {categories.find(c => c.id === item.category_id)?.name} · {item.weight_kg} kg each
                                                            {item.is_fragile && ' · Fragile'}{item.is_hazardous && ' · Hazardous'}{item.requires_refrigeration && ' · Cold chain'}
                                                        </small>
                                                    </span>
                                                    {line && <span className="ns-review-price">{money(line.price)}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {watchedValues.notes && <p className="ns-review-notes"><strong>Notes:</strong> {watchedValues.notes}</p>}
                                </div>

                                <div className="ns-total">
                                    {quoteLoading && !shownQuote ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><div className="spinner" /></div>
                                    ) : shownQuote ? (
                                        <>
                                            {shownQuote.breakdown && shownQuote.breakdown.length > 0 && (
                                                <ul className="ns-breakdown">
                                                    {shownQuote.breakdown.map(l => (
                                                        <li key={l.key}><span>{l.label}{l.detail && <small> · {l.detail}</small>}</span><span>{money(l.amount)}</span></li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="ns-total-row">
                                                <span>Total to pay</span>
                                                <strong>{money(shownQuote.total_price)}</strong>
                                            </div>
                                            <p className="ns-total-meta">
                                                <Calendar size={14} /> Estimated delivery {shownQuote.estimated_days ? `in about ${shownQuote.estimated_days} days` : ''}
                                                {shownQuote.estimated_delivery && ` · ${new Date(shownQuote.estimated_delivery).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}`}
                                            </p>
                                        </>
                                    ) : shownProblem ? (
                                        <div className="ns-contact">
                                            <AlertTriangle size={18} />
                                            <div>
                                                <strong>{shownProblem.contact ? 'Let us quote this one' : 'Check your items'}</strong>
                                                <p>{shownProblem.message}</p>
                                            </div>
                                            {shownProblem.contact && <button type="button" className="btn btn-primary btn-sm" onClick={openQuoteRequest}>Request a quote</button>}
                                        </div>
                                    ) : (
                                        <p className="ns-total-meta"><AlertTriangle size={14} /> Add your route and items to see a price.</p>
                                    )}
                                </div>

                                <p className="ns-help">
                                    <Info size={15} /> Questions about this quote or special requirements? <Link href="/dashboard/support">Contact customer care</Link> before confirming.
                                </p>
                            </div>
                        )}
                    </form>

                    {/* Actions — inside the content column so they never cover the sidebar or tab bar */}
                    <div className="ns-actions">
                        <button type="button" onClick={() => goToStep(step - 1)} disabled={step === 0 || isSubmitting} className="btn btn-secondary ns-back" style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
                            <ArrowLeft size={16} /> <span>Back</span>
                        </button>
                        <div className="ns-actions-estimate">
                            <span>Estimate</span>
                            <strong>{quoteLoading ? '…' : shownQuote ? money(shownQuote.total_price) : shownProblem?.contact ? 'On request' : '—'}</strong>
                        </div>
                        {step < 3 ? (
                            <button type="button" onClick={goNext} className="btn btn-primary ns-next">
                                Continue <ArrowRight size={16} />
                            </button>
                        ) : (
                            <div className="ns-final">
                                <button type="button" disabled={draftLoading || isSubmitting} onClick={() => onSubmit(getValues() as any, 'draft')} className="btn btn-secondary">
                                    {draftLoading ? <div className="spinner" /> : 'Save draft'}
                                </button>
                                <button type="button" disabled={isSubmitting || draftLoading || !shownQuote} onClick={() => handleSubmit(data => onSubmit(data, 'pending'))()} className="btn btn-primary">
                                    {isSubmitting ? <div className="spinner" /> : <>Confirm &amp; book <Check size={16} /></>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Live summary */}
                <aside className="ns-summary">
                    <div className="ns-summary-card">
                        <h3>Shipment summary</h3>
                        <div className="ns-summary-route">
                            <div className={originName ? '' : 'empty'}>
                                <span><MapPin size={13} /> From</span>
                                <strong>{originName || 'Choose pickup'}</strong>
                            </div>
                            <div className={destName ? '' : 'empty'}>
                                <span><Flag size={13} /> To</span>
                                <strong>{destName || 'Choose delivery'}</strong>
                            </div>
                        </div>
                        <dl>
                            <dt><ModeIcon size={14} /> Transport</dt><dd>{MODE_META[watchedValues.transport_mode]?.label || '—'}</dd>
                            <dt><Package size={14} /> Pieces</dt><dd>{totalPieces}</dd>
                            <dt><Weight size={14} /> Total weight</dt><dd>{totalWeight.toFixed(1)} kg</dd>
                            {shownQuote?.estimated_days ? <><dt><Calendar size={14} /> Transit</dt><dd>~{shownQuote.estimated_days} days</dd></> : null}
                        </dl>
                        <div className="ns-summary-price">
                            <span>Estimated price</span>
                            {quoteLoading ? <div className="spinner" /> : shownQuote ? <strong>{money(shownQuote.total_price)}</strong>
                                : shownProblem ? <small className="ns-summary-problem">{shownProblem.contact ? <>No set price — <button type="button" className="ns-link-btn" onClick={openQuoteRequest}>request a quote</button></> : shownProblem.message}</small>
                                    : <small>Add your route and items to see a price</small>}
                        </div>
                    </div>
                    <p className="ns-summary-note">
                        <Info size={14} /> Prices are confirmed by our team when your pickup is scheduled.
                    </p>
                </aside>
            </div>

            <QuoteRequestModal open={!!quoteRequest} onClose={() => setQuoteRequest(null)} prefill={quoteRequest || undefined} />
        </div>
    );
}

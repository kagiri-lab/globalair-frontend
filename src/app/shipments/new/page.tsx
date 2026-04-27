'use client';

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, UseFormRegister, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowRight, Check, MapPin, Package, Plus, ChevronLeft, ChevronRight, ChevronDown, BookHeart, X, ArrowLeft, Trash2, AlertTriangle, Snowflake, Globe } from 'lucide-react';
import api from '@/lib/api';
import { ProductCategory, QuoteResult, ShipmentType } from '@/lib/types';
import GoogleAddressPicker from '@/components/GoogleAddressPicker';

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


// ── Searchable Select Component ──────────────────────────────────────────────
function SearchableSelect({ label, options, value, onChange, placeholder, disabled, error }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((o: any) => o.id === value);
    const filtered = options.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 1000 : 1 }}>
            <label className="label">{label}</label>
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    padding: '0.75rem 1rem', background: 'var(--bg-card)', border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
                    borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s'
                }}
            >
                <span style={{ fontSize: '0.9rem', color: selectedOption ? 'var(--text)' : 'var(--text-muted)' }}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
                <div style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99999, 
                    marginTop: '0.5rem', background: '#ffffff', border: '1px solid var(--border)', 
                    borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', overflow: 'hidden' 
                }}>
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', background: '#ffffff' }}>
                        <input 
                            autoFocus className="input" placeholder="Type to search..." value={search} 
                            onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()}
                            style={{ height: '36px', fontSize: '0.85rem', background: 'var(--bg-secondary)' }}
                        />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto', background: '#ffffff' }}>
                        {filtered.length > 0 ? filtered.map((o: any) => (
                            <div 
                                key={o.id} onClick={(e) => { e.stopPropagation(); onChange(o.id); setIsOpen(false); setSearch(''); }}
                                style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem', transition: 'background 0.2s', color: 'var(--text-primary)' }}
                                className="table-row-hover"
                            >
                                {o.name}
                            </div>
                        )) : <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No results found</div>}
                    </div>
                </div>
            )}
            {error && <p className="field-error">{error}</p>}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = ['Origin', 'Destination', 'Details', 'Review', 'Done'];

const STEP_FIELDS: (keyof FormData)[][] = [
    ['origin_country_id', 'origin_id', 'pickup_address'],
    ['destination_country_id', 'destination_id', 'destination_address'],
    ['items'],
    [],
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
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [hierarchy, setHierarchy] = useState<any>(null);
    const [quote, setQuote] = useState<QuoteResult | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [draftLoading, setDraftLoading] = useState(false);
    const [isDraftSuccess, setIsDraftSuccess] = useState(false);
    const [expandedItemIdx, setExpandedItemIdx] = useState(0);
    const [googleMapsEnabled, setGoogleMapsEnabled] = useState(false);

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
            items: [{ category_id: '', description: '', weight_kg: 0.5, quantity: 1, is_fragile: false, is_hazardous: false, requires_refrigeration: false }],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const watchedValues = watch();

    useEffect(() => {
        // Load static data once
        const loadInitialData = async () => {
            try {
                const [cats, locs, addrs, settingsRes] = await Promise.all([
                    api.get('/categories'),
                    api.get('/locations/hierarchy'),
                    api.get('/addresses'),
                    api.get('/public/settings')
                ]);
                setCategories(cats.data.data.categories);
                setHierarchy(locs.data.data);
                setSavedAddresses(addrs.data.data.addresses);
                setGoogleMapsEnabled(settingsRes.data.data.settings.google_maps_enabled === 'true');

                // Load draft if needed
                if (draftId) {
                    const res = await api.get(`/shipments/${draftId}`);
                    const s = res.data.data.shipment;
                    if (s.status === 'draft') {
                        // Find country IDs from town IDs in hierarchy
                        let origin_country_id = '';
                        let destination_country_id = '';
                        
                        const h = locs.data.data;
                        if (h) {
                            // Find Origin
                            for (const country of h.origins) {
                                if (s.origin_id && country.cities.some((c: any) => c.id === s.origin_id)) {
                                    origin_country_id = country.id;
                                    break;
                                } else if (!s.origin_id && country.name === s.pickup_country) {
                                    origin_country_id = country.id;
                                    // Try to find city ID by name as well
                                    const city = country.cities.find((c: any) => c.name === s.pickup_city);
                                    if (city) s.origin_id = city.id;
                                    break;
                                }
                            }
                            // Find Destination
                            for (const country of h.destinations) {
                                if (s.destination_id && country.cities.some((c: any) => c.id === s.destination_id)) {
                                    destination_country_id = country.id;
                                    break;
                                } else if (!s.destination_id && country.name === s.destination_country) {
                                    destination_country_id = country.id;
                                    // Try to find city ID by name as well
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
                            }))
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to load initial data", err);
            }
        };

        loadInitialData();
    }, [draftId, reset]); // Removed hierarchy to prevent loop

    // Helper to find name by ID
    const findLocName = (id: string) => {
        if (!hierarchy) return id;
        
        // Search in Origins
        for (const country of hierarchy.origins) {
            if (country.id === id) return country.name;
            const city = country.cities.find((c: any) => c.id === id);
            if (city) return city.name;
        }
        
        // Search in Destinations
        for (const country of hierarchy.destinations) {
            if (country.id === id) return country.name;
            const city = country.cities.find((c: any) => c.id === id);
            if (city) return city.name;
        }
        return id;
    };

    const transportModes = useMemo(() => {
        const destCountry = hierarchy?.destinations.find((d: any) => d.id === watchedValues.destination_country_id);
        const destCity = destCountry?.cities.find((c: any) => c.id === watchedValues.destination_id);
        
        const modes = [];
        // Use the new aggregated 'modes' property from the backend
        if (!destCity || destCity.modes?.air > 0) modes.push({ value: 'air', label: 'Air', badge: '✈️' });
        if (destCity && destCity.modes?.sea > 0) modes.push({ value: 'sea', label: 'Sea', badge: '🚢' });
        if (destCity && destCity.modes?.road > 0) modes.push({ value: 'road', label: 'Road', badge: '🚛' });
        return modes;
    }, [hierarchy, watchedValues.destination_country_id, watchedValues.destination_id]);

    useEffect(() => {
        if (transportModes.length > 0 && !transportModes.some(m => m.value === watchedValues.transport_mode)) {
            setValue('transport_mode', transportModes[0].value as any);
        }
    }, [transportModes, watchedValues.transport_mode, setValue]);

    const fetchQuote = useCallback(async () => {
        const { origin_id, destination_id, transport_mode, items } = watchedValues;
        if (!origin_id || !destination_id || !items?.length) return;
        setQuoteLoading(true);
        try {
            const res = await api.post('/shipments/quote', {
                origin_id,
                destination_id,
                transport_mode,
                items: items.filter((i: any) => i.category_id && i.weight_kg).map((i: any) => ({
                    category_id: i.category_id,
                    weight_kg: i.weight_kg,
                    quantity: i.quantity || 1,
                })),
            });
            setQuote(res.data.data);
        } catch { /* quote failure is non-fatal */ }
        finally { setQuoteLoading(false); }
    }, [watchedValues.origin_id, watchedValues.destination_id, watchedValues.transport_mode, JSON.stringify(watchedValues.items)]);

    const goNext = async () => {
        const valid = await trigger(STEP_FIELDS[step] as any);
        if (!valid) return;
        if (step === 2) fetchQuote(); // Now fetch after Details (Step 2)
        setStep(s => s + 1);
    };

    const onSubmit = async (data: FormData, status = 'pending') => {
        if (status === 'draft') setDraftLoading(true);
        try {
            // Find Names for storage/display
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
                setStep(4); // Use Step 5 (Done) logic
                toast.success('Saved as draft! 📥');
            } else {
                setTrackingNumber(res.data.data.shipment.tracking_number);
                setStep(4);
                toast.success(draftId ? 'Shipment finalized! 🎉' : 'Shipment created! 🎉');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to process shipment');
        } finally {
            setDraftLoading(false);
        }
    };

    const StepIndicator = () => (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            {STEPS.map((label: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'unset' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.78rem', fontWeight: 800, flexShrink: 0,
                            background: i < step ? '#10b981' : i === step ? 'var(--accent)' : 'var(--bg-card)',
                            border: i < step || i === step ? 'none' : '2px solid var(--border)',
                            color: i < step || i === step ? '#fff' : 'var(--text-muted)',
                            transition: 'all 0.3s',
                        }}>
                            {i < step ? <Check size={14} /> : i + 1}
                        </div>
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, marginTop: '0.3rem', color: i === step ? 'var(--accent)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div style={{ flex: 1, height: 2, marginBottom: '1rem', marginInline: '0.3rem', background: i < step ? '#10b981' : 'var(--border)', transition: 'background 0.3s' }} />
                    )}
                </div>
            ))}
        </div>
    );

    if (step === 4) {
        return (
            <div style={{ padding: '2rem', maxWidth: 560, margin: '0 auto' }}>
                <StepIndicator />
                <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <div style={{ width: 76, height: 76, borderRadius: '50%', background: isDraftSuccess ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        {isDraftSuccess ? <BookHeart size={36} color="var(--accent)" /> : <Check size={36} color="#10b981" />}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                        {isDraftSuccess ? 'Draft Saved Successfully!' : 'Shipment Created!'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                        {isDraftSuccess 
                            ? 'Your shipment has been saved as a draft. You can complete it anytime from your shipments list.'
                            : 'Track your shipment with the number below.'}
                    </p>
                    
                    {!isDraftSuccess && (
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '1.25rem 2rem', marginBottom: '2rem', display: 'inline-block', border: '1px solid var(--border-light)' }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Tracking Number</p>
                            <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>{trackingNumber}</p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center' }}>
                        <button onClick={() => router.push('/shipments')} className="btn btn-secondary">
                            View Shipments
                        </button>
                        <button onClick={() => { setStep(0); setTrackingNumber(''); setQuote(null); setIsDraftSuccess(false); }} className="btn btn-primary">
                            New Shipment
                        </button>
                    </div>

                    <button onClick={() => router.push('/dashboard')} className="btn btn-sm" style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>
                        Go to Dashboard
                    </button>
                </div>
            </div>
                        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: 720, margin: '0 auto', overflow: 'visible', minHeight: '600px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>New Shipment</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Step {step + 1} of 4 — {STEPS[step]}</p>
            </div>

            <StepIndicator />

            <form noValidate style={{ overflow: 'visible', paddingBottom: '100px' }}>
                {step === 0 && (
                    <div className="fade-in">
                        <div className="card">
                            <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={18} /> Step 1: Pickup Origin</h3>
                            
                            {savedAddresses.length > 0 && (
                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookHeart size={14} color="var(--accent)" /> Saved Addresses</label>
                                    <select 
                                        className="input" style={{ fontSize: '0.85rem' }}
                                        onChange={(e) => {
                                            const addr = savedAddresses.find(a => a.id === e.target.value);
                                            if (addr) {
                                                setValue('pickup_address', addr.address);
                                                setValue('pickup_contact_name', addr.contact_name || '');
                                                setValue('pickup_contact_phone', addr.contact_phone || '');
                                            }
                                        }}
                                    >
                                        <option value="">Select a saved address...</option>
                                        {savedAddresses.map(a => <option key={a.id} value={a.id}>{a.label} ({a.address.substring(0, 20)}...)</option>)}
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <SearchableSelect 
                                        label="Origin Country *" placeholder="Search country..."
                                        options={hierarchy?.origins || []}
                                        value={watchedValues.origin_country_id}
                                        onChange={(val: string) => { setValue('origin_country_id', val); setValue('origin_id', ''); }}
                                        error={errors.origin_country_id?.message}
                                    />
                                    <SearchableSelect 
                                        label="Origin Town / City *" placeholder="Select town..."
                                        options={hierarchy?.origins.find((c: any) => c.id === watchedValues.origin_country_id)?.cities || []}
                                        value={watchedValues.origin_id}
                                        onChange={(val: string) => setValue('origin_id', val)}
                                        disabled={!watchedValues.origin_country_id}
                                        error={errors.origin_id?.message}
                                    />
                                </div>

                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                    <GoogleAddressPicker 
                                        label="Street Address / Details *"
                                        placeholder="Enter pickup address..."
                                        defaultValue={watchedValues.pickup_address}
                                        countryCode={hierarchy?.origins.find((c: any) => c.id === watchedValues.origin_country_id)?.country_code}
                                        onAddressSelect={(address, lat, lng) => {
                                            setValue('pickup_address', address);
                                            setValue('pickup_latitude', lat);
                                            setValue('pickup_longitude', lng);
                                        }}
                                        error={errors.pickup_address?.message as string}
                                        disabled={!googleMapsEnabled}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label className="label">Contact Name</label>
                                        <input {...register('pickup_contact_name')} className="input" placeholder="Person in charge" />
                                    </div>
                                    <div>
                                        <label className="label">Contact Phone</label>
                                        <input {...register('pickup_contact_phone')} className="input" placeholder="+..." />
                                    </div>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0' }}>
                                    <input type="checkbox" {...register('save_pickup_address')} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Save to address book</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="fade-in">
                        <div className="card">
                            <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={18} color="var(--accent)" /> Step 2: Destination</h3>
                            
                            {savedAddresses.length > 0 && (
                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookHeart size={14} color="var(--accent)" /> Saved Addresses</label>
                                    <select 
                                        className="input" style={{ fontSize: '0.85rem' }}
                                        onChange={(e) => {
                                            const addr = savedAddresses.find(a => a.id === e.target.value);
                                            if (addr) {
                                                setValue('destination_address', addr.address);
                                                setValue('destination_contact_name', addr.contact_name || '');
                                                setValue('destination_contact_phone', addr.contact_phone || '');
                                            }
                                        }}
                                    >
                                        <option value="">Select a saved address...</option>
                                        {savedAddresses.map(a => <option key={a.id} value={a.id}>{a.label} ({a.address.substring(0, 20)}...)</option>)}
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <SearchableSelect 
                                        label="Destination Country *" placeholder="Search country..."
                                        options={hierarchy?.destinations || []}
                                        value={watchedValues.destination_country_id}
                                        onChange={(val: string) => { setValue('destination_country_id', val); setValue('destination_id', ''); }}
                                        error={errors.destination_country_id?.message}
                                    />
                                    <SearchableSelect 
                                        label="Destination Town / City *" placeholder="Select town..."
                                        options={hierarchy?.destinations.find((c: any) => c.id === watchedValues.destination_country_id)?.cities || []}
                                        value={watchedValues.destination_id}
                                        onChange={(val: string) => setValue('destination_id', val)}
                                        disabled={!watchedValues.destination_country_id}
                                        error={errors.destination_id?.message}
                                    />
                                </div>

                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                    <GoogleAddressPicker 
                                        label="Delivery Street Address *"
                                        placeholder="Enter delivery address..."
                                        defaultValue={watchedValues.destination_address}
                                        countryCode={hierarchy?.destinations.find((c: any) => c.id === watchedValues.destination_country_id)?.country_code}
                                        onAddressSelect={(address, lat, lng) => {
                                            setValue('destination_address', address);
                                            setValue('destination_latitude', lat);
                                            setValue('destination_longitude', lng);
                                        }}
                                        error={errors.destination_address?.message as string}
                                        disabled={!googleMapsEnabled}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label className="label">Recipient Name</label>
                                        <input {...register('destination_contact_name')} className="input" placeholder="Person receiving" />
                                    </div>
                                    <div>
                                        <label className="label">Recipient Phone</label>
                                        <input {...register('destination_contact_phone')} className="input" placeholder="+..." />
                                    </div>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0' }}>
                                    <input type="checkbox" {...register('save_destination_address')} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Save to address book</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="fade-in">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Package Items</p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fields.length} {fields.length === 1 ? 'item' : 'items'} added</span>
                            </div>

                            {fields.map((field, idx) => {
                                const isExpanded = (expandedItemIdx === idx);
                                const itemValues = watchedValues.items?.[idx] || {};
                                const category = categories.find(c => c.id === itemValues.category_id);
                                
                                return (
                                    <div key={field.id} className={`card ${isExpanded ? 'expanded' : 'collapsed'}`} style={{ 
                                        marginBottom: '0.75rem', 
                                        padding: isExpanded ? '1.5rem' : '1rem 1.25rem',
                                        cursor: isExpanded ? 'default' : 'pointer',
                                        border: isExpanded ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        transition: 'all 0.2s ease-in-out'
                                    }} onClick={() => !isExpanded && setExpandedItemIdx(idx)}>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: isExpanded ? 'var(--accent)' : 'var(--bg-secondary)', color: isExpanded ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                                                    {idx + 1}
                                                </div>
                                                {!isExpanded && (
                                                    <div>
                                                        <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                            {itemValues.description || `Item ${idx + 1}`}
                                                        </p>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {category ? `${category.icon} ${category.name}` : 'No category'} · {itemValues.weight_kg}kg · Qty: {itemValues.quantity}
                                                        </p>
                                                    </div>
                                                )}
                                                {isExpanded && <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Item {idx + 1} Details</span>}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {!isExpanded && <ChevronDown size={16} color="var(--text-muted)" />}
                                                {fields.length > 1 && (
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); remove(idx); if (expandedItemIdx >= idx) setExpandedItemIdx(Math.max(0, expandedItemIdx - 1)); }} className="btn btn-danger btn-sm" style={{ padding: '0.4rem', borderRadius: 8 }}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="fade-in" style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <label className="label">Category *</label>
                                                    <select {...register(`items.${idx}.category_id`)} className="input">
                                                        <option value="">Select category…</option>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ gridColumn: 'span 2' }}>
                                                    <label className="label">Description *</label>
                                                    <input {...register(`items.${idx}.description`)} className="input" placeholder="e.g. iPhone 15 Pro" />
                                                </div>
                                                <div>
                                                    <label className="label">Weight (kg) *</label>
                                                    <input {...register(`items.${idx}.weight_kg`)} type="number" step="0.1" className="input" />
                                                </div>
                                                <div>
                                                    <label className="label">Quantity</label>
                                                    <input {...register(`items.${idx}.quantity`)} type="number" min="1" className="input" />
                                                </div>
                                                <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedItemIdx(-1); }} className="btn btn-secondary btn-sm btn-full">
                                                        Done Editing
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            <button type="button" onClick={() => { append({ category_id: '', description: '', weight_kg: 1, quantity: 1 }); setExpandedItemIdx(fields.length); }} className="btn btn-secondary btn-full" style={{ borderStyle: 'dashed', background: 'transparent' }}>
                                <Plus size={16} /> Add Another Item
                            </button>
                        </div>

                        <div className="card" style={{ marginBottom: '1.25rem' }}>
                            <p style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>Transport Mode</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                {transportModes.map(t => (
                                    <label key={t.value} style={{ cursor: 'pointer' }}>
                                        <input type="radio" {...register('transport_mode')} value={t.value} style={{ display: 'none' }} />
                                        <div style={{ border: `2px solid ${watchedValues.transport_mode === t.value ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '0.875rem', textAlign: 'center', background: watchedValues.transport_mode === t.value ? 'rgba(59,130,246,0.05)' : 'transparent', transition: 'all 0.2s' }}>
                                            <div style={{ fontSize: '1.2rem' }}>{t.badge}</div>
                                            <p style={{ fontWeight: 700, fontSize: '0.75rem' }}>{t.label}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="fade-in">
                        <div className="card" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Step 4: Final Review</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 14 }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Origin</p>
                                    <p style={{ fontWeight: 800, fontSize: '1rem' }}>{findLocName(watchedValues.origin_id)}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{findLocName(watchedValues.origin_country_id)}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                        {watchedValues.pickup_address}
                                    </p>
                                </div>
                                <ArrowRight size={20} color="var(--accent)" />
                                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 14 }}>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Destination</p>
                                    <p style={{ fontWeight: 800, fontSize: '1rem' }}>{findLocName(watchedValues.destination_id)}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{findLocName(watchedValues.destination_country_id)}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                        {watchedValues.destination_address}
                                    </p>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Package Contents ({watchedValues.items.length} items)</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {watchedValues.items.map((item: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 10, fontSize: '0.85rem' }}>
                                            <div>
                                                <span style={{ fontWeight: 700 }}>{item.quantity}x</span> {item.description}
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                                    {categories.find(c => c.id === item.category_id)?.name} · {item.weight_kg}kg
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                {item.is_fragile && <span style={{ fontSize: '0.7rem' }}>🔮</span>}
                                                {item.is_hazardous && <span style={{ fontSize: '0.7rem' }}>⚠️</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {quoteLoading ? (
                                <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <div className="spinner" />
                                </div>
                            ) : quote && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ background: 'var(--accent)', color: 'white', padding: '1.5rem', borderRadius: 14, boxShadow: '0 8px 20px rgba(59,130,246,0.2)', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', opacity: 0.9, fontSize: '0.9rem' }}>
                                            <span>Shipping Subtotal</span>
                                            <span style={{ fontWeight: 600 }}>${quote.total_price}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.75rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total Cost</span>
                                            <span style={{ fontWeight: 900, fontSize: '1.5rem' }}>${quote.total_price}</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <AlertTriangle size={18} color="#f59e0b" />
                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#d97706' }}>Need assistance?</span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            If you have any questions about this quote or specific shipping requirements, please contact our <strong>Customer Care</strong> team before confirming.
                                        </p>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                )}
            </form>

            <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                padding: '1.25rem 2rem', background: 'rgba(255,255,255,0.9)', 
                backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'center', zIndex: 1000,
                boxShadow: '0 -4px 20px rgba(0,0,0,0.05)'
            }}>
                <div style={{ width: '100%', maxWidth: 720, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                        type="button" onClick={() => setStep(s => s - 1)} 
                        disabled={step === 0 || isSubmitting} 
                        className="btn btn-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step === 0 ? 0 : 1 }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {step < 3 ? (
                            <button 
                                type="button" onClick={goNext} 
                                className="btn btn-primary" 
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2.5rem' }}
                            >
                                Continue <ArrowRight size={16} />
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    type="button" disabled={draftLoading || isSubmitting} 
                                    onClick={() => {
                                        const currentData = getValues();
                                        onSubmit(currentData as any, 'draft');
                                    }}
                                    className="btn btn-secondary"
                                >
                                    {draftLoading ? <div className="spinner" /> : 'Save Draft'}
                                </button>
                                <button 
                                    type="button" disabled={isSubmitting || draftLoading || !quote} 
                                    onClick={() => handleSubmit((data) => onSubmit(data, 'pending'))()} 
                                    className="btn btn-primary" 
                                    style={{ padding: '0.75rem 2.5rem' }}
                                >
                                    {isSubmitting ? <div className="spinner" style={{ borderTopColor: 'white' }} /> : 'Confirm & Ship'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

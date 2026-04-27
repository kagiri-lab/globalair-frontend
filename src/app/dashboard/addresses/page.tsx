'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Phone, User as UserIcon, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Address {
    id: number;
    label: string;
    address: string;
    city: string;
    state?: string;
    country: string;
    postal_code?: string;
    contact_name?: string;
    contact_phone?: string;
}

const EMPTY_FORM = { label: '', address: '', city: '', state: '', country: '', postal_code: '', contact_name: '', contact_phone: '' };

export default function AddressBookPage() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const load = () => {
        setLoading(true);
        api.get('/shipments/addresses').then(r => setAddresses(r.data.data.addresses)).catch(() => { }).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/shipments/addresses', form);
            toast.success('Address saved');
            setForm(EMPTY_FORM);
            setShowForm(false);
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.errors?.[0]?.msg || 'Failed to save');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Remove this address?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/shipments/addresses/${id}`);
            toast.success('Address removed');
            setAddresses(a => a.filter(x => x.id !== id));
        } catch { toast.error('Failed to remove'); }
        finally { setDeletingId(null); }
    };

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.2rem' }}>Address Book</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Save and reuse your pickup and delivery addresses</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={16} /> Add Address
                </button>
            </div>

            {/* Add form modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                            <X size={18} />
                        </button>
                        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>New Address</h2>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gap: '0.875rem' }}>
                                <div>
                                    <label className="label">Label *</label>
                                    <input className="input" placeholder='e.g. Home, Office, Warehouse' value={form.label} onChange={e => set('label', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="label">Street Address *</label>
                                    <input className="input" placeholder="123 Moi Avenue" value={form.address} onChange={e => set('address', e.target.value)} required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="label">City *</label>
                                        <input className="input" placeholder="Nairobi" value={form.city} onChange={e => set('city', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="label">Country *</label>
                                        <input className="input" placeholder="Kenya" value={form.country} onChange={e => set('country', e.target.value)} required />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="label">State / Region</label>
                                        <input className="input" placeholder="Nairobi County" value={form.state} onChange={e => set('state', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label">Postal Code</label>
                                        <input className="input" placeholder="00100" value={form.postal_code} onChange={e => set('postal_code', e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="label">Contact Name</label>
                                        <input className="input" placeholder="John Otieno" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label">Contact Phone</label>
                                        <input className="input" placeholder="+254 700 000000" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                                        {saving ? <><div className="spinner" /> Saving…</> : 'Save Address'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
            ) : addresses.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <MapPin size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
                    <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>No saved addresses yet</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Save your frequent pickup and delivery addresses for faster shipment creation.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                        <Plus size={14} /> Add First Address
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                    {addresses.map(addr => (
                        <div key={addr.id} className="card" style={{ position: 'relative', padding: '1.25rem' }}>
                            <button onClick={() => handleDelete(addr.id)} disabled={deletingId === addr.id} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
                                {deletingId === addr.id ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Trash2 size={15} />}
                            </button>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.875rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <MapPin size={16} color="var(--accent)" />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{addr.label}</p>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{addr.address}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--text-muted)', paddingLeft: '2.75rem' }}>
                                <span>{addr.city}{addr.state ? `, ${addr.state}` : ''}, {addr.country}{addr.postal_code ? ` ${addr.postal_code}` : ''}</span>
                                {addr.contact_name && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <UserIcon size={12} /> {addr.contact_name}
                                        {addr.contact_phone && <><Phone size={12} style={{ marginLeft: 4 }} /> {addr.contact_phone}</>}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

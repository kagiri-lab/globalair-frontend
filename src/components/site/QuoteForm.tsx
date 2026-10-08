'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

const required = (label: string) => z.string().trim().min(1, `${label} is required`);

const schema = z.object({
    company: required('Company'),
    first_name: required('First name'),
    last_name: required('Last name'),
    phone: required('Phone'),
    email: z.string().trim().email('Invalid email address'),
    commodity: required('Commodity'),
    dimensions: z.string().trim().optional(),
    weight: required('Weight'),
    pickup_address: required('Street address'),
    pickup_city: required('City'),
    pickup_date: required('Pickup date'),
    pickup_region: required('Region'),
    dropoff_city: required('City'),
    delivery_date: required('Delivery date'),
    dropoff_region: required('Region'),
    message: z.string().trim().optional(),
    create_account: z.boolean().optional(),
    hp_ref: z.string().optional(), // spam trap: hidden from people, named so browsers don't autofill it
});
type FormData = z.infer<typeof schema>;

type FieldDef = { name: keyof FormData; label: string; type?: string; placeholder?: string; full?: boolean };

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
    {
        title: 'Your details',
        fields: [
            { name: 'company', label: 'Company *' },
            { name: 'email', label: 'Email *', type: 'email' },
            { name: 'first_name', label: 'First name *' },
            { name: 'last_name', label: 'Last name *' },
            { name: 'phone', label: 'Phone *', type: 'tel' },
        ],
    },
    {
        title: 'Product being shipped',
        fields: [
            { name: 'commodity', label: 'Commodity *', placeholder: 'e.g. Medical supplies' },
            { name: 'weight', label: 'Weight *', placeholder: 'e.g. 250 kg' },
            { name: 'dimensions', label: 'Dimensions', placeholder: 'L × W × H' },
        ],
    },
    {
        title: 'Pickup address',
        fields: [
            { name: 'pickup_address', label: 'Street address *', full: true },
            { name: 'pickup_city', label: 'City *' },
            { name: 'pickup_region', label: 'Region / Country *' },
            { name: 'pickup_date', label: 'Pickup date *', type: 'date' },
        ],
    },
    {
        title: 'Drop-off address',
        fields: [
            { name: 'dropoff_city', label: 'City *' },
            { name: 'dropoff_region', label: 'Region / Country *' },
            { name: 'delivery_date', label: 'Delivery date *', type: 'date' },
        ],
    },
];

export default function QuoteForm() {
    const { user } = useAuth(); // signed-in customers already have an account
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (d: FormData) => {
        try {
            await api.post('/public/enquiries', {
                type: 'quote',
                name: `${d.first_name} ${d.last_name}`,
                email: d.email,
                phone: d.phone,
                company: d.company,
                subject: `Quote request: ${d.commodity} (${d.pickup_city} → ${d.dropoff_city})`,
                message: d.message,
                hp_ref: d.hp_ref,
                create_account: !!d.create_account,
                details: {
                    commodity: d.commodity, dimensions: d.dimensions, weight: d.weight,
                    pickup_address: d.pickup_address, pickup_city: d.pickup_city, pickup_region: d.pickup_region, pickup_date: d.pickup_date,
                    dropoff_city: d.dropoff_city, dropoff_region: d.dropoff_region, delivery_date: d.delivery_date,
                },
            });
            toast.success('Quote request received! Our team will get back to you shortly.');
            reset();
        } catch (err: any) {
            toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Could not submit your request. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="site-honeypot" aria-hidden="true">
                <input tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore aria-label="Leave empty" {...register('hp_ref')} />
            </div>

            {SECTIONS.map(section => (
                <div key={section.title}>
                    <h3 className="site-form-section">{section.title}</h3>
                    <div className="site-form-grid">
                        {section.fields.map(f => (
                            <div key={f.name} className={f.full ? 'full' : ''}>
                                <label className="label" htmlFor={`q-${f.name}`}>{f.label}</label>
                                <input
                                    id={`q-${f.name}`}
                                    type={f.type || 'text'}
                                    placeholder={f.placeholder}
                                    className={`input${errors[f.name] ? ' error' : ''}`}
                                    {...register(f.name)}
                                />
                                {errors[f.name] && <p className="field-error">{errors[f.name]?.message}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <h3 className="site-form-section">Additional information</h3>
            <textarea className="input" placeholder="Anything else we should know? (optional)" {...register('message')} />

            {!user && (
                <label className="site-account-opt">
                    <input type="checkbox" {...register('create_account')} />
                    <span><b>Create an account for me</b> so I can get instant prices, book and track shipments online. We’ll email you a temporary password.</span>
                </label>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '1.5rem' }} disabled={isSubmitting}>
                {isSubmitting ? <div className="spinner" /> : <>Submit Quote Request <Send size={16} /></>}
            </button>
        </form>
    );
}

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

const schema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().email('Invalid email address'),
    subject: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    message: z.string().trim().min(5, 'Please enter a message'),
    create_account: z.boolean().optional(),
    hp_ref: z.string().optional(), // spam trap: hidden from people, named so browsers don't autofill it
});
type FormData = z.infer<typeof schema>;

// kind="quote" files it as a quote request (e.g. the home page's quick quote) so customer care can convert it into a shipment
export default function ContactForm({ defaultSubject = '', kind = 'contact' }: { defaultSubject?: string; kind?: 'contact' | 'quote' }) {
    const { user } = useAuth(); // signed-in customers already have an account
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { subject: defaultSubject },
    });

    const onSubmit = async (data: FormData) => {
        try {
            await api.post('/public/enquiries', { type: kind, ...data });
            toast.success('Thank you! A representative will contact you shortly.');
            reset({ subject: defaultSubject });
        } catch (err: any) {
            toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Could not send your message. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="site-honeypot" aria-hidden="true">
                <input tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore aria-label="Leave empty" {...register('hp_ref')} />
            </div>
            <div className="site-form-grid">
                <div>
                    <label className="label" htmlFor="c-name">Name *</label>
                    <input id="c-name" className={`input${errors.name ? ' error' : ''}`} placeholder="Enter name" {...register('name')} />
                    {errors.name && <p className="field-error">{errors.name.message}</p>}
                </div>
                <div>
                    <label className="label" htmlFor="c-email">Email address *</label>
                    <input id="c-email" type="email" className={`input${errors.email ? ' error' : ''}`} placeholder="you@company.com" {...register('email')} />
                    {errors.email && <p className="field-error">{errors.email.message}</p>}
                </div>
                <div>
                    <label className="label" htmlFor="c-subject">Subject</label>
                    <input id="c-subject" className="input" placeholder="Enter subject" {...register('subject')} />
                </div>
                <div>
                    <label className="label" htmlFor="c-phone">Phone number</label>
                    <input id="c-phone" type="tel" className="input" placeholder="+254 ..." {...register('phone')} />
                </div>
                <div className="full">
                    <label className="label" htmlFor="c-message">Message *</label>
                    <textarea id="c-message" className={`input${errors.message ? ' error' : ''}`} placeholder="How can we help?" {...register('message')} />
                    {errors.message && <p className="field-error">{errors.message.message}</p>}
                </div>
                <div className="full">
                    {!user && (
                        <label className="site-account-opt">
                            <input type="checkbox" {...register('create_account')} />
                            <span><b>Create an account for me</b> so I can get instant prices, book and track shipments online. We’ll email you a temporary password.</span>
                        </label>
                    )}
                </div>
                <div className="full" style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                        {isSubmitting ? <div className="spinner" /> : <>Send Message <Send size={16} /></>}
                    </button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={() => reset({ subject: defaultSubject })} disabled={isSubmitting}>
                        Clear
                    </button>
                </div>
            </div>
        </form>
    );
}

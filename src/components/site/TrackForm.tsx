'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function TrackForm({ className, buttonClassName = 'btn btn-primary' }: { className?: string; buttonClassName?: string }) {
    const router = useRouter();
    const [query, setQuery] = useState('');

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = query.trim();
        router.push(q ? `/track?q=${encodeURIComponent(q)}` : '/track');
    };

    return (
        <form onSubmit={onSubmit} className={className} style={{ flex: 1 }}>
            <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    className="input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Enter tracking number, e.g. SHP-20240228-AB12"
                    aria-label="Tracking number"
                    style={{ paddingLeft: '2.25rem', height: 46, fontFamily: 'monospace' }}
                />
            </div>
            <button type="submit" className={buttonClassName} style={{ height: 46 }}>Track</button>
        </form>
    );
}

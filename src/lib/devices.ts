// Readable names for signed-in devices ("Chrome on macOS") from the browser's user agent

export type DeviceKind = 'phone' | 'tablet' | 'computer';

export function describeDevice(ua: string | null | undefined): { name: string; kind: DeviceKind } {
    const s = ua || '';
    const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung Internet'
        : /Firefox\//.test(s) ? 'Firefox' : /Chrome\/|CriOS/.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : '';
    const os = /iPad/.test(s) ? 'iPad' : /iPhone/.test(s) ? 'iPhone' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows'
        : /Mac OS X|Macintosh/.test(s) ? 'macOS' : /CrOS/.test(s) ? 'ChromeOS' : /Linux/.test(s) ? 'Linux' : '';
    const kind: DeviceKind = /iPad|Tablet/.test(s) ? 'tablet' : /Mobi|iPhone|Android/.test(s) ? 'phone' : 'computer';
    return { name: browser && os ? `${browser} on ${os}` : browser || os || 'Unknown device', kind };
}

/** "Active now", "Active 5 min ago", "Active 2 days ago" */
export function activeAgo(iso: string) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 10) return 'Active now';
    if (mins < 60) return `Active ${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `Active ${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return `Active ${days} day${days === 1 ? '' : 's'} ago`;
}

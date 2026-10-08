import api from './api';

/**
 * Fetch a PDF from the API (with the signed-in token) and open it in a new tab, or save it.
 * Returns false if it couldn't be fetched.
 */
export async function getPdf(path: string, { filename, open = false }: { filename: string; open?: boolean }) {
    // Open the tab first (browsers block pop-ups opened after an await)
    const tab = open ? window.open('', '_blank') : null;
    try {
        const res = await api.get(path, { responseType: 'blob' });
        const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        if (tab) tab.location.href = url;
        else {
            const a = Object.assign(document.createElement('a'), { href: url, download: filename });
            document.body.appendChild(a); a.click(); a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
    } catch {
        tab?.close();
        return false;
    }
}

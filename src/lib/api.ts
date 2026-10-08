import axios from 'axios';
import { isProtectedPath, loginUrl } from './roles';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api',
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// On 401 → the session is invalid: clear it, and send the user to sign in if they are in a protected area.
// (403 means "signed in but not allowed" — pages handle it themselves, the session stays.)
api.interceptors.response.use(
    (res) => res,
    (error) => {
        const isLogRequest = error.config?.url?.endsWith('/logs');
        if (error.response?.status === 401 && !isLogRequest && typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            document.cookie = 'auth_token=; path=/; max-age=0';

            const { pathname, search } = window.location;
            if (isProtectedPath(pathname)) {
                window.location.href = loginUrl(pathname + search, { expired: true });
            }
        }
        return Promise.reject(error);
    }
);

export const logEvent = async (action: string, entity_type?: string, entity_id?: string, details?: any) => {
    try {
        await api.post('/logs', { action, entity_type, entity_id, details });
    } catch (e) {
        // Silent fail for logging
    }
};

export default api;

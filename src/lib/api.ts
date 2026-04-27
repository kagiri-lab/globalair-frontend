import axios from 'axios';

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

// On 401 → clear token and redirect to login
api.interceptors.response.use(
    (res) => res,
    (error) => {
        const isLogRequest = error.config?.url?.endsWith('/logs');
        if (error.response?.status === 401 && !isLogRequest && typeof window !== 'undefined') {
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Clear cookies
            document.cookie = 'token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';

            // Avoid infinite loops if already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?expired=true';
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

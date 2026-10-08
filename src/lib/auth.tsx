'use client';

import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from './types';
import api from './api';
import { isStaffRole } from './roles';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextValue {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    /** True for any operations-portal role (admin, operations, support, ...) */
    isStaff: boolean;
    login: (email: string, password: string) => Promise<User>;
    register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
    /** Signs out and goes to /login, or stays on the current page with { redirect: false } */
    logout: (opts?: { redirect?: boolean }) => void;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Keep a cookie in sync with the token so proxy.ts can route requests server-side
const setAuthCookie = (t: string | null) => {
    if (t) {
        document.cookie = `auth_token=${t}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`; // 7 days
    } else {
        document.cookie = 'auth_token=; path=/; max-age=0';
    }
};

const clearStoredSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Sessions from the old standalone admin app
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAuthCookie(null);
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    // A temporary password (account created for them by our team) must be replaced before anything else
    useEffect(() => {
        if (user?.must_change_password && pathname !== '/change-password') router.replace('/change-password');
    }, [user, pathname, router]);

    // Restore session from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            // A leftover cookie without a stored session would make proxy.ts treat the visitor as
            // signed in while the app treats them as signed out — a redirect loop. Drop it.
            setAuthCookie(null);
            setIsLoading(false);
            return;
        }
        setToken(storedToken);
        setAuthCookie(storedToken);

        // Validate token. If it is stale, clear it quietly — public pages must stay usable,
        // and protected pages redirect to /login through their own guards.
        api.get('/auth/me').then(res => {
            setUser(res.data.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.data.user));
        }).catch(() => {
            clearStoredSession();
            setToken(null);
            setUser(null);
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    const startSession = (t: string, u: User) => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        setAuthCookie(t);
        setToken(t);
        setUser(u);
    };

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { user: u, token: t } = res.data.data;
        startSession(t, u);
        return u as User;
    };

    const register = async (name: string, email: string, password: string, phone?: string) => {
        const res = await api.post('/auth/register', { name, email, password, phone });
        const { user: u, token: t } = res.data.data;
        startSession(t, u);
        return u as User;
    };

    const logout = ({ redirect = true }: { redirect?: boolean } = {}) => {
        // End this device's session on the server too (so it leaves "Active sessions")
        const stored = localStorage.getItem('token');
        if (stored) api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${stored}` } }).catch(() => { });
        clearStoredSession();
        setToken(null);
        setUser(null);
        if (redirect && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.replace('/login');
        }
    };

    // The backend returns effective permissions (role defaults + overrides) on login and /auth/me
    const hasPermission = useCallback((permission: string): boolean => {
        if (!user) return false;
        if (user.role === 'super_admin') return true;
        let perms = user.permissions;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch { return false; }
        }
        return Array.isArray(perms) && perms.includes(permission);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, token, isLoading, isStaff: isStaffRole(user?.role), login, register, logout, setUser, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

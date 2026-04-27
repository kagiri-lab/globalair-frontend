'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from './types';
import api from './api';

interface AuthContextValue {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Helper — keep cookie in sync so proxy.ts can read it server-side
    const setAuthCookie = (t: string | null) => {
        if (t) {
            document.cookie = `auth_token=${t}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
        } else {
            document.cookie = 'auth_token=; path=/; max-age=0';
        }
    };

    // Restore session from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
            setAuthCookie(storedToken);
            
            // Validate token
            api.get('/auth/me').then(res => {
                setUser(res.data.data.user);
                localStorage.setItem('user', JSON.stringify(res.data.data.user));
            }).catch(() => {
                setUser(null);
                logout();
            }).finally(() => {
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { user: u, token: t } = res.data.data;
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        setAuthCookie(t);
        setToken(t);
        setUser(u);
    };

    const register = async (name: string, email: string, password: string, phone?: string) => {
        const res = await api.post('/auth/register', { name, email, password, phone });
        const { user: u, token: t } = res.data.data;
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        setAuthCookie(t);
        setToken(t);
        setUser(u);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthCookie(null);
        setToken(null);
        setUser(null);
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.replace('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with interceptors
const api = axios.create({
    baseURL: API,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('clt_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('clt_token');
            localStorage.removeItem('clt_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [justLoggedIn, setJustLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('clt_token');
        const savedUser = localStorage.getItem('clt_user');
        
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
            // Verify token is still valid
            api.get('/auth/me')
                .then(res => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem('clt_token');
                    localStorage.removeItem('clt_user');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, user: userData } = response.data;
        
        localStorage.setItem('clt_token', access_token);
        localStorage.setItem('clt_user', JSON.stringify(userData));
        setJustLoggedIn(true);
        setUser(userData);
        
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('clt_token');
        localStorage.removeItem('clt_user');
        setUser(null);
        setJustLoggedIn(false);
    };

    const clearJustLoggedIn = () => {
        setJustLoggedIn(false);
    };
    
    const refreshUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
            localStorage.setItem('clt_user', JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error('Failed to refresh user:', error);
            return null;
        }
    };

    const value = {
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        justLoggedIn,
        clearJustLoggedIn,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Theme Context
const ThemeContext = createContext(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('clt_theme') || 'dark';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('clt_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// API Functions
export const apiClient = api;

// Auth APIs
export const authApi = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    getMe: () => api.get('/auth/me'),
};

// User APIs
export const userApi = {
    getAll: (params) => api.get('/users', { params }),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// Lead APIs
export const leadApi = {
    getAll: (params) => api.get('/leads', { params }),
    create: (data) => api.post('/leads', data),
    update: (id, data) => api.put(`/leads/${id}`, data),
    delete: (id) => api.delete(`/leads/${id}`),
};

// Student APIs
export const studentApi = {
    getAll: (params) => api.get('/students', { params }),
    update: (id, data) => api.put(`/students/${id}`, data),
};

// Payment APIs
export const paymentApi = {
    getAll: (params) => api.get('/payments', { params }),
    create: (data) => api.post('/payments', data),
    update: (id, data) => api.put(`/payments/${id}`, data),
};

// Notification APIs
export const notificationApi = {
    getAll: (unreadOnly = false) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
};

// Dashboard APIs
export const dashboardApi = {
    getStats: (viewAs) => api.get('/dashboard/stats', { params: viewAs ? { view_as: viewAs } : {} }),
    getLeadFunnel: (viewAs) => api.get('/dashboard/lead-funnel', { params: viewAs ? { view_as: viewAs } : {} }),
    getPaymentSummary: (viewAs) => api.get('/dashboard/payment-summary', { params: viewAs ? { view_as: viewAs } : {} }),
    getViewableUsers: () => api.get('/dashboard/viewable-users'),
};

// Activity Log APIs
export const activityApi = {
    getAll: (params) => api.get('/activity-logs', { params }),
};

export default api;

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

const getAutoTheme = () => {
    // Abu Dhabi timezone GST+4 — dark during night (7pm-6am), light during day
    const now = new Date();
    const utcHours = now.getUTCHours();
    const abuDhabiHour = (utcHours + 4) % 24;
    // Day: 6am - 7pm = light, Night: 7pm - 6am = dark
    return (abuDhabiHour >= 6 && abuDhabiHour < 19) ? 'light' : 'dark';
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('clt_theme');
        if (saved === 'auto' || !saved) return getAutoTheme();
        return saved;
    });
    const [themeMode, setThemeMode] = useState(() => {
        return localStorage.getItem('clt_theme_mode') || 'auto';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        const applied = themeMode === 'auto' ? getAutoTheme() : themeMode;
        root.classList.remove('light', 'dark');
        root.classList.add(applied);
        setTheme(applied);
        localStorage.setItem('clt_theme', applied);
        localStorage.setItem('clt_theme_mode', themeMode);
    }, [themeMode]);

    // Re-check auto theme every minute
    useEffect(() => {
        if (themeMode !== 'auto') return;
        const interval = setInterval(() => {
            const auto = getAutoTheme();
            setTheme(prev => {
                if (prev !== auto) {
                    const root = window.document.documentElement;
                    root.classList.remove('light', 'dark');
                    root.classList.add(auto);
                    localStorage.setItem('clt_theme', auto);
                    return auto;
                }
                return prev;
            });
        }, 60000);
        return () => clearInterval(interval);
    }, [themeMode]);

    const toggleTheme = () => {
        // Cycle: auto → light → dark → auto
        setThemeMode(prev => {
            if (prev === 'auto') return 'light';
            if (prev === 'light') return 'dark';
            return 'auto';
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, themeMode, setTheme, setThemeMode, toggleTheme }}>
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

// Permission Context
const PermissionContext = createContext(null);

export const usePermissions = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermissions must be used within PermissionProvider');
    }
    return context;
};

// Module hierarchy for default permission mapping
const MODULE_HIERARCHY = [
    {
        id: 'dashboard',
        subPages: ['main_dashboard', 'qc_dashboard']
    },
    {
        id: 'sales',
        subPages: ['sales_crm', 'sales_dashboard', 'today_followups', 'leads_pool', 'approvals']
    },
    {
        id: 'customer_service',
        subPages: ['cs_kanban', 'cs_dashboard', 'customer_master']
    },
    {
        id: 'mentor',
        subPages: ['mentor_crm', 'mentor_dashboard', 'leaderboard']
    },
    {
        id: 'hr',
        subPages: ['hr_dashboard', 'employee_master', 'leave_management', 'attendance', 'biocloud_sync', 'payroll', 'performance', 'hr_assets', 'hr_analytics', 'hr_documents', 'hr_approvals']
    },
    {
        id: 'finance',
        subPages: ['finance_selector', 'commission_engine', 'clt_dashboard', 'clt_payables', 'clt_receivables', 
                   'finance_verifications', 'pending_settlements', 'journal_entries',
                   'treasury_dashboard', 'treasury_balances', 'budget_sheet', 'pnl_dashboard', 'data_management',
                   'chart_of_accounts', 'bank_accounts', 'cost_centers', 'payment_methods', 'payment_gateways', 'psp_mapping']
    },
    {
        id: 'marketing',
        subPages: ['marketing_dashboard', 'lead_connectors', 'marketing_settings']
    },
    {
        id: 'operations',
        subPages: ['qc_dashboard_ops']
    },
    {
        id: 'settings',
        subPages: ['user_management', 'access_control', 'role_management', 'teams_management', 'departments', 'courses', 'password_resets', 'audit_log', 'admin_settings']
    },
];

// Default permissions based on role
const getDefaultPermissions = (role) => {
    const permissions = {};
    
    // Initialize all to none
    MODULE_HIERARCHY.forEach(module => {
        permissions[module.id] = { enabled: false, level: 'none', subPages: {} };
        module.subPages.forEach(subPage => {
            permissions[module.id].subPages[subPage] = 'none';
        });
    });
    
    // Set role-specific defaults
    if (role === 'admin') {
        MODULE_HIERARCHY.forEach(module => {
            permissions[module.id] = { enabled: true, level: 'full', subPages: {} };
            module.subPages.forEach(subPage => {
                permissions[module.id].subPages[subPage] = 'full';
            });
        });
        permissions['settings'].subPages['access_control'] = 'view';
        permissions['settings'].subPages['password_resets'] = 'none';
    } else if (role === 'sales_manager') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'view' } };
        permissions['sales'] = { enabled: true, level: 'full', subPages: { 
            sales_crm: 'full', sales_dashboard: 'full', today_followups: 'full', leads_pool: 'full', approvals: 'full' 
        }};
        permissions['customer_service'] = { enabled: true, level: 'view', subPages: { 
            cs_kanban: 'view', cs_dashboard: 'view', customer_master: 'view' 
        }};
    } else if (role === 'team_leader') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        permissions['sales'] = { enabled: true, level: 'edit', subPages: { 
            sales_crm: 'edit', sales_dashboard: 'view', today_followups: 'edit', leads_pool: 'view', approvals: 'view' 
        }};
    } else if (role === 'sales_executive') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        permissions['sales'] = { enabled: true, level: 'edit', subPages: { 
            sales_crm: 'edit', sales_dashboard: 'view', today_followups: 'edit', leads_pool: 'none', approvals: 'none' 
        }};
    } else if (role === 'cs_head') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'view' } };
        permissions['customer_service'] = { enabled: true, level: 'full', subPages: { 
            cs_kanban: 'full', cs_dashboard: 'full', customer_master: 'full' 
        }};
    } else if (role === 'cs_agent') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        permissions['customer_service'] = { enabled: true, level: 'edit', subPages: { 
            cs_kanban: 'edit', cs_dashboard: 'view', customer_master: 'view' 
        }};
    } else if (role === 'mentor' || role === 'academic_master' || role === 'master_of_academics') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        const isMaster = role === 'academic_master' || role === 'master_of_academics';
        permissions['mentor'] = { enabled: true, level: isMaster ? 'full' : 'edit', subPages: { 
            mentor_crm: isMaster ? 'full' : 'edit', 
            mentor_dashboard: isMaster ? 'full' : 'view', 
            leaderboard: 'view' 
        }};
    } else if (role === 'hr') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        permissions['hr'] = { enabled: true, level: 'full', subPages: { 
            hr_dashboard: 'full', employee_master: 'full', leave_management: 'full', 
            attendance: 'full', biocloud_sync: 'full', payroll: 'edit', 
            performance: 'full', hr_assets: 'full', hr_analytics: 'view' 
        }};
        permissions['settings'] = { enabled: true, level: 'view', subPages: { 
            user_management: 'view', departments: 'edit', courses: 'none',
            access_control: 'none', role_management: 'none', teams_management: 'none',
            password_resets: 'none', audit_log: 'none', admin_settings: 'none'
        }};
    } else if (role === 'finance' || role === 'finance_manager' || role === 'finance_admin') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        permissions['finance'] = { enabled: true, level: 'full', subPages: { 
            finance_selector: 'full', commission_engine: 'edit', clt_dashboard: 'full', clt_payables: 'full', clt_receivables: 'full',
            finance_verifications: 'full', pending_settlements: 'full', journal_entries: 'full',
            treasury_dashboard: 'full', treasury_balances: 'full', budget_sheet: 'edit', pnl_dashboard: 'view', data_management: 'view',
            chart_of_accounts: 'full', bank_accounts: 'full', cost_centers: 'full', 
            payment_methods: 'full', payment_gateways: 'full', psp_mapping: 'full'
        }};
        permissions['customer_service'] = { enabled: true, level: 'view', subPages: { 
            cs_kanban: 'none', cs_dashboard: 'none', customer_master: 'view' 
        }};
    } else if (role === 'marketing') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        permissions['marketing'] = { enabled: true, level: 'full', subPages: { 
            marketing_dashboard: 'full', lead_connectors: 'full', marketing_settings: 'full'
        }};
        permissions['sales'] = { enabled: true, level: 'view', subPages: { 
            sales_crm: 'none', sales_dashboard: 'view', today_followups: 'none', leads_pool: 'view', approvals: 'none' 
        }};
    }
    
    return permissions;
};

// Path to subPage ID mapping
const PATH_TO_SUBPAGE = {
    '/dashboard': 'main_dashboard',
    '/qc-dashboard': 'qc_dashboard',
    '/sales': 'sales_crm',
    '/sales/dashboard': 'sales_dashboard',
    '/followups': 'today_followups',
    '/leads/pool': 'leads_pool',
    '/approvals': 'approvals',
    '/cs': 'cs_kanban',
    '/cs/dashboard': 'cs_dashboard',
    '/customers': 'customer_master',
    '/mentor': 'mentor_crm',
    '/mentor/dashboard': 'mentor_dashboard',
    '/mentor/leaderboard': 'leaderboard',
    '/hr/dashboard': 'hr_dashboard',
    '/hr/employees': 'employee_master',
    '/hr/leave': 'leave_management',
    '/hr/attendance': 'attendance',
    '/hr/biocloud': 'biocloud_sync',
    '/hr/payroll': 'payroll',
    '/hr/performance': 'performance',
    '/hr/assets': 'hr_assets',
    '/hr/analytics': 'hr_analytics',
    // Finance module paths
    '/finance': 'finance_selector',
    '/commissions': 'commission_engine',
    '/finance/clt/dashboard': 'clt_dashboard',
    '/finance/clt/payables': 'clt_payables',
    '/finance/clt/receivables': 'clt_receivables',
    '/finance/clt/verifications': 'finance_verifications',
    '/finance/clt/pending-settlements': 'pending_settlements',
    '/finance/clt/journal': 'journal_entries',
    '/finance/treasury/dashboard': 'treasury_dashboard',
    '/finance/treasury/balances': 'treasury_balances',
    '/finance/budgeting/sheet': 'budget_sheet',
    '/finance/pnl/dashboard': 'pnl_dashboard',
    '/finance/data/management': 'data_management',
    // Finance Settings
    '/finance/settings/chart-of-accounts': 'chart_of_accounts',
    '/finance/settings/bank-accounts': 'bank_accounts',
    '/finance/settings/cost-centers': 'cost_centers',
    '/finance/settings/payment-methods': 'payment_methods',
    '/finance/settings/payment-gateways': 'payment_gateways',
    '/finance/settings/psp-mapping': 'psp_mapping',
    // Marketing module paths
    '/marketing/dashboard': 'marketing_dashboard',
    '/marketing/connectors': 'lead_connectors',
    '/marketing/settings': 'marketing_settings',
    // Settings paths
    '/users': 'user_management',
    '/access-control': 'access_control',
    '/roles': 'role_management',
    '/teams': 'teams_management',
    '/departments': 'departments',
    '/courses': 'courses',
    '/password-resets': 'password_resets',
    '/audit-log': 'audit_log',
    '/admin-settings': 'admin_settings',
    // SSHR paths
    '/sshr': 'sshr_dashboard',
    '/sshr/payslips': 'sshr_payslips',
    // HR extra paths
    '/hr/documents': 'hr_documents',
    '/hr/approvals': 'hr_approvals',
    // Finance extra paths  
    '/finance/verifications': 'finance_verifications',
};

// SubPage ID to module mapping
const SUBPAGE_TO_MODULE = {};
MODULE_HIERARCHY.forEach(module => {
    module.subPages.forEach(subPage => {
        SUBPAGE_TO_MODULE[subPage] = module.id;
    });
});

export const PermissionProvider = ({ children }) => {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!user) {
                setPermissions(null);
                setLoading(false);
                return;
            }

            // Super admin has full access
            if (user.role === 'super_admin') {
                setPermissions({ isSuperAdmin: true, fullAccess: true });
                setLoading(false);
                return;
            }

            try {
                const res = await api.get('/user/permissions');
                if (res.data.permissions && Object.keys(res.data.permissions).length > 0) {
                    setPermissions({
                        isSuperAdmin: false,
                        role: user.role,
                        ...res.data.permissions
                    });
                } else {
                    // Use default permissions for role
                    setPermissions({
                        isSuperAdmin: false,
                        role: user.role,
                        ...getDefaultPermissions(user.role)
                    });
                }
            } catch (error) {
                // Use default permissions on error
                setPermissions({
                    isSuperAdmin: false,
                    role: user.role,
                    ...getDefaultPermissions(user.role)
                });
            }
            setLoading(false);
        };

        fetchPermissions();
    }, [user]);

    // Check if user can access a specific path
    const canAccess = (path) => {
        if (!permissions) return false;
        if (permissions.isSuperAdmin || permissions.fullAccess) return true;

        const subPageId = PATH_TO_SUBPAGE[path];
        if (!subPageId) return true; // Unknown paths are allowed by default

        const moduleId = SUBPAGE_TO_MODULE[subPageId];
        if (!moduleId) return true;

        const modulePerms = permissions[moduleId];
        if (!modulePerms || !modulePerms.enabled) return false;

        const subPagePerm = modulePerms.subPages?.[subPageId];
        return subPagePerm && subPagePerm !== 'none';
    };

    // Check permission level for a path (none, view, edit, full)
    const getPermissionLevel = (path) => {
        if (!permissions) return 'none';
        if (permissions.isSuperAdmin || permissions.fullAccess) return 'full';

        const subPageId = PATH_TO_SUBPAGE[path];
        if (!subPageId) return 'full';

        const moduleId = SUBPAGE_TO_MODULE[subPageId];
        if (!moduleId) return 'full';

        const modulePerms = permissions[moduleId];
        if (!modulePerms || !modulePerms.enabled) return 'none';

        return modulePerms.subPages?.[subPageId] || 'none';
    };

    // Check if user can edit on a path
    const canEdit = (path) => {
        const level = getPermissionLevel(path);
        return level === 'edit' || level === 'full';
    };

    // Check if user has full access on a path
    const hasFullAccess = (path) => {
        return getPermissionLevel(path) === 'full';
    };

    // Check module-level access
    const canAccessModule = (moduleId) => {
        if (!permissions) return false;
        if (permissions.isSuperAdmin || permissions.fullAccess) return true;

        const modulePerms = permissions[moduleId];
        return modulePerms && modulePerms.enabled;
    };

    const value = {
        permissions,
        loading,
        canAccess,
        canEdit,
        hasFullAccess,
        getPermissionLevel,
        canAccessModule,
        PATH_TO_SUBPAGE,
        SUBPAGE_TO_MODULE,
    };

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
};

// Permission APIs
export const permissionApi = {
    getRolePermissions: (roleId) => api.get(`/roles/${roleId}/permissions`),
    saveRolePermissions: (roleId, permissions) => api.put(`/roles/${roleId}/permissions`, permissions),
    getCurrentUserPermissions: () => api.get('/user/permissions'),
};

export default api;

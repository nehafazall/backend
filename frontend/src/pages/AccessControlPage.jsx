import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { 
    Shield, Save, RefreshCw, Eye, Edit, Lock, Check, 
    ChevronDown, ChevronRight, LayoutDashboard, Phone, 
    Users, GraduationCap, DollarSign, Settings, Building2,
    BookOpen, Calculator, FileText, Headphones, Bell,
    Inbox, UserCheck, Calendar, Clock, Fingerprint,
    TrendingUp, Briefcase, BarChart3, Key, UserCircle
} from 'lucide-react';

const STATIC_ROLES = [
    { id: 'admin', label: 'Admin' },
    { id: 'sales_manager', label: 'Sales Manager' },
    { id: 'team_leader', label: 'Team Leader' },
    { id: 'sales_executive', label: 'Sales Executive' },
    { id: 'cs_head', label: 'CS Head' },
    { id: 'cs_agent', label: 'CS Agent' },
    { id: 'mentor', label: 'Mentor' },
    { id: 'academic_master', label: 'Academic Master' },
    { id: 'business_development_manager', label: 'Business Development Manager' },
    { id: 'finance', label: 'Finance' },
    { id: 'hr', label: 'HR' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'operations', label: 'Operations' },
    { id: 'quality_control', label: 'Quality Control' },
];

// Hierarchical module structure with sub-pages
const MODULE_HIERARCHY = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        subPages: [
            { id: 'main_dashboard', label: 'Main Dashboard', path: '/dashboard' },
            { id: 'detailed_dashboard', label: 'Detailed Dashboard', path: '/dashboard/detailed' },
            { id: 'reports', label: 'Reports', path: '/reports' },
            { id: 'forecasting', label: 'Forecasting', path: '/forecasting' },
        ]
    },
    {
        id: 'sales',
        label: 'Sales Module',
        icon: Phone,
        subPages: [
            { id: 'sales_crm', label: 'Sales CRM (Kanban)', path: '/sales/crm' },
            { id: 'sales_dashboard', label: 'Sales Dashboard', path: '/sales/dashboard' },
            { id: 'today_followups', label: "Today's Follow-ups", path: '/followups' },
            { id: 'leads_pool', label: 'Leads Pool', path: '/leads/pool' },
            { id: 'approvals', label: 'Approvals', path: '/approvals' },
            { id: 'round_robin', label: 'Round Robin', path: '/round-robin' },
            { id: 'sla_management', label: 'SLA Management', path: '/sla-management' },
            { id: 'transfer_requests', label: 'Transfer Requests', path: '/transfer-requests' },
        ]
    },
    {
        id: 'customer_service',
        label: 'Customer Service',
        icon: Headphones,
        subPages: [
            { id: 'cs_kanban', label: 'CS Kanban', path: '/cs' },
            { id: 'cs_dashboard', label: 'CS Dashboard', path: '/cs/dashboard' },
            { id: 'customer_master', label: 'Customer Master', path: '/customers' },
            { id: 'student_portal', label: 'Student Portal', path: '/cs/student-portal' },
            { id: 'cs_merge_approvals', label: 'Merge Approvals', path: '/cs/merge-approvals' },
        ]
    },
    {
        id: 'bd',
        label: 'Business Development',
        icon: Briefcase,
        subPages: [
            { id: 'bd_crm', label: 'BD CRM', path: '/bd' },
            { id: 'bd_dashboard', label: 'BD Dashboard', path: '/bd/dashboard' },
        ]
    },
    {
        id: 'mentor',
        label: 'Mentor Module',
        icon: GraduationCap,
        subPages: [
            { id: 'mentor_crm', label: 'Mentor CRM', path: '/mentor' },
            { id: 'mentor_dashboard', label: 'Mentor Dashboard', path: '/mentor/dashboard' },
            { id: 'leaderboard', label: 'Leaderboard', path: '/mentor/leaderboard' },
        ]
    },
    {
        id: 'hr',
        label: 'HR Module',
        icon: Users,
        subPages: [
            { id: 'hr_dashboard', label: 'HR Dashboard', path: '/hr/dashboard' },
            { id: 'employee_master', label: 'Employee Master', path: '/hr/employees' },
            { id: 'leave_management', label: 'Leave Management', path: '/hr/leave' },
            { id: 'attendance', label: 'Attendance', path: '/hr/attendance' },
            { id: 'biocloud_sync', label: 'BioCloud Sync', path: '/hr/biocloud' },
            { id: 'payroll', label: 'Payroll', path: '/hr/payroll' },
            { id: 'performance', label: 'Performance', path: '/hr/performance' },
            { id: 'hr_assets', label: 'Assets', path: '/hr/assets' },
            { id: 'hr_analytics', label: 'HR Analytics', path: '/hr/analytics' },
            { id: 'hr_documents', label: 'Company Documents', path: '/hr/documents' },
            { id: 'hr_approvals', label: 'Approval Queue', path: '/hr/approvals' },
            { id: 'sshr', label: 'Self-Service HR', path: '/sshr' },
            { id: 'sshr_payslips', label: 'Payslips', path: '/sshr/payslips' },
        ]
    },
    {
        id: 'finance',
        label: 'Finance Module',
        icon: DollarSign,
        subPages: [
            { id: 'finance_selector', label: 'Entity Selector', path: '/finance' },
            { id: 'commission_engine', label: 'Commission Engine', path: '/commissions' },
            { id: 'commission_dashboard', label: 'Commission Dashboard', path: '/commission-dashboard' },
            // CLT Finance
            { id: 'clt_dashboard', label: 'CLT Dashboard', path: '/finance/clt/dashboard' },
            { id: 'clt_payables', label: 'CLT Payables', path: '/finance/clt/payables' },
            { id: 'clt_receivables', label: 'CLT Receivables', path: '/finance/clt/receivables' },
            { id: 'finance_verifications', label: 'Payment Verifications', path: '/finance/clt/verifications' },
            { id: 'pending_settlements', label: 'Pending Settlements', path: '/finance/clt/pending-settlements' },
            { id: 'journal_entries', label: 'Journal Entries', path: '/finance/clt/journal' },
            // Treasury
            { id: 'treasury_dashboard', label: 'Treasury Dashboard', path: '/finance/treasury/dashboard' },
            { id: 'treasury_balances', label: 'Treasury Balances', path: '/finance/treasury/balances' },
            // Budgeting & PNL
            { id: 'budget_sheet', label: 'Budget Sheet', path: '/finance/budgeting/sheet' },
            { id: 'pnl_dashboard', label: 'PNL Dashboard', path: '/finance/pnl/dashboard' },
            { id: 'data_management', label: 'Data Management', path: '/finance/data/management' },
            // Finance Settings
            { id: 'chart_of_accounts', label: 'Chart of Accounts', path: '/finance/settings/chart-of-accounts' },
            { id: 'bank_accounts', label: 'Bank Accounts', path: '/finance/settings/bank-accounts' },
            { id: 'cost_centers', label: 'Cost Centers', path: '/finance/settings/cost-centers' },
            { id: 'payment_methods', label: 'Payment Methods', path: '/finance/settings/payment-methods' },
            { id: 'payment_gateways', label: 'Payment Gateways', path: '/finance/settings/payment-gateways' },
            { id: 'psp_mapping', label: 'PSP Bank Mapping', path: '/finance/settings/psp-mapping' },
            { id: 'mentor_withdrawals', label: 'Mentor Withdrawals', path: '/finance/mentor-withdrawals' },
        ]
    },
    {
        id: 'marketing',
        label: 'Marketing Module',
        icon: BarChart3,
        subPages: [
            { id: 'marketing_dashboard', label: 'Analytics Dashboard', path: '/marketing/dashboard' },
            { id: 'lead_connectors', label: 'Lead Connectors', path: '/marketing/connectors' },
            { id: 'marketing_settings', label: 'Marketing Settings', path: '/marketing/settings' },
        ]
    },
    {
        id: 'operations',
        label: 'Operations',
        icon: Building2,
        subPages: [
            { id: 'qc_dashboard', label: 'QC Dashboard', path: '/qc-dashboard' },
            { id: 'certificates', label: 'Certificate Creation', path: '/certificates' },
        ]
    },
    {
        id: 'settings',
        label: 'Settings & Admin',
        icon: Settings,
        subPages: [
            { id: 'user_management', label: 'User Management', path: '/users' },
            { id: 'access_control', label: 'Access Control', path: '/access-control' },
            { id: 'role_management', label: 'Role Management', path: '/roles' },
            { id: 'teams_management', label: 'Teams Management', path: '/teams' },
            { id: 'departments', label: 'Departments', path: '/departments' },
            { id: 'courses', label: 'Courses', path: '/courses' },
            { id: 'password_resets', label: 'Password Resets', path: '/password-resets' },
            { id: 'audit_log', label: 'Audit Log', path: '/audit-log' },
            { id: 'admin_settings', label: 'Admin Settings', path: '/admin-settings' },
        ]
    },
];

const PERMISSION_LEVELS = [
    { id: 'none', label: 'None', color: 'bg-gray-200 text-gray-600' },
    { id: 'view', label: 'View', color: 'bg-blue-100 text-blue-700' },
    { id: 'edit', label: 'Edit', color: 'bg-amber-100 text-amber-700' },
    { id: 'full', label: 'Full', color: 'bg-emerald-100 text-emerald-700' },
];

// Get default permissions based on role
const getDefaultPermissions = (role) => {
    const permissions = {};
    
    // Initialize all to none
    MODULE_HIERARCHY.forEach(module => {
        permissions[module.id] = { enabled: false, level: 'none', subPages: {} };
        module.subPages.forEach(subPage => {
            permissions[module.id].subPages[subPage.id] = 'none';
        });
    });
    
    // Set role-specific defaults
    if (role === 'admin') {
        MODULE_HIERARCHY.forEach(module => {
            permissions[module.id] = { enabled: true, level: 'full', subPages: {} };
            module.subPages.forEach(subPage => {
                permissions[module.id].subPages[subPage.id] = 'full';
            });
        });
        // Admin can't access super admin settings
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
    } else if (role === 'mentor' || role === 'academic_master') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        permissions['mentor'] = { enabled: true, level: role === 'academic_master' ? 'full' : 'edit', subPages: { 
            mentor_crm: role === 'academic_master' ? 'full' : 'edit', 
            mentor_dashboard: 'view', 
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
    } else if (role === 'finance') {
        permissions['dashboard'] = { enabled: true, level: 'view', subPages: { main_dashboard: 'view', qc_dashboard: 'none' } };
        permissions['finance'] = { enabled: true, level: 'full', subPages: { 
            finance_dashboard: 'full', commission_engine: 'edit', payments: 'full', reconciliation: 'full' 
        }};
        permissions['customer_service'] = { enabled: true, level: 'view', subPages: { 
            cs_kanban: 'none', cs_dashboard: 'none', customer_master: 'view' 
        }};
    }
    
    return permissions;
};

function ModuleCard({ module, permissions, onPermissionChange, onModuleToggle, isExpanded, onToggleExpand }) {
    const Icon = module.icon;
    const modulePerms = permissions[module.id] || { enabled: false, level: 'none', subPages: {} };
    const isEnabled = modulePerms.enabled;
    
    // Calculate how many subpages have access
    const accessCount = Object.values(modulePerms.subPages || {}).filter(p => p !== 'none').length;
    const totalSubPages = module.subPages.length;
    
    return (
        <Card className={`transition-all ${isEnabled ? 'border-primary/50' : 'border-muted opacity-70'}`}>
            <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <Icon className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{module.label}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {accessCount} of {totalSubPages} pages accessible
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor={`module-${module.id}`} className="text-sm">
                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                    </Label>
                                    <Switch
                                        id={`module-${module.id}`}
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => onModuleToggle(module.id, checked)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                        <div className="space-y-2">
                            {/* Module-level permission */}
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-3">
                                <span className="text-sm font-medium">Default Module Access</span>
                                <div className="flex gap-1">
                                    {PERMISSION_LEVELS.map((level) => (
                                        <Button
                                            key={level.id}
                                            size="sm"
                                            variant={modulePerms.level === level.id ? 'default' : 'outline'}
                                            className={`h-7 px-2 text-xs ${modulePerms.level === level.id ? level.color : ''}`}
                                            onClick={() => onPermissionChange(module.id, null, level.id)}
                                            disabled={!isEnabled}
                                        >
                                            {level.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Sub-page permissions */}
                            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
                                Individual Page Permissions:
                            </div>
                            {module.subPages.map((subPage) => {
                                const subPagePerm = modulePerms.subPages?.[subPage.id] || 'none';
                                return (
                                    <div 
                                        key={subPage.id} 
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                subPagePerm === 'none' ? 'bg-gray-300' :
                                                subPagePerm === 'view' ? 'bg-blue-500' :
                                                subPagePerm === 'edit' ? 'bg-amber-500' :
                                                'bg-emerald-500'
                                            }`} />
                                            <span className="text-sm">{subPage.label}</span>
                                            <span className="text-xs text-muted-foreground">({subPage.path})</span>
                                        </div>
                                        <div className="flex gap-1">
                                            {PERMISSION_LEVELS.map((level) => (
                                                <Button
                                                    key={level.id}
                                                    size="sm"
                                                    variant={subPagePerm === level.id ? 'default' : 'ghost'}
                                                    className={`h-6 px-2 text-xs ${
                                                        subPagePerm === level.id 
                                                            ? level.color 
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                    onClick={() => onPermissionChange(module.id, subPage.id, level.id)}
                                                    disabled={!isEnabled}
                                                    data-testid={`perm-${module.id}-${subPage.id}-${level.id}`}
                                                >
                                                    {level.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

function AccessControlPage() {
    const { user } = useAuth();
    const [roles, setRoles] = useState(STATIC_ROLES);
    const [selectedRole, setSelectedRole] = useState('sales_executive');
    const [permissions, setPermissions] = useState({});
    const [expandedModules, setExpandedModules] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load roles from backend (includes custom roles from Role Management)
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await apiClient.get('/roles');
                const allRoles = res.data
                    .filter(r => r.id !== 'super_admin')
                    .map(r => ({ id: r.id || r.name, label: r.display_name || r.name }));
                if (allRoles.length > 0) setRoles(allRoles);
            } catch {
                // Keep static fallback
            }
        };
        fetchRoles();
    }, []);

    useEffect(() => {
        loadRolePermissions(selectedRole);
    }, [selectedRole]);

    const loadRolePermissions = async (role) => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/roles/${role}/permissions`);
            if (res.data && Object.keys(res.data).length > 0) {
                setPermissions(res.data);
            } else {
                // Use defaults if no saved permissions
                setPermissions(getDefaultPermissions(role));
            }
        } catch (error) {
            // Use defaults on error
            setPermissions(getDefaultPermissions(role));
        } finally {
            setLoading(false);
            setHasChanges(false);
        }
    };

    const handleModuleToggle = (moduleId, enabled) => {
        setPermissions(prev => {
            const module = MODULE_HIERARCHY.find(m => m.id === moduleId);
            const newSubPages = {};
            module.subPages.forEach(sp => {
                newSubPages[sp.id] = enabled ? 'view' : 'none';
            });
            
            return {
                ...prev,
                [moduleId]: {
                    ...prev[moduleId],
                    enabled,
                    level: enabled ? 'view' : 'none',
                    subPages: newSubPages
                }
            };
        });
        setHasChanges(true);
    };

    const handlePermissionChange = (moduleId, subPageId, level) => {
        setPermissions(prev => {
            if (subPageId) {
                // Sub-page permission change
                return {
                    ...prev,
                    [moduleId]: {
                        ...prev[moduleId],
                        subPages: {
                            ...prev[moduleId]?.subPages,
                            [subPageId]: level
                        }
                    }
                };
            } else {
                // Module-level permission change - apply to all subpages
                const module = MODULE_HIERARCHY.find(m => m.id === moduleId);
                const newSubPages = {};
                module.subPages.forEach(sp => {
                    newSubPages[sp.id] = level;
                });
                
                return {
                    ...prev,
                    [moduleId]: {
                        ...prev[moduleId],
                        level,
                        subPages: newSubPages
                    }
                };
            }
        });
        setHasChanges(true);
    };

    const handleToggleExpand = (moduleId) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleId]: !prev[moduleId]
        }));
    };

    const expandAll = () => {
        const expanded = {};
        MODULE_HIERARCHY.forEach(m => expanded[m.id] = true);
        setExpandedModules(expanded);
    };

    const collapseAll = () => {
        setExpandedModules({});
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.put(`/roles/${selectedRole}/permissions`, permissions);
            toast.success(`Permissions saved for ${roles.find(r => r.id === selectedRole)?.label || selectedRole}`);
            setHasChanges(false);
        } catch (error) {
            toast.error('Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setPermissions(getDefaultPermissions(selectedRole));
        setHasChanges(true);
        toast.info('Reset to default permissions');
    };

    if (user?.role !== 'super_admin') {
        return (
            <div className="flex items-center justify-center h-64">
                <Card className="p-6 text-center">
                    <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold">Access Denied</h2>
                    <p className="text-muted-foreground">Only Super Admin can access this page</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="access-control-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Shield className="h-8 w-8 text-primary" />
                        Access Control
                    </h1>
                    <p className="text-muted-foreground">
                        Configure granular permissions for each role at module and page level
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Default
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving || !hasChanges}
                        className={hasChanges ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Role Selector */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label>Configure permissions for:</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger className="w-[200px]" data-testid="role-selector">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={expandAll}>
                                Expand All
                            </Button>
                            <Button variant="ghost" size="sm" onClick={collapseAll}>
                                Collapse All
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Permission Legend */}
            <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Permission Levels:</span>
                {PERMISSION_LEVELS.map((level) => (
                    <div key={level.id} className="flex items-center gap-1">
                        <div className={`px-2 py-0.5 rounded text-xs ${level.color}`}>
                            {level.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Module Cards */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {MODULE_HIERARCHY.map((module) => (
                        <ModuleCard
                            key={module.id}
                            module={module}
                            permissions={permissions}
                            onPermissionChange={handlePermissionChange}
                            onModuleToggle={handleModuleToggle}
                            isExpanded={expandedModules[module.id]}
                            onToggleExpand={() => handleToggleExpand(module.id)}
                        />
                    ))}
                </div>
            )}

            {/* Sticky Save Button for Mobile */}
            {hasChanges && (
                <div className="fixed bottom-4 right-4 md:hidden">
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        size="lg"
                        className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                    </Button>
                </div>
            )}
        </div>
    );
}

export default AccessControlPage;

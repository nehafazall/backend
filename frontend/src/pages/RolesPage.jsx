import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Plus,
    Edit,
    Trash2,
    Shield,
    Eye,
    EyeOff,
    Pencil,
    Check,
    X,
    Users,
    Database,
    Settings,
    Lock,
} from 'lucide-react';

// Modules available in the system
const MODULES = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'sales_crm', label: 'Sales CRM', icon: '💼' },
    { id: 'customer_service', label: 'Customer Service', icon: '🎧' },
    { id: 'mentor', label: 'Mentor Dashboard', icon: '👨‍🏫' },
    { id: 'finance', label: 'Finance', icon: '💰' },
    { id: 'user_management', label: 'User Management', icon: '👥' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'reports', label: 'Reports & Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'audit_logs', label: 'Audit Logs', icon: '📋' },
    { id: 'qc_dashboard', label: 'QC Dashboard', icon: '✅' },
];

// Permission levels
const PERMISSION_LEVELS = [
    { id: 'none', label: 'No Access', color: 'bg-slate-500' },
    { id: 'view', label: 'View Only', color: 'bg-blue-500' },
    { id: 'edit', label: 'Edit', color: 'bg-amber-500' },
    { id: 'full', label: 'Full Access', color: 'bg-emerald-500' },
];

// Specific actions per module
const MODULE_ACTIONS = {
    sales_crm: [
        { id: 'create_lead', label: 'Create Leads' },
        { id: 'edit_lead', label: 'Edit Leads' },
        { id: 'delete_lead', label: 'Delete Leads' },
        { id: 'assign_lead', label: 'Assign Leads' },
        { id: 'import_leads', label: 'Import Leads' },
        { id: 'export_leads', label: 'Export Leads' },
        { id: 'view_all_leads', label: 'View All Leads (not just assigned)' },
    ],
    customer_service: [
        { id: 'create_student', label: 'Create Students' },
        { id: 'edit_student', label: 'Edit Students' },
        { id: 'delete_student', label: 'Delete Students' },
        { id: 'manage_payments', label: 'Manage Payments' },
        { id: 'view_all_students', label: 'View All Students' },
    ],
    mentor: [
        { id: 'manage_sessions', label: 'Manage Sessions' },
        { id: 'grade_students', label: 'Grade Students' },
        { id: 'view_all_mentees', label: 'View All Mentees' },
    ],
    finance: [
        { id: 'view_payments', label: 'View Payments' },
        { id: 'process_refunds', label: 'Process Refunds' },
        { id: 'manage_commissions', label: 'Manage Commissions' },
        { id: 'export_finance', label: 'Export Financial Data' },
    ],
    user_management: [
        { id: 'create_user', label: 'Create Users' },
        { id: 'edit_user', label: 'Edit Users' },
        { id: 'delete_user', label: 'Delete Users' },
        { id: 'manage_roles', label: 'Manage Roles' },
        { id: 'reset_passwords', label: 'Reset Passwords' },
    ],
    courses: [
        { id: 'create_course', label: 'Create Courses' },
        { id: 'edit_course', label: 'Edit Courses' },
        { id: 'delete_course', label: 'Delete Courses' },
        { id: 'manage_batches', label: 'Manage Batches' },
    ],
    reports: [
        { id: 'view_sales_reports', label: 'View Sales Reports' },
        { id: 'view_cs_reports', label: 'View CS Reports' },
        { id: 'view_finance_reports', label: 'View Finance Reports' },
        { id: 'export_reports', label: 'Export Reports' },
    ],
    settings: [
        { id: 'manage_system_settings', label: 'Manage System Settings' },
        { id: 'manage_integrations', label: 'Manage Integrations' },
    ],
    audit_logs: [
        { id: 'view_all_logs', label: 'View All Audit Logs' },
        { id: 'export_logs', label: 'Export Logs' },
    ],
    qc_dashboard: [
        { id: 'review_calls', label: 'Review Calls' },
        { id: 'add_recordings', label: 'Add Recordings' },
    ],
};

// Data visibility options
const DATA_VISIBILITY = [
    { id: 'own', label: 'Own Data Only', description: 'Can only see records assigned to them' },
    { id: 'team', label: 'Team Data', description: 'Can see all records from their team/department' },
    { id: 'all', label: 'All Data', description: 'Can see all records in the system' },
];

const RolesPage = () => {
    const { user: currentUser } = useAuth();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        display_name: '',
        description: '',
        color: 'bg-blue-500',
        is_system_role: false,
        module_permissions: {},
        action_permissions: {},
        data_visibility: 'own',
    });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const response = await api.get('/roles');
            setRoles(response.data);
        } catch (error) {
            // Initialize with default system roles if none exist
            setRoles(getDefaultRoles());
        } finally {
            setLoading(false);
        }
    };

    const getDefaultRoles = () => [
        { id: 'super_admin', name: 'super_admin', display_name: 'Super Admin', is_system_role: true, color: 'bg-purple-500', data_visibility: 'all' },
        { id: 'admin', name: 'admin', display_name: 'Admin', is_system_role: true, color: 'bg-blue-500', data_visibility: 'all' },
        { id: 'sales_manager', name: 'sales_manager', display_name: 'Sales Manager', is_system_role: true, color: 'bg-green-500', data_visibility: 'team' },
        { id: 'team_leader', name: 'team_leader', display_name: 'Team Leader', is_system_role: true, color: 'bg-cyan-500', data_visibility: 'team' },
        { id: 'sales_executive', name: 'sales_executive', display_name: 'Sales Executive', is_system_role: true, color: 'bg-yellow-500', data_visibility: 'own' },
        { id: 'cs_head', name: 'cs_head', display_name: 'CS Head', is_system_role: true, color: 'bg-pink-500', data_visibility: 'all' },
        { id: 'cs_agent', name: 'cs_agent', display_name: 'CS Agent', is_system_role: true, color: 'bg-indigo-500', data_visibility: 'own' },
        { id: 'mentor', name: 'mentor', display_name: 'Mentor', is_system_role: true, color: 'bg-orange-500', data_visibility: 'own' },
        { id: 'finance', name: 'finance', display_name: 'Finance', is_system_role: true, color: 'bg-emerald-500', data_visibility: 'all' },
        { id: 'hr', name: 'hr', display_name: 'HR', is_system_role: true, color: 'bg-rose-500', data_visibility: 'all' },
    ];

    const handleCreateRole = async (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.display_name) {
            toast.error('Role name and display name are required');
            return;
        }

        // Create role ID from name
        const roleId = formData.name.toLowerCase().replace(/\s+/g, '_');
        
        try {
            const newRole = {
                ...formData,
                id: roleId,
                name: roleId,
                is_system_role: false,
            };
            
            await api.post('/roles', newRole);
            toast.success('Role created successfully');
            setShowCreateModal(false);
            resetForm();
            fetchRoles();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create role');
        }
    };

    const handleUpdateRole = async (e) => {
        e.preventDefault();
        
        if (!selectedRole) return;
        
        try {
            await api.put(`/roles/${selectedRole.id}`, formData);
            toast.success('Role updated successfully');
            setShowEditModal(false);
            setSelectedRole(null);
            resetForm();
            fetchRoles();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update role');
        }
    };

    const handleDeleteRole = async (roleId) => {
        const role = roles.find(r => r.id === roleId);
        if (role?.is_system_role) {
            toast.error('Cannot delete system roles');
            return;
        }

        if (!confirm('Are you sure you want to delete this role? Users with this role will need to be reassigned.')) {
            return;
        }
        
        try {
            await api.delete(`/roles/${roleId}`);
            toast.success('Role deleted successfully');
            fetchRoles();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete role');
        }
    };

    const handleEditRole = (role) => {
        setSelectedRole(role);
        setFormData({
            name: role.name,
            display_name: role.display_name,
            description: role.description || '',
            color: role.color || 'bg-blue-500',
            is_system_role: role.is_system_role,
            module_permissions: role.module_permissions || {},
            action_permissions: role.action_permissions || {},
            data_visibility: role.data_visibility || 'own',
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            display_name: '',
            description: '',
            color: 'bg-blue-500',
            is_system_role: false,
            module_permissions: {},
            action_permissions: {},
            data_visibility: 'own',
        });
    };

    const updateModulePermission = (moduleId, level) => {
        setFormData(prev => ({
            ...prev,
            module_permissions: {
                ...prev.module_permissions,
                [moduleId]: level,
            },
        }));
    };

    const updateActionPermission = (moduleId, actionId, allowed) => {
        setFormData(prev => ({
            ...prev,
            action_permissions: {
                ...prev.action_permissions,
                [moduleId]: {
                    ...(prev.action_permissions[moduleId] || {}),
                    [actionId]: allowed,
                },
            },
        }));
    };

    const getPermissionBadge = (level) => {
        const config = PERMISSION_LEVELS.find(p => p.id === level);
        if (!config) return null;
        return (
            <Badge className={`${config.color} text-white text-xs`}>
                {config.label}
            </Badge>
        );
    };

    const colorOptions = [
        'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-cyan-500',
        'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
        'bg-emerald-500', 'bg-rose-500', 'bg-teal-500', 'bg-amber-500',
    ];

    // Role form content (shared between create and edit)
    const RoleFormContent = ({ onSubmit, submitLabel }) => (
        <form onSubmit={onSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="modules">Module Access</TabsTrigger>
                    <TabsTrigger value="actions">Actions & Data</TabsTrigger>
                </TabsList>
                
                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Role Name (ID) *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., quality_analyst"
                                disabled={formData.is_system_role}
                                data-testid="role-name-input"
                            />
                            <p className="text-xs text-muted-foreground">Lowercase, underscores allowed</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Display Name *</Label>
                            <Input
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="e.g., Quality Analyst"
                                data-testid="role-display-name-input"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of this role's responsibilities"
                            data-testid="role-description-input"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Role Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {colorOptions.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`w-8 h-8 rounded-full ${color} ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Data Visibility</Label>
                        <div className="space-y-2">
                            {DATA_VISIBILITY.map((option) => (
                                <div
                                    key={option.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                        formData.data_visibility === option.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                    }`}
                                    onClick={() => setFormData({ ...formData, data_visibility: option.id })}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                            formData.data_visibility === option.id ? 'border-primary' : 'border-muted-foreground'
                                        }`}>
                                            {formData.data_visibility === option.id && (
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <span className="font-medium">{option.label}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 ml-6">{option.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>
                
                {/* Module Access Tab */}
                <TabsContent value="modules" className="mt-4">
                    <ScrollArea className="h-[350px] pr-4">
                        <div className="space-y-3">
                            {MODULES.map((module) => (
                                <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{module.icon}</span>
                                        <span className="font-medium">{module.label}</span>
                                    </div>
                                    <Select
                                        value={formData.module_permissions[module.id] || 'none'}
                                        onValueChange={(value) => updateModulePermission(module.id, value)}
                                    >
                                        <SelectTrigger className="w-36">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper" className="z-[9999]">
                                            {PERMISSION_LEVELS.map((level) => (
                                                <SelectItem key={level.id} value={level.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${level.color}`} />
                                                        {level.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>
                
                {/* Actions Tab */}
                <TabsContent value="actions" className="mt-4">
                    <ScrollArea className="h-[350px] pr-4">
                        <div className="space-y-6">
                            {MODULES.filter(m => MODULE_ACTIONS[m.id]).map((module) => {
                                const modulePermission = formData.module_permissions[module.id];
                                const isModuleEnabled = modulePermission && modulePermission !== 'none';
                                
                                return (
                                    <div key={module.id} className={`space-y-3 ${!isModuleEnabled ? 'opacity-50' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{module.icon}</span>
                                            <h4 className="font-semibold">{module.label}</h4>
                                            {!isModuleEnabled && (
                                                <Badge variant="secondary" className="text-xs">Module disabled</Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 ml-6">
                                            {MODULE_ACTIONS[module.id].map((action) => (
                                                <div key={action.id} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`${module.id}_${action.id}`}
                                                        checked={formData.action_permissions[module.id]?.[action.id] || false}
                                                        onCheckedChange={(checked) => updateActionPermission(module.id, action.id, checked)}
                                                        disabled={!isModuleEnabled}
                                                    />
                                                    <Label 
                                                        htmlFor={`${module.id}_${action.id}`}
                                                        className="text-sm cursor-pointer"
                                                    >
                                                        {action.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        <Separator />
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
            
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                }}>
                    Cancel
                </Button>
                <Button type="submit" data-testid="submit-role-btn">
                    {submitLabel}
                </Button>
            </DialogFooter>
        </form>
    );

    if (currentUser?.role !== 'super_admin') {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                        <p className="text-muted-foreground">
                            Only Super Admins can manage roles and permissions.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="roles-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
                    <p className="text-muted-foreground">Create and manage custom roles with granular permissions</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} data-testid="create-role-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                </Button>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-700 dark:text-blue-300">Advanced Role Configuration</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Define module access levels, specific action permissions, and data visibility rules for each role.
                                System roles (marked with a lock) cannot be deleted but can be customized.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Roles Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((role) => (
                        <Card key={role.id} className="relative" data-testid={`role-card-${role.id}`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full ${role.color || 'bg-blue-500'} flex items-center justify-center text-white font-bold`}>
                                            {role.display_name?.charAt(0) || 'R'}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {role.display_name}
                                                {role.is_system_role && (
                                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                                )}
                                            </CardTitle>
                                            <CardDescription className="text-xs font-mono">
                                                {role.name}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {role.description && (
                                    <p className="text-sm text-muted-foreground">{role.description}</p>
                                )}
                                
                                <div className="flex items-center gap-2">
                                    <Database className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                        {DATA_VISIBILITY.find(d => d.id === role.data_visibility)?.label || 'Own Data Only'}
                                    </span>
                                </div>
                                
                                <Separator />
                                
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditRole(role)}
                                        data-testid={`edit-role-${role.id}`}
                                    >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                    {!role.is_system_role && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDeleteRole(role.id)}
                                            data-testid={`delete-role-${role.id}`}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Role Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-visible">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Create New Role
                        </DialogTitle>
                        <DialogDescription>
                            Define a new role with custom permissions
                        </DialogDescription>
                    </DialogHeader>
                    <RoleFormContent onSubmit={handleCreateRole} submitLabel="Create Role" />
                </DialogContent>
            </Dialog>

            {/* Edit Role Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-visible">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5" />
                            Edit Role: {selectedRole?.display_name}
                        </DialogTitle>
                        <DialogDescription>
                            Modify role permissions and settings
                        </DialogDescription>
                    </DialogHeader>
                    <RoleFormContent onSubmit={handleUpdateRole} submitLabel="Save Changes" />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RolesPage;

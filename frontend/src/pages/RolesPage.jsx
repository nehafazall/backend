import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Edit, Trash2, Shield, Lock, Database } from 'lucide-react';

const MODULES = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'sales_crm', label: 'Sales CRM' },
    { id: 'customer_service', label: 'Customer Service' },
    { id: 'mentor', label: 'Mentor Dashboard' },
    { id: 'finance', label: 'Finance' },
    { id: 'user_management', label: 'User Management' },
    { id: 'courses', label: 'Courses' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
    { id: 'audit_logs', label: 'Audit Logs' },
    { id: 'qc_dashboard', label: 'QC Dashboard' },
];

const PERMISSION_LEVELS = [
    { id: 'none', label: 'No Access', color: 'bg-slate-500' },
    { id: 'view', label: 'View Only', color: 'bg-blue-500' },
    { id: 'edit', label: 'Edit', color: 'bg-amber-500' },
    { id: 'full', label: 'Full Access', color: 'bg-emerald-500' },
];

const DATA_VISIBILITY = [
    { id: 'own', label: 'Own Data Only' },
    { id: 'team', label: 'Team Data' },
    { id: 'all', label: 'All Data' },
];

const COLOR_OPTIONS = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-cyan-500',
    'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
    'bg-emerald-500', 'bg-rose-500', 'bg-teal-500', 'bg-amber-500',
];

const DEFAULT_SYSTEM_ROLES = [
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

function ModulePermissionRow({ module, value, onChange }) {
    return (
        <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">{module.label}</span>
            <Select value={value || 'none'} onValueChange={onChange}>
                <SelectTrigger className="w-36">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                    {PERMISSION_LEVELS.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                            {level.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function RoleCard({ role, onEdit, onDelete }) {
    const visibilityLabel = DATA_VISIBILITY.find(d => d.id === role.data_visibility)?.label || 'Own Data Only';
    
    return (
        <Card data-testid={`role-card-${role.id}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${role.color || 'bg-blue-500'} flex items-center justify-center text-white font-bold`}>
                        {role.display_name?.charAt(0) || 'R'}
                    </div>
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {role.display_name}
                            {role.is_system_role && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono">{role.name}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{visibilityLabel}</span>
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(role)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    {!role.is_system_role && (
                        <Button variant="outline" size="sm" className="text-red-500" onClick={() => onDelete(role.id)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

const RolesPage = () => {
    const { user: currentUser } = useAuth();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [formData, setFormData] = useState({
        name: '', display_name: '', description: '', color: 'bg-blue-500',
        module_permissions: {}, data_visibility: 'own',
    });

    useEffect(() => { fetchRoles(); }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const response = await api.get('/roles');
            setRoles(response.data);
        } catch (error) {
            setRoles(DEFAULT_SYSTEM_ROLES);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', display_name: '', description: '', color: 'bg-blue-500', module_permissions: {}, data_visibility: 'own' });
    };

    const openCreate = () => { resetForm(); setEditMode(false); setSelectedRole(null); setShowModal(true); };
    
    const openEdit = (role) => {
        setSelectedRole(role);
        setFormData({
            name: role.name, display_name: role.display_name, description: role.description || '',
            color: role.color || 'bg-blue-500', module_permissions: role.module_permissions || {},
            data_visibility: role.data_visibility || 'own',
        });
        setEditMode(true);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.display_name) { toast.error('Name and display name required'); return; }
        
        try {
            if (editMode && selectedRole) {
                await api.put(`/roles/${selectedRole.id}`, formData);
                toast.success('Role updated');
            } else {
                const roleId = formData.name.toLowerCase().replace(/\s+/g, '_');
                await api.post('/roles', { ...formData, id: roleId, name: roleId });
                toast.success('Role created');
            }
            setShowModal(false);
            resetForm();
            fetchRoles();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save role');
        }
    };

    const handleDelete = async (roleId) => {
        if (!confirm('Delete this role?')) return;
        try {
            await api.delete(`/roles/${roleId}`);
            toast.success('Role deleted');
            fetchRoles();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Cannot delete role');
        }
    };

    if (currentUser?.role !== 'super_admin') {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
                        <p className="text-muted-foreground">Only Super Admins can manage roles.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="roles-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
                    <p className="text-muted-foreground">Create and manage custom roles with permissions</p>
                </div>
                <Button onClick={openCreate} data-testid="create-role-btn">
                    <Plus className="h-4 w-4 mr-2" /> Create Role
                </Button>
            </div>

            <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-700 dark:text-blue-300">Role Configuration</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Define module access levels and data visibility for each role. System roles cannot be deleted.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((role) => (
                        <RoleCard key={role.id} role={role} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-visible">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {editMode ? `Edit Role: ${selectedRole?.display_name}` : 'Create New Role'}
                        </DialogTitle>
                        <DialogDescription>
                            {editMode ? 'Modify role permissions' : 'Define a new role with custom permissions'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                                <TabsTrigger value="modules">Module Access</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="basic" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Role Name (ID) *</Label>
                                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., quality_analyst" disabled={formData.is_system_role || editMode} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Display Name *</Label>
                                        <Input value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                            placeholder="e.g., Quality Analyst" />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description" />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Role Color</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLOR_OPTIONS.map((color) => (
                                            <button key={color} type="button"
                                                className={`w-8 h-8 rounded-full ${color} ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                                                onClick={() => setFormData({ ...formData, color })} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Data Visibility</Label>
                                    <Select value={formData.data_visibility} onValueChange={(v) => setFormData({ ...formData, data_visibility: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent position="popper" className="z-[9999]">
                                            {DATA_VISIBILITY.map((opt) => (
                                                <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="modules" className="mt-4">
                                <ScrollArea className="h-[300px] pr-4">
                                    <div className="space-y-3">
                                        {MODULES.map((module) => (
                                            <ModulePermissionRow
                                                key={module.id}
                                                module={module}
                                                value={formData.module_permissions[module.id]}
                                                onChange={(val) => setFormData(prev => ({
                                                    ...prev,
                                                    module_permissions: { ...prev.module_permissions, [module.id]: val }
                                                }))}
                                            />
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button type="submit">{editMode ? 'Save Changes' : 'Create Role'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RolesPage;

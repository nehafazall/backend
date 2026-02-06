import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Shield, Save, RefreshCw, Eye, Edit, Lock, Check } from 'lucide-react';

const ROLES = [
    { id: 'admin', label: 'Admin' },
    { id: 'sales_manager', label: 'Sales Manager' },
    { id: 'team_leader', label: 'Team Leader' },
    { id: 'sales_executive', label: 'Sales Executive' },
    { id: 'cs_head', label: 'CS Head' },
    { id: 'cs_agent', label: 'CS Agent' },
    { id: 'mentor', label: 'Mentor' },
    { id: 'academic_master', label: 'Academic Master' },
    { id: 'finance', label: 'Finance' },
    { id: 'hr', label: 'HR' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'operations', label: 'Operations' },
    { id: 'quality_control', label: 'Quality Control' },
];

const MODULES = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'sales_crm', label: 'Sales CRM' },
    { id: 'customer_service', label: 'Customer Service' },
    { id: 'mentor_crm', label: 'Mentor CRM' },
    { id: 'finance', label: 'Finance' },
    { id: 'user_management', label: 'User Management' },
    { id: 'department_management', label: 'Department Management' },
    { id: 'course_management', label: 'Course Management' },
    { id: 'commission_engine', label: 'Commission Engine' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
];

const PERMISSION_LEVELS = [
    { id: 'none', label: 'None', icon: Lock, color: 'text-gray-400' },
    { id: 'view', label: 'View', icon: Eye, color: 'text-blue-500' },
    { id: 'edit', label: 'Edit', icon: Edit, color: 'text-yellow-500' },
    { id: 'full', label: 'Full', icon: Check, color: 'text-emerald-500' },
];

const getDefaultPermissions = (role) => {
    const permissions = {};
    MODULES.forEach(m => permissions[m.id] = 'none');
    
    if (role === 'admin') {
        MODULES.forEach(m => permissions[m.id] = 'full');
        permissions['settings'] = 'edit';
    } else if (role === 'sales_manager' || role === 'team_leader') {
        permissions['dashboard'] = 'view';
        permissions['sales_crm'] = 'full';
        permissions['reports'] = 'view';
        permissions['settings'] = 'view';
    } else if (role === 'sales_executive') {
        permissions['dashboard'] = 'view';
        permissions['sales_crm'] = 'edit';
        permissions['settings'] = 'view';
    } else if (role === 'cs_head') {
        permissions['dashboard'] = 'view';
        permissions['customer_service'] = 'full';
        permissions['reports'] = 'view';
        permissions['settings'] = 'view';
    } else if (role === 'cs_agent') {
        permissions['dashboard'] = 'view';
        permissions['customer_service'] = 'edit';
        permissions['settings'] = 'view';
    } else if (role === 'mentor' || role === 'academic_master') {
        permissions['dashboard'] = 'view';
        permissions['mentor_crm'] = 'edit';
        permissions['settings'] = 'view';
    } else if (role === 'finance') {
        permissions['dashboard'] = 'view';
        permissions['finance'] = 'full';
        permissions['reports'] = 'view';
        permissions['commission_engine'] = 'view';
        permissions['settings'] = 'view';
    } else if (role === 'hr') {
        permissions['dashboard'] = 'view';
        permissions['user_management'] = 'edit';
        permissions['department_management'] = 'view';
        permissions['settings'] = 'view';
    }
    
    return permissions;
};

const AccessControlPage = () => {
    const { user } = useAuth();
    const [selectedRole, setSelectedRole] = useState('sales_executive');
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadRolePermissions(selectedRole);
    }, [selectedRole]);

    const loadRolePermissions = (role) => {
        const defaultPerms = getDefaultPermissions(role);
        setPermissions(defaultPerms);
        setHasChanges(false);
    };

    const handlePermissionChange = (module, level) => {
        setPermissions(prev => ({
            ...prev,
            [module]: level
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            // Update all users with this role
            const usersRes = await apiClient.get(`/users?role=${selectedRole}`);
            const users = usersRes.data;
            
            for (const u of users) {
                await apiClient.put(`/users/${u.id}`, { permissions });
            }
            
            toast.success(`Permissions updated for ${users.length} ${selectedRole} users`);
            setHasChanges(false);
        } catch (error) {
            toast.error('Failed to update permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        loadRolePermissions(selectedRole);
        toast.info('Permissions reset to defaults');
    };

    const PermissionBadge = ({ level }) => {
        const config = PERMISSION_LEVELS.find(p => p.id === level) || PERMISSION_LEVELS[0];
        const Icon = config.icon;
        return (
            <Badge variant="outline" className={`${config.color} gap-1`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    if (user?.role !== 'super_admin') {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                        <p className="text-muted-foreground">
                            Only Super Admins can manage access control settings.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="access-control-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
                    <p className="text-muted-foreground">
                        Configure module permissions for each role
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleReset}
                        disabled={!hasChanges}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                    </Button>
                    <Button 
                        onClick={handleSave}
                        disabled={!hasChanges || loading}
                        data-testid="save-permissions-btn"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Role Selector */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Role Permissions Matrix
                            </CardTitle>
                            <CardDescription>
                                Select a role to view and modify its permissions
                            </CardDescription>
                        </div>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLES.map(role => (
                                    <SelectItem key={role.id} value={role.id}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[200px]">Module</TableHead>
                                    <TableHead className="text-center">None</TableHead>
                                    <TableHead className="text-center">View</TableHead>
                                    <TableHead className="text-center">Edit</TableHead>
                                    <TableHead className="text-center">Full</TableHead>
                                    <TableHead className="text-center w-[100px]">Current</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MODULES.map(module => (
                                    <TableRow key={module.id}>
                                        <TableCell className="font-medium">{module.label}</TableCell>
                                        {PERMISSION_LEVELS.map(level => (
                                            <TableCell key={level.id} className="text-center">
                                                <button
                                                    onClick={() => handlePermissionChange(module.id, level.id)}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                        permissions[module.id] === level.id
                                                            ? 'bg-primary text-primary-foreground scale-110'
                                                            : 'hover:bg-muted'
                                                    }`}
                                                    data-testid={`perm-${module.id}-${level.id}`}
                                                >
                                                    {permissions[module.id] === level.id && (
                                                        <Check className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-center">
                                            <PermissionBadge level={permissions[module.id]} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Legend */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Permission Levels</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {PERMISSION_LEVELS.map(level => {
                            const Icon = level.icon;
                            return (
                                <div key={level.id} className="flex items-center gap-2">
                                    <Icon className={`h-5 w-5 ${level.color}`} />
                                    <div>
                                        <p className="font-medium">{level.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {level.id === 'none' && 'No access to module'}
                                            {level.id === 'view' && 'Can view data only'}
                                            {level.id === 'edit' && 'Can view and modify'}
                                            {level.id === 'full' && 'Full access + delete'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Super Admin Note */}
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                <strong>Note:</strong> Super Admin role always has full access to all modules and cannot be modified. 
                Changes made here will apply to all existing and future users with the selected role.
            </div>
        </div>
    );
};

export default AccessControlPage;

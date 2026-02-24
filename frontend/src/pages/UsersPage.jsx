import React, { useState, useEffect } from 'react';
import api, { useAuth, userApi } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Monitor,
    FlaskConical,
} from 'lucide-react';
import ImportButton from '@/components/ImportButton';

const ROLES = [
    { id: 'super_admin', label: 'Super Admin', color: 'bg-purple-500', entity_access: ['clt', 'miles'] },
    { id: 'admin', label: 'Admin', color: 'bg-blue-500', entity_access: ['clt', 'miles'] },
    { id: 'sales_manager', label: 'Sales Manager', color: 'bg-green-500' },
    { id: 'team_leader', label: 'Team Leader', color: 'bg-cyan-500' },
    { id: 'sales_executive', label: 'Sales Executive', color: 'bg-yellow-500' },
    { id: 'cs_head', label: 'CS Head', color: 'bg-pink-500' },
    { id: 'cs_agent', label: 'CS Agent', color: 'bg-indigo-500' },
    { id: 'mentor', label: 'Mentor', color: 'bg-orange-500' },
    { id: 'hr', label: 'HR', color: 'bg-rose-500' },
    // Finance-specific roles
    { id: 'finance_manager', label: 'Finance Manager', color: 'bg-emerald-600', entity_access: ['clt', 'miles'], description: 'Both CLT & MILES' },
    { id: 'finance_admin', label: 'Finance Admin', color: 'bg-teal-500', entity_access: ['miles'], description: 'MILES only' },
    { id: 'finance_treasurer', label: 'Finance Treasurer', color: 'bg-cyan-600', entity_access: ['miles'], description: 'MILES only' },
    { id: 'finance_verifier', label: 'Finance Verifier', color: 'bg-sky-500', entity_access: ['miles'], description: 'MILES only' },
    { id: 'financier', label: 'Financier', color: 'bg-blue-600', entity_access: ['miles'], description: 'MILES only' },
    { id: 'accounts', label: 'Accounts', color: 'bg-green-600', entity_access: ['clt'], description: 'CLT only' },
    { id: 'finance', label: 'Finance (Legacy)', color: 'bg-emerald-500', entity_access: ['clt', 'miles'] },
];

const FINANCE_ROLES = ['finance_manager', 'finance_admin', 'finance_treasurer', 'finance_verifier', 'financier', 'accounts', 'finance'];

// Finance module permission definitions
const FINANCE_MODULES = [
    { id: 'clt_payables', label: 'CLT Payables', entity: 'clt', group: 'CLT Academy' },
    { id: 'clt_receivables', label: 'CLT Receivables', entity: 'clt', group: 'CLT Academy' },
    { id: 'miles_deposits', label: 'Miles Deposits', entity: 'miles', group: 'Miles Capitals' },
    { id: 'miles_withdrawals', label: 'Miles Withdrawals', entity: 'miles', group: 'Miles Capitals' },
    { id: 'miles_expenses', label: 'Miles Expenses', entity: 'miles', group: 'Miles Capitals' },
    { id: 'miles_operating_profit', label: 'Operating Profit', entity: 'miles', group: 'Miles Capitals' },
    { id: 'treasury_balances', label: 'Treasury Balances', entity: 'both', group: 'Treasury' },
    { id: 'treasury_settlements', label: 'Treasury Settlements', entity: 'both', group: 'Treasury' },
    { id: 'budgeting', label: 'Budgeting', entity: 'both', group: 'Budgeting' },
    { id: 'overall_pnl', label: 'Overall PNL', entity: 'both', group: 'Reports' },
    { id: 'data_management', label: 'Data Management', entity: 'both', group: 'Data' },
];

// Default finance permissions (all access)
const DEFAULT_FINANCE_PERMISSIONS = FINANCE_MODULES.reduce((acc, mod) => {
    acc[mod.id] = { view: true, edit: true, delete: false };
    return acc;
}, {});

const DEPARTMENTS = [
    'Sales',
    'Customer Service',
    'Mentorship',
    'Finance',
    'HR',
    'Marketing',
    'Operations',
    'Management',
];

const REGIONS = ['UAE', 'India', 'International'];

const UsersPage = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: '',
        department: '',
        phone: '',
        region: '',
        team_id: '',
        is_active: true,
        environment_access: [],
        entity_access: [],
        create_employee_record: true,
        designation: '',
        joining_date: new Date().toISOString().split('T')[0],
        threecx_extension: '',
        finance_permissions: {},
    });

    // Update entity_access and finance_permissions when role changes
    const handleRoleChange = (role) => {
        const roleData = ROLES.find(r => r.id === role);
        const isFinanceRole = FINANCE_ROLES.includes(role);
        setFormData({
            ...formData,
            role,
            entity_access: roleData?.entity_access || [],
            department: isFinanceRole ? 'Finance' : formData.department,
            finance_permissions: isFinanceRole ? DEFAULT_FINANCE_PERMISSIONS : {}
        });
    };

    // Handle finance permission toggle
    const handleFinancePermissionChange = (moduleId, permission, checked) => {
        setFormData(prev => ({
            ...prev,
            finance_permissions: {
                ...prev.finance_permissions,
                [moduleId]: {
                    ...(prev.finance_permissions[moduleId] || { view: false, edit: false, delete: false }),
                    [permission]: checked
                }
            }
        }));
    };

    // Set all permissions for a module
    const setModuleAccess = (moduleId, accessLevel) => {
        const accessMap = {
            'none': { view: false, edit: false, delete: false },
            'view': { view: true, edit: false, delete: false },
            'edit': { view: true, edit: true, delete: false },
            'full': { view: true, edit: true, delete: true },
        };
        setFormData(prev => ({
            ...prev,
            finance_permissions: {
                ...prev.finance_permissions,
                [moduleId]: accessMap[accessLevel]
            }
        }));
    };

    useEffect(() => {
        fetchUsers();
        fetchTeams();
    }, [roleFilter]);

    const fetchTeams = async () => {
        try {
            const response = await api.get('/teams');
            setTeams(response.data);
        } catch (error) {
            console.error('Failed to fetch teams', error);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (roleFilter && roleFilter !== 'all') params.role = roleFilter;
            const response = await userApi.getAll(params);
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to fetch users');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        
        if (!formData.email || !formData.password || !formData.full_name || !formData.role) {
            toast.error('Please fill all required fields');
            return;
        }
        
        try {
            await userApi.create(formData);
            toast.success(formData.create_employee_record 
                ? 'User created with employee record' 
                : 'User created successfully');
            setShowCreateModal(false);
            setFormData({
                email: '',
                password: '',
                full_name: '',
                role: '',
                department: '',
                phone: '',
                region: '',
                is_active: true,
                environment_access: [],
                entity_access: [],
                create_employee_record: true,
                designation: '',
                joining_date: new Date().toISOString().split('T')[0],
                threecx_extension: '',
                finance_permissions: {},
            });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create user');
        }
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        const isFinanceRole = FINANCE_ROLES.includes(user.role);
        setFormData({
            email: user.email,
            password: '',
            full_name: user.full_name,
            role: user.role,
            department: user.department || '',
            phone: user.phone || '',
            region: user.region || '',
            is_active: user.is_active,
            environment_access: user.environment_access || [],
            entity_access: user.entity_access || [],
            threecx_extension: user.threecx_extension || '',
            finance_permissions: user.finance_permissions || (isFinanceRole ? DEFAULT_FINANCE_PERMISSIONS : {}),
        });
        setShowEditModal(true);
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        
        if (!selectedUser) return;
        
        try {
            const updateData = { ...formData };
            if (!updateData.password) delete updateData.password;
            
            await userApi.update(selectedUser.id, updateData);
            toast.success('User updated successfully');
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update user');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        try {
            await userApi.delete(userId);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete user');
        }
    };

    const handleToggleActive = async (user) => {
        try {
            await userApi.update(user.id, { is_active: !user.is_active });
            toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
            fetchUsers();
        } catch (error) {
            toast.error('Failed to update user status');
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadge = (role) => {
        const roleConfig = ROLES.find(r => r.id === role);
        return roleConfig ? (
            <Badge className={`${roleConfig.color} text-white`}>
                {roleConfig.label}
            </Badge>
        ) : (
            <Badge variant="secondary">{role}</Badge>
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-AE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="space-y-6" data-testid="users-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage system users and roles</p>
                </div>
                <div className="flex gap-2">
                    <ImportButton type="users" onSuccess={fetchUsers} />
                    <Button onClick={() => setShowCreateModal(true)} data-testid="create-user-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                                data-testid="search-users"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-48" data-testid="role-filter">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                {ROLES.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Team</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>3CX Ext</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                                        {user.full_name?.charAt(0)}
                                                    </div>
                                                    <span className="font-medium">{user.full_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                                            <TableCell>
                                                {user.team_id ? (
                                                    <Badge variant="outline">
                                                        {teams.find(t => t.id === user.team_id)?.name || 'Unknown'}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{user.department || '-'}</TableCell>
                                            <TableCell>
                                                {user.threecx_extension ? (
                                                    <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30 text-orange-400">
                                                        {user.threecx_extension}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.is_active ? (
                                                    <Badge className="bg-emerald-500 text-white">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDate(user.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" data-testid={`user-actions-${user.id}`}>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                                            {user.is_active ? (
                                                                <>
                                                                    <UserX className="h-4 w-4 mr-2" />
                                                                    Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                                    Activate
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        {currentUser?.role === 'super_admin' && (
                                                            <DropdownMenuItem 
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="text-red-500"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create User Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg overflow-visible">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Add a new user to the system
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="John Doe"
                                    data-testid="user-name-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@clt-academy.com"
                                    data-testid="user-email-input"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Enter password"
                                data-testid="user-password-input"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select
                                    value={formData.role || undefined}
                                    onValueChange={handleRoleChange}
                                >
                                    <SelectTrigger data-testid="user-role-select">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999] max-h-80">
                                        <div className="p-2 text-xs text-muted-foreground font-medium">General Roles</div>
                                        {ROLES.filter(r => !FINANCE_ROLES.includes(r.id)).map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                        <div className="p-2 text-xs text-muted-foreground font-medium border-t mt-2">Finance Roles</div>
                                        {ROLES.filter(r => FINANCE_ROLES.includes(r.id)).map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{role.label}</span>
                                                    {role.description && (
                                                        <span className="text-xs text-muted-foreground">({role.description})</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select
                                    value={formData.department || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                                >
                                    <SelectTrigger data-testid="user-dept-select">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        {DEPARTMENTS.map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {/* Entity Access for Finance Roles */}
                        {FINANCE_ROLES.includes(formData.role) && (
                            <div className="space-y-3 p-4 border rounded-lg bg-blue-500/10 border-blue-500/30">
                                <Label className="text-sm font-medium">Entity Access</Label>
                                <p className="text-xs text-muted-foreground">
                                    Which financial entities can this user access?
                                </p>
                                <div className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="clt-access"
                                            checked={formData.entity_access?.includes('clt')}
                                            onCheckedChange={(checked) => {
                                                const newAccess = checked 
                                                    ? [...(formData.entity_access || []), 'clt']
                                                    : (formData.entity_access || []).filter(e => e !== 'clt');
                                                setFormData({ ...formData, entity_access: newAccess });
                                            }}
                                        />
                                        <label htmlFor="clt-access" className="text-sm font-medium cursor-pointer">
                                            CLT Academy
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="miles-access"
                                            checked={formData.entity_access?.includes('miles')}
                                            onCheckedChange={(checked) => {
                                                const newAccess = checked 
                                                    ? [...(formData.entity_access || []), 'miles']
                                                    : (formData.entity_access || []).filter(e => e !== 'miles');
                                                setFormData({ ...formData, entity_access: newAccess });
                                            }}
                                        />
                                        <label htmlFor="miles-access" className="text-sm font-medium cursor-pointer">
                                            MILES
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Finance Module Permissions */}
                        {FINANCE_ROLES.includes(formData.role) && (
                            <div className="space-y-4 p-4 border rounded-lg bg-purple-500/10 border-purple-500/30" data-testid="finance-permissions-section">
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                        Module Permissions
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Set View, Edit, Delete access for each finance module
                                    </p>
                                </div>
                                
                                <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                                    {Object.entries(
                                        FINANCE_MODULES.reduce((acc, mod) => {
                                            if (!acc[mod.group]) acc[mod.group] = [];
                                            acc[mod.group].push(mod);
                                            return acc;
                                        }, {})
                                    ).map(([group, modules]) => (
                                        <div key={group} className="space-y-2">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">
                                                {group}
                                            </div>
                                            {modules.map((mod) => {
                                                const perms = formData.finance_permissions?.[mod.id] || { view: false, edit: false, delete: false };
                                                return (
                                                    <div key={mod.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                                                        <span className="text-sm font-medium">{mod.label}</span>
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <Checkbox
                                                                    checked={perms.view}
                                                                    onCheckedChange={(checked) => handleFinancePermissionChange(mod.id, 'view', checked)}
                                                                    data-testid={`perm-${mod.id}-view`}
                                                                />
                                                                <span className="text-xs text-muted-foreground">View</span>
                                                            </label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <Checkbox
                                                                    checked={perms.edit}
                                                                    onCheckedChange={(checked) => handleFinancePermissionChange(mod.id, 'edit', checked)}
                                                                    data-testid={`perm-${mod.id}-edit`}
                                                                />
                                                                <span className="text-xs text-muted-foreground">Edit</span>
                                                            </label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <Checkbox
                                                                    checked={perms.delete}
                                                                    onCheckedChange={(checked) => handleFinancePermissionChange(mod.id, 'delete', checked)}
                                                                    data-testid={`perm-${mod.id}-delete`}
                                                                />
                                                                <span className="text-xs text-red-400">Delete</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Quick Actions */}
                                <div className="flex gap-2 pt-2 border-t border-purple-500/30">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                            const allView = FINANCE_MODULES.reduce((acc, mod) => {
                                                acc[mod.id] = { view: true, edit: false, delete: false };
                                                return acc;
                                            }, {});
                                            setFormData({ ...formData, finance_permissions: allView });
                                        }}
                                    >
                                        View Only (All)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                            const allEdit = FINANCE_MODULES.reduce((acc, mod) => {
                                                acc[mod.id] = { view: true, edit: true, delete: false };
                                                return acc;
                                            }, {});
                                            setFormData({ ...formData, finance_permissions: allEdit });
                                        }}
                                    >
                                        Edit (No Delete)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                            const noAccess = FINANCE_MODULES.reduce((acc, mod) => {
                                                acc[mod.id] = { view: false, edit: false, delete: false };
                                                return acc;
                                            }, {});
                                            setFormData({ ...formData, finance_permissions: noAccess });
                                        }}
                                    >
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+971 50 000 0000"
                                    data-testid="user-phone-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Region</Label>
                                <Select
                                    value={formData.region || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                                >
                                    <SelectTrigger data-testid="user-region-select">
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        {REGIONS.map((region) => (
                                            <SelectItem key={region} value={region}>
                                                {region}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* 3CX Extension for Sales/CS roles */}
                        {['sales_executive', 'team_leader', 'sales_manager', 'cs_head', 'cs_agent'].includes(formData.role) && (
                            <div className="space-y-2 p-4 border rounded-lg bg-orange-500/10 border-orange-500/30">
                                <Label htmlFor="threecx_extension" className="text-sm font-medium flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    3CX Extension
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    PBX extension number for call tracking and click-to-call
                                </p>
                                <Input
                                    id="threecx_extension"
                                    value={formData.threecx_extension}
                                    onChange={(e) => setFormData({ ...formData, threecx_extension: e.target.value })}
                                    placeholder="e.g. 101, 102, 103"
                                    className="mt-2"
                                    data-testid="user-3cx-extension-input"
                                />
                            </div>
                        )}

                        {/* Team Selection */}
                        {['sales_executive', 'team_leader', 'sales_manager'].includes(formData.role) && teams.length > 0 && (
                            <div className="space-y-2">
                                <Label>Team</Label>
                                <Select
                                    value={formData.team_id || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, team_id: value })}
                                >
                                    <SelectTrigger data-testid="user-team-select">
                                        <SelectValue placeholder="Select team" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="">No Team</SelectItem>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name} ({team.department})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Employee Record Sync */}
                        <div className="space-y-3 p-4 border rounded-lg bg-emerald-500/10 border-emerald-500/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-medium">Create Employee Record</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Auto-generate employee record in HR module
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.create_employee_record}
                                    onCheckedChange={(checked) => setFormData({ ...formData, create_employee_record: checked })}
                                    data-testid="create-employee-toggle"
                                />
                            </div>
                            
                            {formData.create_employee_record && (
                                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-emerald-500/30">
                                    <div className="space-y-2">
                                        <Label htmlFor="designation" className="text-xs">Designation</Label>
                                        <Input
                                            id="designation"
                                            value={formData.designation}
                                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                            placeholder="e.g. Sales Executive"
                                            className="h-8 text-sm"
                                            data-testid="user-designation-input"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="joining_date" className="text-xs">Joining Date</Label>
                                        <Input
                                            id="joining_date"
                                            type="date"
                                            value={formData.joining_date}
                                            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                                            className="h-8 text-sm"
                                            data-testid="user-joining-date-input"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {currentUser?.role === 'super_admin' && (
                            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                                <Label className="text-sm font-medium">Environment Access</Label>
                                <p className="text-xs text-muted-foreground">
                                    Grant access to non-production environments
                                </p>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="env_dev"
                                            checked={formData.environment_access?.includes('development')}
                                            onCheckedChange={(checked) => {
                                                const access = formData.environment_access || [];
                                                setFormData({
                                                    ...formData,
                                                    environment_access: checked
                                                        ? [...access, 'development']
                                                        : access.filter(e => e !== 'development')
                                                });
                                            }}
                                            data-testid="env-dev-checkbox"
                                        />
                                        <Label htmlFor="env_dev" className="flex items-center gap-1 text-sm">
                                            <Monitor className="h-4 w-4 text-blue-500" />
                                            Development
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="env_test"
                                            checked={formData.environment_access?.includes('testing')}
                                            onCheckedChange={(checked) => {
                                                const access = formData.environment_access || [];
                                                setFormData({
                                                    ...formData,
                                                    environment_access: checked
                                                        ? [...access, 'testing']
                                                        : access.filter(e => e !== 'testing')
                                                });
                                            }}
                                            data-testid="env-test-checkbox"
                                        />
                                        <Label htmlFor="env_test" className="flex items-center gap-1 text-sm">
                                            <FlaskConical className="h-4 w-4 text-amber-500" />
                                            Testing
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" data-testid="submit-user-btn">
                                Create User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit User Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="max-w-lg overflow-visible">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit_full_name">Full Name *</Label>
                                <Input
                                    id="edit_full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    data-testid="edit-user-name-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit_email">Email *</Label>
                                <Input
                                    id="edit_email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    data-testid="edit-user-email-input"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="edit_password">New Password (leave blank to keep current)</Label>
                            <Input
                                id="edit_password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Enter new password"
                                data-testid="edit-user-password-input"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select
                                    value={formData.role || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger data-testid="edit-user-role-select">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        {ROLES.map((role) => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select
                                    value={formData.department || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                                >
                                    <SelectTrigger data-testid="edit-user-dept-select">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        {DEPARTMENTS.map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {/* 3CX Extension for Sales/CS roles in Edit */}
                        {['sales_executive', 'team_leader', 'sales_manager', 'cs_head', 'cs_agent'].includes(formData.role) && (
                            <div className="space-y-2 p-4 border rounded-lg bg-orange-500/10 border-orange-500/30">
                                <Label htmlFor="edit_threecx_extension" className="text-sm font-medium flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    3CX Extension
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    PBX extension number for call tracking and click-to-call
                                </p>
                                <Input
                                    id="edit_threecx_extension"
                                    value={formData.threecx_extension}
                                    onChange={(e) => setFormData({ ...formData, threecx_extension: e.target.value })}
                                    placeholder="e.g. 101, 102, 103"
                                    className="mt-2"
                                    data-testid="edit-user-3cx-extension-input"
                                />
                            </div>
                        )}

                        {/* Finance Module Permissions in Edit */}
                        {FINANCE_ROLES.includes(formData.role) && (
                            <div className="space-y-4 p-4 border rounded-lg bg-purple-500/10 border-purple-500/30" data-testid="edit-finance-permissions-section">
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                        Module Permissions
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Set View, Edit, Delete access for each finance module
                                    </p>
                                </div>
                                
                                <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                                    {Object.entries(
                                        FINANCE_MODULES.reduce((acc, mod) => {
                                            if (!acc[mod.group]) acc[mod.group] = [];
                                            acc[mod.group].push(mod);
                                            return acc;
                                        }, {})
                                    ).map(([group, modules]) => (
                                        <div key={group} className="space-y-2">
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-1">
                                                {group}
                                            </div>
                                            {modules.map((mod) => {
                                                const perms = formData.finance_permissions?.[mod.id] || { view: false, edit: false, delete: false };
                                                return (
                                                    <div key={mod.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                                                        <span className="text-sm font-medium">{mod.label}</span>
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <Checkbox
                                                                    checked={perms.view}
                                                                    onCheckedChange={(checked) => handleFinancePermissionChange(mod.id, 'view', checked)}
                                                                    data-testid={`edit-perm-${mod.id}-view`}
                                                                />
                                                                <span className="text-xs text-muted-foreground">View</span>
                                                            </label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <Checkbox
                                                                    checked={perms.edit}
                                                                    onCheckedChange={(checked) => handleFinancePermissionChange(mod.id, 'edit', checked)}
                                                                    data-testid={`edit-perm-${mod.id}-edit`}
                                                                />
                                                                <span className="text-xs text-muted-foreground">Edit</span>
                                                            </label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <Checkbox
                                                                    checked={perms.delete}
                                                                    onCheckedChange={(checked) => handleFinancePermissionChange(mod.id, 'delete', checked)}
                                                                    data-testid={`edit-perm-${mod.id}-delete`}
                                                                />
                                                                <span className="text-xs text-red-400">Delete</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Quick Actions */}
                                <div className="flex gap-2 pt-2 border-t border-purple-500/30">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                            const allView = FINANCE_MODULES.reduce((acc, mod) => {
                                                acc[mod.id] = { view: true, edit: false, delete: false };
                                                return acc;
                                            }, {});
                                            setFormData({ ...formData, finance_permissions: allView });
                                        }}
                                    >
                                        View Only
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                            const allEdit = FINANCE_MODULES.reduce((acc, mod) => {
                                                acc[mod.id] = { view: true, edit: true, delete: false };
                                                return acc;
                                            }, {});
                                            setFormData({ ...formData, finance_permissions: allEdit });
                                        }}
                                    >
                                        Edit (No Delete)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                            const noAccess = FINANCE_MODULES.reduce((acc, mod) => {
                                                acc[mod.id] = { view: false, edit: false, delete: false };
                                                return acc;
                                            }, {});
                                            setFormData({ ...formData, finance_permissions: noAccess });
                                        }}
                                    >
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                data-testid="edit-user-active-switch"
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>

                        {currentUser?.role === 'super_admin' && (
                            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                                <Label className="text-sm font-medium">Environment Access</Label>
                                <p className="text-xs text-muted-foreground">
                                    Grant access to non-production environments
                                </p>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="edit_env_dev"
                                            checked={formData.environment_access?.includes('development')}
                                            onCheckedChange={(checked) => {
                                                const access = formData.environment_access || [];
                                                setFormData({
                                                    ...formData,
                                                    environment_access: checked
                                                        ? [...access, 'development']
                                                        : access.filter(e => e !== 'development')
                                                });
                                            }}
                                            data-testid="edit-env-dev-checkbox"
                                        />
                                        <Label htmlFor="edit_env_dev" className="flex items-center gap-1 text-sm">
                                            <Monitor className="h-4 w-4 text-blue-500" />
                                            Development
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="edit_env_test"
                                            checked={formData.environment_access?.includes('testing')}
                                            onCheckedChange={(checked) => {
                                                const access = formData.environment_access || [];
                                                setFormData({
                                                    ...formData,
                                                    environment_access: checked
                                                        ? [...access, 'testing']
                                                        : access.filter(e => e !== 'testing')
                                                });
                                            }}
                                            data-testid="edit-env-test-checkbox"
                                        />
                                        <Label htmlFor="edit_env_test" className="flex items-center gap-1 text-sm">
                                            <FlaskConical className="h-4 w-4 text-amber-500" />
                                            Testing
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" data-testid="update-user-btn">
                                Update User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UsersPage;

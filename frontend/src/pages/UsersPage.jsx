import React, { useState, useEffect } from 'react';
import { useAuth, userApi } from '@/lib/api';
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
    { id: 'super_admin', label: 'Super Admin', color: 'bg-purple-500' },
    { id: 'admin', label: 'Admin', color: 'bg-blue-500' },
    { id: 'sales_manager', label: 'Sales Manager', color: 'bg-green-500' },
    { id: 'team_leader', label: 'Team Leader', color: 'bg-cyan-500' },
    { id: 'sales_executive', label: 'Sales Executive', color: 'bg-yellow-500' },
    { id: 'cs_head', label: 'CS Head', color: 'bg-pink-500' },
    { id: 'cs_agent', label: 'CS Agent', color: 'bg-indigo-500' },
    { id: 'mentor', label: 'Mentor', color: 'bg-orange-500' },
    { id: 'finance', label: 'Finance', color: 'bg-emerald-500' },
    { id: 'hr', label: 'HR', color: 'bg-rose-500' },
];

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
        is_active: true,
        environment_access: [],
    });

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

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
            toast.success('User created successfully');
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
            });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create user');
        }
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
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
                                    <TableHead>Department</TableHead>
                                    <TableHead>Region</TableHead>
                                    <TableHead>Env Access</TableHead>
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
                                            <TableCell>{user.department || '-'}</TableCell>
                                            <TableCell>{user.region || '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {user.environment_access?.includes('development') && (
                                                        <Badge className="bg-blue-500 text-white text-xs">Dev</Badge>
                                                    )}
                                                    {user.environment_access?.includes('testing') && (
                                                        <Badge className="bg-amber-500 text-white text-xs">Test</Badge>
                                                    )}
                                                    {(!user.environment_access || user.environment_access.length === 0) && (
                                                        <span className="text-xs text-muted-foreground">Prod only</span>
                                                    )}
                                                </div>
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
                <DialogContent className="max-w-lg">
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
                                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger data-testid="user-role-select">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                    <SelectTrigger data-testid="user-dept-select">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DEPARTMENTS.map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
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
                                    <SelectContent>
                                        {REGIONS.map((region) => (
                                            <SelectItem key={region} value={region}>
                                                {region}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
                <DialogContent className="max-w-lg">
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
                                    <SelectContent>
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
                                    <SelectContent>
                                        {DEPARTMENTS.map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
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

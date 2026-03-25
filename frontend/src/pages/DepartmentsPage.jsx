import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { apiClient } from '@/lib/api';
import {
    Plus,
    MoreVertical,
    Edit,
    Users,
    Building2,
    UserCircle,
} from 'lucide-react';

const DepartmentsPage = () => {
    const { user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        head_id: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [deptRes, usersRes] = await Promise.all([
                apiClient.get('/departments'),
                apiClient.get('/users'),
            ]);
            setDepartments(deptRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            toast.error('Failed to fetch departments');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('Department name is required');
            return;
        }
        
        try {
            await apiClient.post('/departments', formData);
            toast.success('Department created successfully');
            setShowCreateModal(false);
            setFormData({ name: '', description: '', head_id: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create department');
        }
    };

    const handleEdit = (dept) => {
        setSelectedDept(dept);
        setFormData({
            name: dept.name,
            description: dept.description || '',
            head_id: dept.head_id || '',
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedDept) return;
        
        try {
            const result = await apiClient.put(`/departments/${selectedDept.id}`, formData);
            if (result.data.approval_id) {
                toast.info('Change request submitted for approval');
            } else {
                toast.success('Department updated successfully');
            }
            setShowEditModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update department');
        }
    };

    const isSuperAdmin = user?.role === 'super_admin';

    return (
        <div className="space-y-6" data-testid="departments-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Department Management</h1>
                    <p className="text-muted-foreground">Manage organizational departments and their heads</p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setShowCreateModal(true)} data-testid="create-dept-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Department
                    </Button>
                )}
            </div>

            {/* Department Cards */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {departments.map((dept) => (
                        <Card key={dept.id} className="hover:shadow-lg transition-shadow" data-testid={`dept-card-${dept.id}`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{dept.name}</CardTitle>
                                            <CardDescription>{dept.description || 'No description'}</CardDescription>
                                        </div>
                                    </div>
                                    {isSuperAdmin && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(dept)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <UserCircle className="h-4 w-4" />
                                            Department Head
                                        </span>
                                        <span className="font-medium">{dept.head_name || 'Not Assigned'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Team Members
                                        </span>
                                        <Badge variant="secondary">{dept.member_count || 0}</Badge>
                                    </div>
                                    <Badge className={dept.is_active ? 'bg-emerald-500' : 'bg-gray-500'}>
                                        {dept.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Department</DialogTitle>
                        <DialogDescription>Add a new department to the organization</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Department Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Sales, Marketing"
                                data-testid="dept-name-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Department description..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Department Head</Label>
                            <Select
                                value={formData.head_id || undefined}
                                onValueChange={(value) => setFormData({ ...formData, head_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select head" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.filter(u => u.is_active !== false).map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.full_name} ({u.role?.replace(/_/g, ' ')})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create Department</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                        <DialogDescription>
                            {isSuperAdmin 
                                ? 'Update department information' 
                                : 'Changes require approval from Super Admin'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Department Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={!isSuperAdmin}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Department Head</Label>
                            <Select
                                value={formData.head_id || undefined}
                                onValueChange={(value) => setFormData({ ...formData, head_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select head" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.filter(u => u.is_active !== false).map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.full_name} ({u.role?.replace(/_/g, ' ')})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {isSuperAdmin ? 'Update' : 'Submit for Approval'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DepartmentsPage;

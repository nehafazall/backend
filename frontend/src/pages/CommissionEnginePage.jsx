import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Percent,
    DollarSign,
    Calculator,
    BookOpen,
    Save,
} from 'lucide-react';

const ROLES = [
    { id: 'sales_executive', label: 'Sales Executive' },
    { id: 'team_leader', label: 'Team Leader' },
    { id: 'sales_manager', label: 'Sales Manager' },
    { id: 'cs_agent', label: 'CS Agent' },
    { id: 'cs_head', label: 'CS Head' },
    { id: 'mentor', label: 'Mentor' },
    { id: 'academic_master', label: 'Academic Master' },
];

const COMMISSION_TYPES = [
    { id: 'percentage', label: 'Percentage' },
    { id: 'fixed', label: 'Fixed Amount' },
];

const CommissionEnginePage = () => {
    const { user } = useAuth();
    const [rules, setRules] = useState([]);
    const [courses, setCourses] = useState([]);
    const [commissions, setCommissions] = useState([]);
    const [catalog, setCatalog] = useState({ items: [], grouped: {} });
    const [editingCatalog, setEditingCatalog] = useState({}); // {itemId: {field: value}}
    const [savingCatalog, setSavingCatalog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRule, setSelectedRule] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        course_id: '',
        course_category: '',
        role: '',
        commission_type: 'percentage',
        commission_value: '',
        min_sale_amount: '0',
        max_sale_amount: '',
        is_active: true,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rulesRes, coursesRes, commissionsRes, catalogRes] = await Promise.all([
                apiClient.get('/commission-rules'),
                apiClient.get('/courses'),
                apiClient.get('/commissions'),
                apiClient.get('/course-catalog'),
            ]);
            setRules(rulesRes.data);
            setCourses(coursesRes.data);
            setCommissions(commissionsRes.data);
            setCatalog(catalogRes.data || { items: [], grouped: {} });
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.role || !formData.commission_value) {
            toast.error('Please fill all required fields');
            return;
        }
        
        try {
            await apiClient.post('/commission-rules', {
                ...formData,
                commission_value: parseFloat(formData.commission_value),
                min_sale_amount: parseFloat(formData.min_sale_amount || 0),
                max_sale_amount: formData.max_sale_amount ? parseFloat(formData.max_sale_amount) : null,
                course_id: formData.course_id || null,
                course_category: formData.course_category || null,
            });
            toast.success('Commission rule created successfully');
            setShowCreateModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create rule');
        }
    };

    const handleEdit = (rule) => {
        setSelectedRule(rule);
        setFormData({
            name: rule.name,
            course_id: rule.course_id || '',
            course_category: rule.course_category || '',
            role: rule.role,
            commission_type: rule.commission_type,
            commission_value: rule.commission_value.toString(),
            min_sale_amount: rule.min_sale_amount?.toString() || '0',
            max_sale_amount: rule.max_sale_amount?.toString() || '',
            is_active: rule.is_active,
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedRule) return;
        
        try {
            await apiClient.put(`/commission-rules/${selectedRule.id}`, {
                ...formData,
                commission_value: parseFloat(formData.commission_value),
                min_sale_amount: parseFloat(formData.min_sale_amount || 0),
                max_sale_amount: formData.max_sale_amount ? parseFloat(formData.max_sale_amount) : null,
                course_id: formData.course_id || null,
                course_category: formData.course_category || null,
            });
            toast.success('Commission rule updated successfully');
            setShowEditModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update rule');
        }
    };

    const handleDelete = async (ruleId) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        
        try {
            await apiClient.delete(`/commission-rules/${ruleId}`);
            toast.success('Commission rule deleted successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete rule');
        }
    };

    const handleCatalogFieldChange = (itemId, field, value) => {
        setEditingCatalog(prev => ({
            ...prev,
            [itemId]: { ...(prev[itemId] || {}), [field]: value },
        }));
    };

    const handleSaveCatalogItem = async (item) => {
        const changes = editingCatalog[item.id];
        if (!changes || Object.keys(changes).length === 0) return;
        setSavingCatalog(item.id);
        try {
            const payload = {};
            for (const [k, v] of Object.entries(changes)) {
                payload[k] = parseFloat(v) || 0;
            }
            await apiClient.put(`/course-catalog/${item.id}`, payload);
            toast.success(`Updated commissions for ${item.name}`);
            setEditingCatalog(prev => {
                const next = { ...prev };
                delete next[item.id];
                return next;
            });
            fetchData();
        } catch (error) {
            toast.error('Failed to update: ' + (error.response?.data?.detail || error.message));
        }
        setSavingCatalog(null);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            course_id: '',
            course_category: '',
            role: '',
            commission_type: 'percentage',
            commission_value: '',
            min_sale_amount: '0',
            max_sale_amount: '',
            is_active: true,
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';

    return (
        <div className="space-y-6" data-testid="commission-engine-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Commission Engine</h1>
                    <p className="text-muted-foreground">Configure commission rules and track earnings</p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setShowCreateModal(true)} data-testid="create-rule-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Commission Rule
                    </Button>
                )}
            </div>

            <Tabs defaultValue="rules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="rules">Commission Rules</TabsTrigger>
                    <TabsTrigger value="catalog">Course Commissions</TabsTrigger>
                    <TabsTrigger value="history">Commission History</TabsTrigger>
                </TabsList>

                <TabsContent value="rules" className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Rules</p>
                                        <p className="text-2xl font-bold">{rules.length}</p>
                                    </div>
                                    <Calculator className="h-8 w-8 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Active Rules</p>
                                        <p className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</p>
                                    </div>
                                    <Percent className="h-8 w-8 text-emerald-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Roles Covered</p>
                                        <p className="text-2xl font-bold">
                                            {new Set(rules.map(r => r.role)).size}
                                        </p>
                                    </div>
                                    <DollarSign className="h-8 w-8 text-yellow-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Rules Table */}
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
                                            <TableHead>Rule Name</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Course/Category</TableHead>
                                            <TableHead>Commission</TableHead>
                                            <TableHead>Sale Range</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rules.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                    No commission rules found. Create your first rule!
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rules.map((rule) => (
                                                <TableRow key={rule.id}>
                                                    <TableCell className="font-medium">{rule.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {ROLES.find(r => r.id === rule.role)?.label || rule.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {rule.course_name || rule.course_category || 'All Courses'}
                                                    </TableCell>
                                                    <TableCell className="font-mono">
                                                        {rule.commission_type === 'percentage' 
                                                            ? `${rule.commission_value}%`
                                                            : formatCurrency(rule.commission_value)}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {formatCurrency(rule.min_sale_amount)} - {rule.max_sale_amount ? formatCurrency(rule.max_sale_amount) : '∞'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={rule.is_active ? 'bg-emerald-500' : 'bg-gray-500'}>
                                                            {rule.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {isSuperAdmin && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => handleEdit(rule)}>
                                                                        <Edit className="h-4 w-4 mr-2" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                    {user?.role === 'super_admin' && (
                                                                        <DropdownMenuItem 
                                                                            onClick={() => handleDelete(rule.id)}
                                                                            className="text-red-500"
                                                                        >
                                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                                            Delete
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Course Commissions Tab */}
                <TabsContent value="catalog" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Edit commission amounts for each course/addon/upgrade in the catalog. These values are used by the commission engine to calculate per-deal commissions.
                    </p>
                    {['courses', 'addons', 'upgrades'].map(group => {
                        const items = (catalog.grouped || {})[group] || [];
                        if (items.length === 0) return null;
                        const COMM_FIELDS = group === 'upgrades'
                            ? [{ key: 'commission_cs_agent', label: 'CS Agent' }, { key: 'commission_cs_head', label: 'CS Head' }, { key: 'commission_mentor', label: 'Mentor' }]
                            : [{ key: 'commission_sales_executive', label: 'Sales Exec' }, { key: 'commission_team_leader', label: 'Team Leader' }, { key: 'commission_sales_manager', label: 'SM/CEO' }];

                        return (
                            <Card key={group}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base capitalize flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />{group} ({items.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead className="text-right">Price (AED)</TableHead>
                                                    {COMM_FIELDS.map(f => (
                                                        <TableHead key={f.key} className="text-right w-[120px]">{f.label}</TableHead>
                                                    ))}
                                                    <TableHead className="text-right w-[80px]">Status</TableHead>
                                                    {isSuperAdmin && <TableHead className="text-right w-[60px]" />}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.sort((a, b) => (a.price || 0) - (b.price || 0)).map(item => {
                                                    const edits = editingCatalog[item.id] || {};
                                                    const hasEdits = Object.keys(edits).length > 0;
                                                    return (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">{item.name}</TableCell>
                                                            <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                                                            {COMM_FIELDS.map(f => (
                                                                <TableCell key={f.key} className="text-right">
                                                                    {isSuperAdmin ? (
                                                                        <Input
                                                                            type="number"
                                                                            className="w-[100px] text-right h-8 ml-auto font-mono"
                                                                            value={edits[f.key] !== undefined ? edits[f.key] : (item[f.key] || 0)}
                                                                            onChange={(e) => handleCatalogFieldChange(item.id, f.key, e.target.value)}
                                                                            data-testid={`catalog-${item.id}-${f.key}`}
                                                                        />
                                                                    ) : (
                                                                        <span className="font-mono">{formatCurrency(item[f.key] || 0)}</span>
                                                                    )}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className="text-right">
                                                                <Badge className={item.is_active ? 'bg-emerald-500' : 'bg-gray-500'}>
                                                                    {item.is_active ? 'Active' : 'Off'}
                                                                </Badge>
                                                            </TableCell>
                                                            {isSuperAdmin && (
                                                                <TableCell className="text-right">
                                                                    {hasEdits && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => handleSaveCatalogItem(item)}
                                                                            disabled={savingCatalog === item.id}
                                                                            data-testid={`save-catalog-${item.id}`}
                                                                        >
                                                                            <Save className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Commission History</CardTitle>
                            <CardDescription>Recent commission transactions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Sale Amount</TableHead>
                                        <TableHead>Commission</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Month</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {commissions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                No commission records found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        commissions.slice(0, 20).map((comm) => (
                                            <TableRow key={comm.id}>
                                                <TableCell>{comm.user_name}</TableCell>
                                                <TableCell>{comm.course_name || 'N/A'}</TableCell>
                                                <TableCell className="font-mono">{formatCurrency(comm.sale_amount)}</TableCell>
                                                <TableCell className="font-mono text-emerald-500">
                                                    {formatCurrency(comm.commission_amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{comm.commission_type}</Badge>
                                                </TableCell>
                                                <TableCell>{comm.month}</TableCell>
                                                <TableCell>
                                                    <Badge className={
                                                        comm.status === 'paid' ? 'bg-emerald-500' :
                                                        comm.status === 'approved' ? 'bg-blue-500' : 'bg-yellow-500'
                                                    }>
                                                        {comm.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create/Edit Modal */}
            <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => {
                if (!open) {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                }
            }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{showEditModal ? 'Edit Commission Rule' : 'Create Commission Rule'}</DialogTitle>
                        <DialogDescription>
                            Define how commission is calculated for different roles and courses
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Rule Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Sales Executive - Basic Course"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select
                                    value={formData.role || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger>
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
                                <Label>Specific Course (Optional)</Label>
                                <Select
                                    value={formData.course_id || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All courses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((course) => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Commission Type *</Label>
                                <Select
                                    value={formData.commission_type}
                                    onValueChange={(value) => setFormData({ ...formData, commission_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COMMISSION_TYPES.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>
                                    Commission Value * 
                                    ({formData.commission_type === 'percentage' ? '%' : 'AED'})
                                </Label>
                                <Input
                                    type="number"
                                    step={formData.commission_type === 'percentage' ? '0.1' : '1'}
                                    value={formData.commission_value}
                                    onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                                    placeholder={formData.commission_type === 'percentage' ? '5' : '500'}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min Sale Amount (AED)</Label>
                                <Input
                                    type="number"
                                    value={formData.min_sale_amount}
                                    onChange={(e) => setFormData({ ...formData, min_sale_amount: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Sale Amount (AED)</Label>
                                <Input
                                    type="number"
                                    value={formData.max_sale_amount}
                                    onChange={(e) => setFormData({ ...formData, max_sale_amount: e.target.value })}
                                    placeholder="Unlimited"
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label>Active</Label>
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => {
                                setShowCreateModal(false);
                                setShowEditModal(false);
                                resetForm();
                            }}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {showEditModal ? 'Update Rule' : 'Create Rule'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CommissionEnginePage;

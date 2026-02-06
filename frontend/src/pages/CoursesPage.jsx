import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    GraduationCap,
    DollarSign,
} from 'lucide-react';

const CATEGORIES = [
    { id: 'basic', label: 'Basic' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'mentorship', label: 'Mentorship' },
    { id: 'market_code', label: 'Market Code' },
    { id: 'profit_matrix', label: 'Profit Matrix' },
    { id: 'premium', label: 'Premium' },
];

const CoursesPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        base_price: '',
        category: '',
        is_active: true,
        addons: [],
    });
    const [newAddon, setNewAddon] = useState({ name: '', price: '' });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/courses');
            setCourses(response.data);
        } catch (error) {
            toast.error('Failed to fetch courses');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.code || !formData.base_price || !formData.category) {
            toast.error('Please fill all required fields');
            return;
        }
        
        try {
            await apiClient.post('/courses', {
                ...formData,
                base_price: parseFloat(formData.base_price),
            });
            toast.success('Course created successfully');
            setShowCreateModal(false);
            resetForm();
            fetchCourses();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create course');
        }
    };

    const handleEdit = (course) => {
        setSelectedCourse(course);
        setFormData({
            name: course.name,
            code: course.code,
            description: course.description || '',
            base_price: course.base_price.toString(),
            category: course.category,
            is_active: course.is_active,
            addons: course.addons || [],
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedCourse) return;
        
        try {
            await apiClient.put(`/courses/${selectedCourse.id}`, {
                ...formData,
                base_price: parseFloat(formData.base_price),
            });
            toast.success('Course updated successfully');
            setShowEditModal(false);
            fetchCourses();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update course');
        }
    };

    const handleDelete = async (courseId) => {
        if (!confirm('Are you sure you want to delete this course?')) return;
        
        try {
            await apiClient.delete(`/courses/${courseId}`);
            toast.success('Course deleted successfully');
            fetchCourses();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete course');
        }
    };

    const addAddon = () => {
        if (!newAddon.name || !newAddon.price) return;
        setFormData({
            ...formData,
            addons: [...formData.addons, { name: newAddon.name, price: parseFloat(newAddon.price) }],
        });
        setNewAddon({ name: '', price: '' });
    };

    const removeAddon = (index) => {
        setFormData({
            ...formData,
            addons: formData.addons.filter((_, i) => i !== index),
        });
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            description: '',
            base_price: '',
            category: '',
            is_active: true,
            addons: [],
        });
        setNewAddon({ name: '', price: '' });
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
        <div className="space-y-6" data-testid="courses-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Course Management</h1>
                    <p className="text-muted-foreground">Manage courses and their pricing</p>
                </div>
                {isSuperAdmin && (
                    <Button onClick={() => setShowCreateModal(true)} data-testid="create-course-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Course
                    </Button>
                )}
            </div>

            {/* Courses Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map((course) => (
                        <Card key={course.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <GraduationCap className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{course.name}</CardTitle>
                                            <CardDescription className="font-mono">{course.code}</CardDescription>
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
                                                <DropdownMenuItem onClick={() => handleEdit(course)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                {user?.role === 'super_admin' && (
                                                    <DropdownMenuItem 
                                                        onClick={() => handleDelete(course.id)}
                                                        className="text-red-500"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {course.description || 'No description'}
                                </p>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Base Price</span>
                                        <span className="text-xl font-bold font-mono text-primary">
                                            {formatCurrency(course.base_price)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Category</span>
                                        <Badge variant="secondary">
                                            {CATEGORIES.find(c => c.id === course.category)?.label || course.category}
                                        </Badge>
                                    </div>
                                    
                                    {course.addons && course.addons.length > 0 && (
                                        <div className="pt-3 border-t border-border">
                                            <span className="text-sm text-muted-foreground">Add-ons:</span>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {course.addons.map((addon, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs">
                                                        {addon.name}: {formatCurrency(addon.price)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <Badge className={course.is_active ? 'bg-emerald-500' : 'bg-gray-500'}>
                                        {course.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    
                    {courses.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-12">
                            No courses found. Create your first course!
                        </div>
                    )}
                </div>
            )}

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
                        <DialogTitle>{showEditModal ? 'Edit Course' : 'Create Course'}</DialogTitle>
                        <DialogDescription>
                            {showEditModal ? 'Update course information' : 'Add a new course to the system'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Course Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Basic Trading"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Course Code *</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="BT001"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Base Price (AED) *</Label>
                                <Input
                                    type="number"
                                    value={formData.base_price}
                                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                                    placeholder="5000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select
                                    value={formData.category || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Course description..."
                                rows={2}
                            />
                        </div>
                        
                        {/* Add-ons Section */}
                        <div className="space-y-3">
                            <Label>Add-ons</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={newAddon.name}
                                    onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                                    placeholder="Add-on name"
                                    className="flex-1"
                                />
                                <Input
                                    type="number"
                                    value={newAddon.price}
                                    onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })}
                                    placeholder="Price"
                                    className="w-24"
                                />
                                <Button type="button" variant="outline" onClick={addAddon}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {formData.addons.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.addons.map((addon, i) => (
                                        <Badge key={i} variant="secondary" className="gap-1">
                                            {addon.name}: {formatCurrency(addon.price)}
                                            <button
                                                type="button"
                                                onClick={() => removeAddon(i)}
                                                className="ml-1 text-muted-foreground hover:text-foreground"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
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
                                {showEditModal ? 'Update Course' : 'Create Course'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CoursesPage;

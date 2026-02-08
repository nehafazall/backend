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
import { Plus, Edit, Trash2, GraduationCap } from 'lucide-react';
import ImportButton from '@/components/ImportButton';

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
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [category, setCategory] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/courses');
            setCourses(res.data);
        } catch (e) {
            toast.error('Failed to fetch courses');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setCode('');
        setDescription('');
        setBasePrice('');
        setCategory('');
        setIsActive(true);
        setSelectedId(null);
        setEditMode(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !code || !basePrice || !category) {
            toast.error('Please fill required fields');
            return;
        }
        
        const payload = {
            name,
            code,
            description,
            base_price: parseFloat(basePrice),
            category,
            is_active: isActive,
            addons: [],
        };
        
        try {
            if (editMode && selectedId) {
                await apiClient.put('/courses/' + selectedId, payload);
                toast.success('Course updated');
            } else {
                await apiClient.post('/courses', payload);
                toast.success('Course created');
            }
            setShowModal(false);
            resetForm();
            fetchCourses();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Failed to save');
        }
    };

    const handleEdit = (c) => {
        setSelectedId(c.id);
        setName(c.name);
        setCode(c.code);
        setDescription(c.description || '');
        setBasePrice(c.base_price.toString());
        setCategory(c.category);
        setIsActive(c.is_active);
        setEditMode(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this course?')) return;
        try {
            await apiClient.delete('/courses/' + id);
            toast.success('Course deleted');
            fetchCourses();
        } catch (e) {
            toast.error('Failed to delete');
        }
    };

    const formatCurrency = (amt) => new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        minimumFractionDigits: 0,
    }).format(amt || 0);

    const canEdit = user?.role === 'super_admin' || user?.role === 'admin';

    return (
        <div className="space-y-6" data-testid="courses-page">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Course Management</h1>
                    <p className="text-muted-foreground">Manage courses and pricing</p>
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        <ImportButton type="courses" onSuccess={fetchCourses} />
                        <Button onClick={() => { resetForm(); setShowModal(true); }}>
                            <Plus className="h-4 w-4 mr-2" />Add Course
                        </Button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center h-64 items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map((c) => (
                        <Card key={c.id}>
                            <CardHeader>
                                <div className="flex justify-between">
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <GraduationCap className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>{c.name}</CardTitle>
                                            <CardDescription className="font-mono">{c.code}</CardDescription>
                                        </div>
                                    </div>
                                    {canEdit && (
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {user?.role === 'super_admin' && (
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">{c.description || 'No description'}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Price</span>
                                        <span className="text-xl font-bold text-primary">{formatCurrency(c.base_price)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Category</span>
                                        <Badge variant="secondary">{CATEGORIES.find(x => x.id === c.category)?.label || c.category}</Badge>
                                    </div>
                                    <Badge className={c.is_active ? 'bg-emerald-500' : 'bg-gray-500'}>
                                        {c.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {courses.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No courses found
                        </div>
                    )}
                </div>
            )}

            <Dialog open={showModal} onOpenChange={(o) => { if (!o) { setShowModal(false); resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editMode ? 'Edit Course' : 'Create Course'}</DialogTitle>
                        <DialogDescription>Fill in course details</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Basic Trading" />
                            </div>
                            <div className="space-y-2">
                                <Label>Code *</Label>
                                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="BT001" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Price (AED) *</Label>
                                <Input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="5000" />
                            </div>
                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select value={category || undefined} onValueChange={setCategory}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                            <Label>Active</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
                            <Button type="submit">{editMode ? 'Update' : 'Create'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CoursesPage;

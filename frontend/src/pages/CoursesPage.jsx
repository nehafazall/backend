import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Eye, EyeOff, Check, Package, ShoppingCart, ArrowUpCircle, Search } from 'lucide-react';

const TYPE_OPTIONS = [
    { id: 'course', label: 'Course', icon: Package, color: 'bg-blue-500' },
    { id: 'addon', label: 'Add-on', icon: ShoppingCart, color: 'bg-purple-500' },
    { id: 'upgrade', label: 'Upgrade', icon: ArrowUpCircle, color: 'bg-amber-500' },
];

const CoursesPage = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({ name: '', price: '', type: 'course' });

    const canEdit = user?.role === 'super_admin' || user?.role === 'admin';

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/course-catalog');
            setItems(res.data?.items || []);
        } catch (e) {
            toast.error('Failed to fetch catalog');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        return items.filter(i => {
            if (filterType !== 'all' && i.type !== filterType) return false;
            if (filterStatus === 'active' && !i.is_active) return false;
            if (filterStatus === 'inactive' && i.is_active) return false;
            if (searchTerm && !i.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [items, filterType, filterStatus, searchTerm]);

    const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.includes(i.id));

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(i => i.id));
        }
    };

    const toggleOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkAction = async (action) => {
        if (selectedIds.length === 0) return;
        const labels = { delete: 'Delete', activate: 'Activate', deactivate: 'Deactivate' };
        if (action === 'delete' && !confirm(`${labels[action]} ${selectedIds.length} item(s)?`)) return;
        try {
            const res = await apiClient.post('/course-catalog/bulk-action', { ids: selectedIds, action });
            toast.success(res.data?.message || 'Done');
            setSelectedIds([]);
            fetchItems();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Bulk action failed');
        }
    };

    const resetForm = () => { setForm({ name: '', price: '', type: 'course' }); setEditItem(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
        try {
            if (editItem) {
                await apiClient.put(`/course-catalog/${editItem.id}`, { name: form.name, price: parseFloat(form.price), type: form.type });
                toast.success('Item updated');
            } else {
                await apiClient.post('/course-catalog', { name: form.name, price: parseFloat(form.price), type: form.type });
                toast.success('Item added');
            }
            setShowModal(false);
            resetForm();
            fetchItems();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Failed to save');
        }
    };

    const openEdit = (item) => {
        setEditItem(item);
        setForm({ name: item.name, price: String(item.price), type: item.type });
        setShowModal(true);
    };

    const formatCurrency = (amt) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(amt || 0);

    const typeBadge = (type) => {
        const opt = TYPE_OPTIONS.find(o => o.id === type);
        if (!opt) return <Badge variant="secondary">{type}</Badge>;
        return <Badge className={`${opt.color} text-white`}>{opt.label}</Badge>;
    };

    const counts = useMemo(() => {
        const c = { all: items.length, course: 0, addon: 0, upgrade: 0 };
        items.forEach(i => { if (c[i.type] !== undefined) c[i.type]++; });
        return c;
    }, [items]);

    return (
        <div className="space-y-6" data-testid="courses-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Course Catalog</h1>
                    <p className="text-muted-foreground">Manage courses, add-ons, and upgrade packages</p>
                </div>
                {canEdit && (
                    <Button onClick={() => { resetForm(); setShowModal(true); }} data-testid="add-catalog-item-btn">
                        <Plus className="h-4 w-4 mr-2" />Add Item
                    </Button>
                )}
            </div>

            {/* Filters & Type Tabs */}
            <div className="flex flex-wrap items-center gap-3">
                {['all', 'course', 'addon', 'upgrade'].map(t => (
                    <Button
                        key={t}
                        variant={filterType === t ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterType(t)}
                        data-testid={`filter-type-${t}`}
                    >
                        {t === 'all' ? 'All' : TYPE_OPTIONS.find(o => o.id === t)?.label}
                        <span className="ml-1.5 text-xs opacity-70">({counts[t] || 0})</span>
                    </Button>
                ))}
                <div className="flex-1" />
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-48"
                        data-testid="catalog-search"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32" data-testid="filter-status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && canEdit && (
                <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in" data-testid="bulk-actions-bar">
                    <span className="text-sm font-medium">{selectedIds.length} selected</span>
                    <div className="flex-1" />
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')} data-testid="bulk-activate-btn">
                        <Eye className="h-3.5 w-3.5 mr-1.5" />Activate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')} data-testid="bulk-deactivate-btn">
                        <EyeOff className="h-3.5 w-3.5 mr-1.5" />Deactivate
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')} data-testid="bulk-delete-btn">
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex justify-center h-64 items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                {canEdit && (
                                    <TableHead className="w-12">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            className="rounded border-gray-400 h-4 w-4"
                                            data-testid="select-all-checkbox"
                                        />
                                    </TableHead>
                                )}
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Price (AED)</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                {canEdit && <TableHead className="text-center w-24">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((item) => (
                                <TableRow
                                    key={item.id}
                                    className={`${selectedIds.includes(item.id) ? 'bg-primary/5' : ''} ${!item.is_active ? 'opacity-60' : ''}`}
                                    data-testid={`catalog-row-${item.id}`}
                                >
                                    {canEdit && (
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => toggleOne(item.id)}
                                                className="rounded border-gray-400 h-4 w-4"
                                                data-testid={`select-item-${item.id}`}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{typeBadge(item.type)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(item.price)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={item.is_active ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'}>
                                            {item.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    {canEdit && (
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)} data-testid={`edit-item-${item.id}`}>
                                                <Check className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={canEdit ? 6 : 4} className="text-center py-12 text-muted-foreground">
                                        No items found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Dialog open={showModal} onOpenChange={(o) => { if (!o) { setShowModal(false); resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editItem ? 'Edit Item' : 'Add Catalog Item'}</DialogTitle>
                        <DialogDescription>Course, add-on, or upgrade package</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Advance Course"
                                data-testid="catalog-item-name"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Price (AED) *</Label>
                                <Input
                                    type="number"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    placeholder="5000"
                                    data-testid="catalog-item-price"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Type *</Label>
                                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                    <SelectTrigger data-testid="catalog-item-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TYPE_OPTIONS.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
                            <Button type="submit" data-testid="catalog-item-submit">{editItem ? 'Update' : 'Add'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CoursesPage;

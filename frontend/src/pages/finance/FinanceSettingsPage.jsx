import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Plus,
    Pencil,
    Trash2,
    Building2,
    CreditCard,
    Wallet,
    ArrowRightLeft,
    Loader2,
    RefreshCw,
    Clock,
    Percent,
    Landmark,
    CheckCircle,
} from 'lucide-react';

// ==================== CHART OF ACCOUNTS ====================
const ChartOfAccountsSection = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'asset',
        parent_code: '',
        description: '',
        is_active: true,
    });

    const ACCOUNT_TYPES = [
        { id: 'asset', label: 'Asset' },
        { id: 'liability', label: 'Liability' },
        { id: 'equity', label: 'Equity' },
        { id: 'revenue', label: 'Revenue' },
        { id: 'expense', label: 'Expense' },
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/finance/settings/chart-of-accounts');
            setAccounts(res.data || []);
        } catch (error) {
            console.error('Failed to fetch chart of accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        if (!formData.code || !formData.name) {
            toast.error('Code and Name are required');
            return;
        }
        try {
            if (editingItem) {
                await api.put(`/finance/settings/chart-of-accounts/${editingItem.id}`, formData);
                toast.success('Account updated');
            } else {
                await api.post('/finance/settings/chart-of-accounts', formData);
                toast.success('Account created');
            }
            setShowDialog(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/finance/settings/chart-of-accounts/${editingItem.id}`);
            toast.success('Account deleted');
            setShowDeleteDialog(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete');
        }
    };

    const resetForm = () => {
        setFormData({ code: '', name: '', type: 'asset', parent_code: '', description: '', is_active: true });
        setEditingItem(null);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            code: item.code,
            name: item.name,
            type: item.type,
            parent_code: item.parent_code || '',
            description: item.description || '',
            is_active: item.is_active !== false,
        });
        setShowDialog(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Chart of Accounts</h2>
                    <p className="text-sm text-muted-foreground">Manage your accounting structure</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No accounts found. Click "Add Account" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            accounts.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono">{item.code}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{item.type}</Badge>
                                    </TableCell>
                                    <TableCell>{item.parent_code || '-'}</TableCell>
                                    <TableCell>
                                        <Badge className={item.is_active !== false ? 'bg-green-500' : 'bg-gray-500'}>
                                            {item.is_active !== false ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setEditingItem(item); setShowDeleteDialog(true); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Account' : 'Add Account'}</DialogTitle>
                        <DialogDescription>Configure chart of accounts entry</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Account Code *</Label>
                                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., 1001" />
                            </div>
                            <div className="space-y-2">
                                <Label>Account Type *</Label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ACCOUNT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Account Name *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Cash in Bank" />
                        </div>
                        <div className="space-y-2">
                            <Label>Parent Account Code</Label>
                            <Input value={formData.parent_code} onChange={(e) => setFormData({ ...formData, parent_code: e.target.value })} placeholder="e.g., 1000" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Account description..." />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{editingItem?.name}". This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== COST CENTERS ====================
const CostCentersSection = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        department: '',
        description: '',
        is_active: true,
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/finance/settings/cost-centers');
            setItems(res.data || []);
        } catch (error) {
            console.error('Failed to fetch cost centers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        if (!formData.code || !formData.name) {
            toast.error('Code and Name are required');
            return;
        }
        try {
            if (editingItem) {
                await api.put(`/finance/settings/cost-centers/${editingItem.id}`, formData);
                toast.success('Cost center updated');
            } else {
                await api.post('/finance/settings/cost-centers', formData);
                toast.success('Cost center created');
            }
            setShowDialog(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/finance/settings/cost-centers/${editingItem.id}`);
            toast.success('Cost center deleted');
            setShowDeleteDialog(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete');
        }
    };

    const resetForm = () => {
        setFormData({ code: '', name: '', department: '', description: '', is_active: true });
        setEditingItem(null);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            code: item.code,
            name: item.name,
            department: item.department || '',
            description: item.description || '',
            is_active: item.is_active !== false,
        });
        setShowDialog(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Cost Centers</h2>
                    <p className="text-sm text-muted-foreground">Manage cost allocation centers</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Cost Center
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No cost centers found. Click "Add Cost Center" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono">{item.code}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.department || '-'}</TableCell>
                                    <TableCell>
                                        <Badge className={item.is_active !== false ? 'bg-green-500' : 'bg-gray-500'}>
                                            {item.is_active !== false ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setEditingItem(item); setShowDeleteDialog(true); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Cost Center' : 'Add Cost Center'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Code *</Label>
                                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., CC001" />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g., Marketing" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Marketing Operations" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Cost Center?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{editingItem?.name}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== PAYMENT METHODS ====================
const PaymentMethodsSection = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'card',
        description: '',
        requires_proof: true,
        is_active: true,
    });

    const PAYMENT_TYPES = [
        { id: 'card', label: 'Credit/Debit Card' },
        { id: 'bank_transfer', label: 'Bank Transfer' },
        { id: 'cash', label: 'Cash' },
        { id: 'bnpl', label: 'Buy Now Pay Later' },
        { id: 'mobile', label: 'Mobile Payment' },
        { id: 'cheque', label: 'Cheque' },
        { id: 'other', label: 'Other' },
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/finance/settings/payment-methods');
            setItems(res.data || []);
        } catch (error) {
            console.error('Failed to fetch payment methods:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        if (!formData.code || !formData.name) {
            toast.error('Code and Name are required');
            return;
        }
        try {
            if (editingItem) {
                await api.put(`/finance/settings/payment-methods/${editingItem.id}`, formData);
                toast.success('Payment method updated');
            } else {
                await api.post('/finance/settings/payment-methods', formData);
                toast.success('Payment method created');
            }
            setShowDialog(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/finance/settings/payment-methods/${editingItem.id}`);
            toast.success('Payment method deleted');
            setShowDeleteDialog(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete');
        }
    };

    const resetForm = () => {
        setFormData({ code: '', name: '', type: 'card', description: '', requires_proof: true, is_active: true });
        setEditingItem(null);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            code: item.code,
            name: item.name,
            type: item.type || 'card',
            description: item.description || '',
            requires_proof: item.requires_proof !== false,
            is_active: item.is_active !== false,
        });
        setShowDialog(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Payment Methods</h2>
                    <p className="text-sm text-muted-foreground">Configure accepted payment methods</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Method
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Requires Proof</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No payment methods found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono">{item.code}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{item.type?.replace('_', ' ')}</Badge></TableCell>
                                    <TableCell>{item.requires_proof !== false ? <CheckCircle className="h-4 w-4 text-green-500" /> : '-'}</TableCell>
                                    <TableCell>
                                        <Badge className={item.is_active !== false ? 'bg-green-500' : 'bg-gray-500'}>
                                            {item.is_active !== false ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setEditingItem(item); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Code *</Label>
                                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., CARD" />
                            </div>
                            <div className="space-y-2">
                                <Label>Type *</Label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Visa/Mastercard" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch checked={formData.requires_proof} onCheckedChange={(v) => setFormData({ ...formData, requires_proof: v })} />
                                <Label>Requires Proof</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                                <Label>Active</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payment Method?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{editingItem?.name}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== PAYMENT GATEWAYS ====================
const PaymentGatewaysSection = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        provider_type: 'card_processor',
        settlement_days: 1,
        settlement_day_of_week: '',
        processing_fee_percent: 0,
        processing_fee_fixed: 0,
        currency: 'AED',
        description: '',
        is_active: true,
    });

    const PROVIDER_TYPES = [
        { id: 'card_processor', label: 'Card Processor' },
        { id: 'bnpl', label: 'Buy Now Pay Later' },
        { id: 'bank', label: 'Bank Transfer' },
        { id: 'mobile_wallet', label: 'Mobile Wallet' },
        { id: 'other', label: 'Other' },
    ];

    const DAYS_OF_WEEK = [
        { id: '', label: 'N/A (Use settlement days)' },
        { id: 'monday', label: 'Monday' },
        { id: 'tuesday', label: 'Tuesday' },
        { id: 'wednesday', label: 'Wednesday' },
        { id: 'thursday', label: 'Thursday' },
        { id: 'friday', label: 'Friday' },
        { id: 'saturday', label: 'Saturday' },
        { id: 'sunday', label: 'Sunday' },
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/finance/settings/payment-gateways');
            setItems(res.data || []);
        } catch (error) {
            console.error('Failed to fetch payment gateways:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        if (!formData.code || !formData.name) {
            toast.error('Code and Name are required');
            return;
        }
        try {
            if (editingItem) {
                await api.put(`/finance/settings/payment-gateways/${editingItem.id}`, formData);
                toast.success('Payment gateway updated');
            } else {
                await api.post('/finance/settings/payment-gateways', formData);
                toast.success('Payment gateway created');
            }
            setShowDialog(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/finance/settings/payment-gateways/${editingItem.id}`);
            toast.success('Payment gateway deleted');
            setShowDeleteDialog(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete');
        }
    };

    const resetForm = () => {
        setFormData({ code: '', name: '', provider_type: 'card_processor', settlement_days: 1, settlement_day_of_week: '', processing_fee_percent: 0, processing_fee_fixed: 0, currency: 'AED', description: '', is_active: true });
        setEditingItem(null);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            code: item.code,
            name: item.name,
            provider_type: item.provider_type || 'card_processor',
            settlement_days: item.settlement_days || 1,
            settlement_day_of_week: item.settlement_day_of_week || '',
            processing_fee_percent: item.processing_fee_percent || 0,
            processing_fee_fixed: item.processing_fee_fixed || 0,
            currency: item.currency || 'AED',
            description: item.description || '',
            is_active: item.is_active !== false,
        });
        setShowDialog(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Payment Gateways</h2>
                    <p className="text-sm text-muted-foreground">Configure payment processors with settlement times and fees</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Gateway
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Settlement</TableHead>
                            <TableHead>Fees</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No payment gateways found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono">{item.code}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{item.provider_type?.replace('_', ' ')}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm">
                                            <Clock className="h-3 w-3" />
                                            {item.settlement_day_of_week ? (
                                                <span className="capitalize">{item.settlement_day_of_week}</span>
                                            ) : (
                                                <span>T+{item.settlement_days || 1}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {item.processing_fee_percent > 0 && <span>{item.processing_fee_percent}%</span>}
                                            {item.processing_fee_percent > 0 && item.processing_fee_fixed > 0 && ' + '}
                                            {item.processing_fee_fixed > 0 && <span>{item.currency} {item.processing_fee_fixed}</span>}
                                            {!item.processing_fee_percent && !item.processing_fee_fixed && '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={item.is_active !== false ? 'bg-green-500' : 'bg-gray-500'}>
                                            {item.is_active !== false ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setEditingItem(item); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Payment Gateway' : 'Add Payment Gateway'}</DialogTitle>
                        <DialogDescription>Configure payment processor with settlement time and fees</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Code *</Label>
                                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., TABBY" />
                            </div>
                            <div className="space-y-2">
                                <Label>Provider Type *</Label>
                                <Select value={formData.provider_type} onValueChange={(v) => setFormData({ ...formData, provider_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PROVIDER_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Tabby BNPL" />
                        </div>
                        
                        <div className="p-4 bg-muted rounded-lg space-y-4">
                            <h4 className="font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Settlement Configuration</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Settlement Days (T+)</Label>
                                    <Input type="number" min="0" value={formData.settlement_days} onChange={(e) => setFormData({ ...formData, settlement_days: parseInt(e.target.value) || 0 })} />
                                    <p className="text-xs text-muted-foreground">Days after transaction</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Settlement Day of Week</Label>
                                    <Select value={formData.settlement_day_of_week} onValueChange={(v) => setFormData({ ...formData, settlement_day_of_week: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select day..." /></SelectTrigger>
                                        <SelectContent>
                                            {DAYS_OF_WEEK.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">For weekly settlements (e.g., Tabby)</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-muted rounded-lg space-y-4">
                            <h4 className="font-medium flex items-center gap-2"><Percent className="h-4 w-4" /> Processing Fees</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Fee (%)</Label>
                                    <Input type="number" step="0.01" min="0" value={formData.processing_fee_percent} onChange={(e) => setFormData({ ...formData, processing_fee_percent: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fixed Fee</Label>
                                    <Input type="number" step="0.01" min="0" value={formData.processing_fee_fixed} onChange={(e) => setFormData({ ...formData, processing_fee_fixed: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AED">AED</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional notes..." />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payment Gateway?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{editingItem?.name}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== PSP BANK MAPPING ====================
const PSPBankMappingSection = () => {
    const [items, setItems] = useState([]);
    const [gateways, setGateways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        gateway_id: '',
        gateway_name: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_name: '',
        currency: 'AED',
        description: '',
        is_active: true,
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [mappingsRes, gatewaysRes] = await Promise.all([
                api.get('/finance/settings/psp-bank-mapping'),
                api.get('/finance/settings/payment-gateways'),
            ]);
            setItems(mappingsRes.data || []);
            setGateways(gatewaysRes.data || []);
        } catch (error) {
            console.error('Failed to fetch PSP bank mappings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        if (!formData.gateway_id || !formData.bank_name) {
            toast.error('Gateway and Bank Name are required');
            return;
        }
        try {
            // Get gateway name
            const gateway = gateways.find(g => g.id === formData.gateway_id);
            const payload = { ...formData, gateway_name: gateway?.name || '' };
            
            if (editingItem) {
                await api.put(`/finance/settings/psp-bank-mapping/${editingItem.id}`, payload);
                toast.success('PSP bank mapping updated');
            } else {
                await api.post('/finance/settings/psp-bank-mapping', payload);
                toast.success('PSP bank mapping created');
            }
            setShowDialog(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/finance/settings/psp-bank-mapping/${editingItem.id}`);
            toast.success('PSP bank mapping deleted');
            setShowDeleteDialog(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete');
        }
    };

    const resetForm = () => {
        setFormData({ gateway_id: '', gateway_name: '', bank_name: '', bank_account_number: '', bank_account_name: '', currency: 'AED', description: '', is_active: true });
        setEditingItem(null);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            gateway_id: item.gateway_id,
            gateway_name: item.gateway_name || '',
            bank_name: item.bank_name,
            bank_account_number: item.bank_account_number || '',
            bank_account_name: item.bank_account_name || '',
            currency: item.currency || 'AED',
            description: item.description || '',
            is_active: item.is_active !== false,
        });
        setShowDialog(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">PSP Bank Mapping</h2>
                    <p className="text-sm text-muted-foreground">Map payment gateways to bank accounts for reconciliation</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Mapping
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Payment Gateway</TableHead>
                            <TableHead>Bank Name</TableHead>
                            <TableHead>Account Number</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No PSP bank mappings found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.gateway_name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Landmark className="h-4 w-4 text-muted-foreground" />
                                            {item.bank_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono">{item.bank_account_number || '-'}</TableCell>
                                    <TableCell>{item.bank_account_name || '-'}</TableCell>
                                    <TableCell>{item.currency}</TableCell>
                                    <TableCell>
                                        <Badge className={item.is_active !== false ? 'bg-green-500' : 'bg-gray-500'}>
                                            {item.is_active !== false ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setEditingItem(item); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit PSP Bank Mapping' : 'Add PSP Bank Mapping'}</DialogTitle>
                        <DialogDescription>Link payment gateway settlements to bank accounts</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Payment Gateway *</Label>
                            <Select value={formData.gateway_id} onValueChange={(v) => setFormData({ ...formData, gateway_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Select gateway..." /></SelectTrigger>
                                <SelectContent>
                                    {gateways.filter(g => g.is_active !== false).map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Bank Name *</Label>
                            <Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="e.g., Mashreq Bank" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Account Number</Label>
                                <Input value={formData.bank_account_number} onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })} placeholder="Account number" />
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AED">AED</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Account Name</Label>
                            <Input value={formData.bank_account_name} onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })} placeholder="e.g., CLT Academy LLC" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional notes..." />
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete PSP Bank Mapping?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the mapping for "{editingItem?.gateway_name}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== BANK ACCOUNTS ====================
const BankAccountsSection = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        account_name: '',
        bank_name: '',
        account_number: '',
        iban: '',
        swift_code: '',
        branch: '',
        currency: 'AED',
        account_type: 'current',
        opening_balance: 0,
        opening_balance_date: new Date().toISOString().split('T')[0],
        description: '',
        is_active: true,
    });

    const ACCOUNT_TYPES = [
        { id: 'current', label: 'Current Account' },
        { id: 'savings', label: 'Savings Account' },
        { id: 'petty_cash', label: 'Petty Cash' },
        { id: 'credit_card', label: 'Credit Card' },
        { id: 'escrow', label: 'Escrow Account' },
        { id: 'merchant', label: 'Merchant Account' },
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/finance/settings/bank-accounts');
            setItems(res.data || []);
        } catch (error) {
            console.error('Failed to fetch bank accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        if (!formData.account_name || !formData.bank_name || !formData.account_number) {
            toast.error('Account Name, Bank Name and Account Number are required');
            return;
        }
        try {
            if (editingItem) {
                await api.put(`/finance/settings/bank-accounts/${editingItem.id}`, formData);
                toast.success('Bank account updated');
            } else {
                await api.post('/finance/settings/bank-accounts', formData);
                toast.success('Bank account created');
            }
            setShowDialog(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/finance/settings/bank-accounts/${editingItem.id}`);
            toast.success('Bank account deleted');
            setShowDeleteDialog(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete');
        }
    };

    const resetForm = () => {
        setFormData({ 
            account_name: '', 
            bank_name: '', 
            account_number: '', 
            iban: '', 
            swift_code: '', 
            branch: '', 
            currency: 'AED', 
            account_type: 'current', 
            opening_balance: 0, 
            opening_balance_date: new Date().toISOString().split('T')[0],
            description: '', 
            is_active: true 
        });
        setEditingItem(null);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            account_name: item.account_name,
            bank_name: item.bank_name,
            account_number: item.account_number,
            iban: item.iban || '',
            swift_code: item.swift_code || '',
            branch: item.branch || '',
            currency: item.currency || 'AED',
            account_type: item.account_type || 'current',
            opening_balance: item.opening_balance || 0,
            opening_balance_date: item.opening_balance_date || new Date().toISOString().split('T')[0],
            description: item.description || '',
            is_active: item.is_active !== false,
        });
        setShowDialog(true);
    };

    const formatCurrency = (amount, currency = 'AED') => {
        return `${currency} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Bank Accounts</h2>
                    <p className="text-sm text-muted-foreground">Manage company bank accounts for Treasury tracking</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bank Account
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Bank</TableHead>
                            <TableHead>Account Number</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead className="text-right">Opening Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No bank accounts found. Click "Add Bank Account" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.account_name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Landmark className="h-4 w-4 text-muted-foreground" />
                                            {item.bank_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono">{item.account_number}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {item.account_type?.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{item.currency}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatCurrency(item.opening_balance, item.currency)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={item.is_active !== false ? 'bg-green-500' : 'bg-gray-500'}>
                                            {item.is_active !== false ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setEditingItem(item); setShowDeleteDialog(true); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
                        <DialogDescription>Configure bank account details for Treasury tracking</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Account Name *</Label>
                                <Input value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} placeholder="e.g., Main Operating Account" />
                            </div>
                            <div className="space-y-2">
                                <Label>Account Type *</Label>
                                <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ACCOUNT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Bank Name *</Label>
                                <Input value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="e.g., Mashreq Bank" />
                            </div>
                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Input value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} placeholder="e.g., Dubai Main Branch" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Account Number *</Label>
                                <Input value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} placeholder="Account number" />
                            </div>
                            <div className="space-y-2">
                                <Label>IBAN</Label>
                                <Input value={formData.iban} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} placeholder="AE..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>SWIFT/BIC Code</Label>
                                <Input value={formData.swift_code} onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })} placeholder="e.g., BOMLAEAD" />
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                        <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="p-4 bg-muted rounded-lg space-y-4">
                            <h4 className="font-medium flex items-center gap-2"><Wallet className="h-4 w-4" /> Opening Balance</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        value={formData.opening_balance} 
                                        onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })} 
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>As of Date</Label>
                                    <Input 
                                        type="date" 
                                        value={formData.opening_balance_date} 
                                        onChange={(e) => setFormData({ ...formData, opening_balance_date: e.target.value })} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description / Notes</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional notes about this account..." />
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingItem ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Bank Account?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete "{editingItem?.account_name}". This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
const FinanceSettingsPage = ({ section = 'accounts' }) => {
    const [activeTab, setActiveTab] = useState(section);

    useEffect(() => {
        setActiveTab(section);
    }, [section]);

    return (
        <div className="space-y-6" data-testid="finance-settings-page">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="accounts" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Chart of Accounts
                    </TabsTrigger>
                    <TabsTrigger value="bank-accounts" className="flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        Bank Accounts
                    </TabsTrigger>
                    <TabsTrigger value="cost-centers" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Cost Centers
                    </TabsTrigger>
                    <TabsTrigger value="payment-methods" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payment Methods
                    </TabsTrigger>
                    <TabsTrigger value="payment-gateways" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Payment Gateways
                    </TabsTrigger>
                    <TabsTrigger value="psp-mapping" className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        PSP Mapping
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="accounts">
                    <ChartOfAccountsSection />
                </TabsContent>
                <TabsContent value="bank-accounts">
                    <BankAccountsSection />
                </TabsContent>
                <TabsContent value="cost-centers">
                    <CostCentersSection />
                </TabsContent>
                <TabsContent value="payment-methods">
                    <PaymentMethodsSection />
                </TabsContent>
                <TabsContent value="payment-gateways">
                    <PaymentGatewaysSection />
                </TabsContent>
                <TabsContent value="psp-mapping">
                    <PSPBankMappingSection />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default FinanceSettingsPage;

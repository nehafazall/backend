import React, { useState, useEffect, useCallback } from 'react';
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
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
    Plus, Pencil, Trash2, Building2, RefreshCw, Search, FileText, Phone, Mail, CreditCard, Package
} from 'lucide-react';

const VENDOR_CATEGORIES = [
    'Technology & Software',
    'Marketing & Advertising',
    'Office Supplies',
    'Utilities',
    'Professional Services',
    'Training & Education',
    'Travel & Accommodation',
    'Food & Beverages',
    'Maintenance & Repairs',
    'Other'
];

const PAYMENT_TERMS = [
    { id: 'immediate', label: 'Immediate' },
    { id: 'net_7', label: 'Net 7 Days' },
    { id: 'net_15', label: 'Net 15 Days' },
    { id: 'net_30', label: 'Net 30 Days' },
    { id: 'net_45', label: 'Net 45 Days' },
    { id: 'net_60', label: 'Net 60 Days' },
    { id: 'custom', label: 'Custom Terms' }
];

const VendorManagementPage = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [formData, setFormData] = useState({
        name: '',
        trading_name: '',
        category: '',
        items_supplied: '',
        // Contact Details
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'UAE',
        // Bank Details
        bank_name: '',
        bank_account_number: '',
        bank_iban: '',
        bank_swift: '',
        bank_branch: '',
        // Tax & Terms
        trn: '',
        payment_terms: 'net_30',
        custom_payment_days: '',
        credit_limit: 0,
        currency: 'AED',
        // Status
        is_active: true,
        notes: ''
    });

    const fetchVendors = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/finance/vendors');
            setVendors(res.data || []);
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            toast.error('Failed to fetch vendors');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    const handleSubmit = async () => {
        if (!formData.name || !formData.category) {
            toast.error('Vendor name and category are required');
            return;
        }

        try {
            if (editingVendor) {
                await api.put(`/finance/vendors/${editingVendor.id}`, formData);
                toast.success('Vendor updated successfully');
            } else {
                await api.post('/finance/vendors', formData);
                toast.success('Vendor created successfully');
            }
            setShowDialog(false);
            resetForm();
            fetchVendors();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save vendor');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/finance/vendors/${editingVendor.id}`);
            toast.success('Vendor deleted');
            setShowDeleteDialog(false);
            setEditingVendor(null);
            fetchVendors();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete vendor');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', trading_name: '', category: '', items_supplied: '',
            contact_person: '', email: '', phone: '', address: '', city: '', country: 'UAE',
            bank_name: '', bank_account_number: '', bank_iban: '', bank_swift: '', bank_branch: '',
            trn: '', payment_terms: 'net_30', custom_payment_days: '', credit_limit: 0, currency: 'AED',
            is_active: true, notes: ''
        });
        setEditingVendor(null);
    };

    const openEdit = (vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name: vendor.name || '',
            trading_name: vendor.trading_name || '',
            category: vendor.category || '',
            items_supplied: vendor.items_supplied || '',
            contact_person: vendor.contact_person || '',
            email: vendor.email || '',
            phone: vendor.phone || '',
            address: vendor.address || '',
            city: vendor.city || '',
            country: vendor.country || 'UAE',
            bank_name: vendor.bank_name || '',
            bank_account_number: vendor.bank_account_number || '',
            bank_iban: vendor.bank_iban || '',
            bank_swift: vendor.bank_swift || '',
            bank_branch: vendor.bank_branch || '',
            trn: vendor.trn || '',
            payment_terms: vendor.payment_terms || 'net_30',
            custom_payment_days: vendor.custom_payment_days || '',
            credit_limit: vendor.credit_limit || 0,
            currency: vendor.currency || 'AED',
            is_active: vendor.is_active !== false,
            notes: vendor.notes || ''
        });
        setShowDialog(true);
    };

    const filteredVendors = vendors.filter(v => {
        const matchesSearch = v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.trading_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const formatCurrency = (amount, currency = 'AED') => {
        return `${currency} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6" data-testid="vendor-management-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Vendor Management</h1>
                    <p className="text-muted-foreground">Manage your suppliers and service providers</p>
                </div>
                <Button onClick={() => { resetForm(); setShowDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search vendors..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {VENDOR_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchVendors}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Vendors Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Registered Vendors ({filteredVendors.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>TRN</TableHead>
                                <TableHead>Payment Terms</TableHead>
                                <TableHead className="text-right">Credit Limit</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredVendors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        {loading ? 'Loading vendors...' : 'No vendors found. Click "Add Vendor" to create one.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredVendors.map((vendor) => (
                                    <TableRow key={vendor.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{vendor.name}</p>
                                                {vendor.trading_name && (
                                                    <p className="text-xs text-muted-foreground">{vendor.trading_name}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{vendor.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>{vendor.contact_person || '-'}</p>
                                                {vendor.email && (
                                                    <p className="text-xs text-muted-foreground">{vendor.email}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{vendor.trn || '-'}</TableCell>
                                        <TableCell>
                                            <span className="capitalize">{vendor.payment_terms?.replace(/_/g, ' ')}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatCurrency(vendor.credit_limit, vendor.currency)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={vendor.is_active !== false ? 'bg-green-500' : 'bg-gray-500'}>
                                                {vendor.is_active !== false ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(vendor)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setEditingVendor(vendor); setShowDeleteDialog(true); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add/Edit Vendor Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                        <DialogDescription>Register a new supplier or service provider</DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="basic" className="mt-4">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="contact">Contact</TabsTrigger>
                            <TabsTrigger value="bank">Bank Details</TabsTrigger>
                            <TabsTrigger value="terms">Terms</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Vendor Name *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Legal company name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Trading Name</Label>
                                    <Input
                                        value={formData.trading_name}
                                        onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                                        placeholder="DBA / Brand name"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent>
                                        {VENDOR_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Items / Services Supplied</Label>
                                <Textarea
                                    value={formData.items_supplied}
                                    onChange={(e) => setFormData({ ...formData, items_supplied: e.target.value })}
                                    placeholder="List the products or services this vendor provides..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>TRN (Tax Registration Number)</Label>
                                <Input
                                    value={formData.trn}
                                    onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                                    placeholder="e.g., 100123456700003"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="contact" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Contact Person</Label>
                                    <Input
                                        value={formData.contact_person}
                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                        placeholder="Primary contact name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+971 XX XXX XXXX"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="accounts@vendor.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Street address"
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Dubai"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Country</Label>
                                    <Select value={formData.country} onValueChange={(v) => setFormData({ ...formData, country: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UAE">UAE</SelectItem>
                                            <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                                            <SelectItem value="India">India</SelectItem>
                                            <SelectItem value="UK">UK</SelectItem>
                                            <SelectItem value="USA">USA</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="bank" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Bank Name</Label>
                                <Input
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    placeholder="e.g., Mashreq Bank"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Account Number</Label>
                                    <Input
                                        value={formData.bank_account_number}
                                        onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                                        placeholder="Account number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Branch</Label>
                                    <Input
                                        value={formData.bank_branch}
                                        onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                                        placeholder="Branch name"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>IBAN</Label>
                                    <Input
                                        value={formData.bank_iban}
                                        onChange={(e) => setFormData({ ...formData, bank_iban: e.target.value })}
                                        placeholder="AE..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>SWIFT/BIC Code</Label>
                                    <Input
                                        value={formData.bank_swift}
                                        onChange={(e) => setFormData({ ...formData, bank_swift: e.target.value })}
                                        placeholder="e.g., BOMLAEAD"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="terms" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Payment Terms</Label>
                                    <Select value={formData.payment_terms} onValueChange={(v) => setFormData({ ...formData, payment_terms: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_TERMS.map(term => (
                                                <SelectItem key={term.id} value={term.id}>{term.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.payment_terms === 'custom' && (
                                    <div className="space-y-2">
                                        <Label>Custom Days</Label>
                                        <Input
                                            type="number"
                                            value={formData.custom_payment_days}
                                            onChange={(e) => setFormData({ ...formData, custom_payment_days: e.target.value })}
                                            placeholder="Number of days"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Credit Limit</Label>
                                    <Input
                                        type="number"
                                        value={formData.credit_limit}
                                        onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.00"
                                    />
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
                                <Label>Notes</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional notes about this vendor..."
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                                />
                                <Label>Active Vendor</Label>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingVendor ? 'Update Vendor' : 'Create Vendor'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{editingVendor?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default VendorManagementPage;

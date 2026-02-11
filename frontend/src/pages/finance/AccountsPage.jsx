import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, RefreshCw } from 'lucide-react';

const AccountsPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [form, setForm] = useState({
        code: '',
        name: '',
        account_type: '',
        subtype: '',
        currency: 'AED',
        description: ''
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/accounting/accounts');
            setAccounts(response.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const seedAccounts = async () => {
        try {
            await api.post('/accounting/accounts/seed');
            toast.success('Accounts seeded successfully');
            fetchAccounts();
        } catch (error) {
            toast.error('Failed to seed accounts');
        }
    };

    const openAddModal = () => {
        setEditingAccount(null);
        setForm({ code: '', name: '', account_type: '', subtype: '', currency: 'AED', description: '' });
        setShowModal(true);
    };

    const openEditModal = (account) => {
        setEditingAccount(account);
        setForm({
            code: account.code,
            name: account.name,
            account_type: account.account_type,
            subtype: account.subtype || '',
            currency: account.currency,
            description: account.description || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAccount) {
                await api.put(`/accounting/accounts/${editingAccount.id}`, form);
                toast.success('Account updated');
            } else {
                await api.post('/accounting/accounts', form);
                toast.success('Account created');
            }
            setShowModal(false);
            fetchAccounts();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const accountTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
    const subtypes = {
        Asset: ['Bank', 'Wallet', 'Cash', 'Receivable', 'Inventory', 'Other'],
        Liability: ['Payable', 'Loan', 'Other'],
        Equity: ['Owner', 'Retained', 'Other'],
        Income: ['Revenue', 'Other Income'],
        Expense: ['Operating', 'Administrative', 'Marketing', 'Other']
    };
    const currencies = ['AED', 'USD', 'INR', 'EUR', 'GBP', 'SAR'];

    return (
        <div className="space-y-6" data-testid="accounts-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
                    <p className="text-muted-foreground">Manage your accounting structure</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAccounts}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    {accounts.length === 0 && (
                        <Button variant="outline" onClick={seedAccounts}>Seed Default</Button>
                    )}
                    <Button onClick={openAddModal} data-testid="add-account-btn">
                        <Plus className="h-4 w-4 mr-2" />Add Account
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
                            <TableHead>Subtype</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accounts.map((account) => (
                            <TableRow key={account.id}>
                                <TableCell className="font-mono">{account.code}</TableCell>
                                <TableCell className="font-medium">{account.name}</TableCell>
                                <TableCell><Badge variant="outline">{account.account_type}</Badge></TableCell>
                                <TableCell>{account.subtype || '-'}</TableCell>
                                <TableCell>{account.currency}</TableCell>
                                <TableCell>
                                    <Badge variant={account.active ? 'default' : 'secondary'}>
                                        {account.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(account)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {accounts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    No accounts yet. Click "Seed Default" or "Add Account" to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add/Edit Account Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
                        <DialogDescription>
                            {editingAccount ? 'Update account details' : 'Create a new account in the chart of accounts'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Account Code</Label>
                                <Input 
                                    value={form.code} 
                                    onChange={(e) => setForm({ ...form, code: e.target.value })} 
                                    placeholder="e.g., 1001"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Account Name</Label>
                            <Input 
                                value={form.name} 
                                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                                placeholder="e.g., ADCB Bank"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Account Type</Label>
                                <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v, subtype: '' })}>
                                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {accountTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Subtype</Label>
                                <Select value={form.subtype} onValueChange={(v) => setForm({ ...form, subtype: v })} disabled={!form.account_type}>
                                    <SelectTrigger><SelectValue placeholder="Select subtype" /></SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {(subtypes[form.account_type] || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Input 
                                value={form.description} 
                                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                                placeholder="Brief description"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                            <Button type="submit">{editingAccount ? 'Update' : 'Create'} Account</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AccountsPage;

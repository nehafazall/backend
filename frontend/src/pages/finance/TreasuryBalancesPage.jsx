import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, RefreshCw, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ACCOUNT_OPTIONS = ["Mashreq", "ADIB", "Emirates Islamic", "Cash", "USDT", "INR"];
const CURRENCY_OPTIONS = ["AED", "USD", "INR"];

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
        return new Date(dateStr).toLocaleDateString('en-CA');
    } catch (e) {
        return "";
    }
};

const TreasuryBalancesPage = () => {
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        account: '',
        opening_balance: '',
        currency: 'AED'
    });
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const token = localStorage.getItem('token');

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/finance/treasury/balances`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRecords(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
        } catch (error) {
            toast.error('Failed to fetch balances');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setForm({
            date: new Date().toISOString().split('T')[0],
            account: '',
            opening_balance: '',
            currency: 'AED'
        });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        const payload = {
            ...form,
            opening_balance: parseFloat(form.opening_balance) || 0
        };

        try {
            const url = editingId 
                ? `${API_URL}/api/finance/treasury/balances/${editingId}`
                : `${API_URL}/api/finance/treasury/balances`;
            const method = editingId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(editingId ? 'Balance updated' : 'Balance created');
                resetForm();
                fetchRecords();
            } else {
                toast.error('Failed to save balance');
            }
        } catch (error) {
            toast.error('Error saving balance');
        }
        setSaving(false);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setForm({
            date: record.date?.split('T')[0] || '',
            account: record.account || '',
            opening_balance: record.opening_balance || '',
            currency: record.currency || 'AED'
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this balance?')) return;
        
        try {
            const response = await fetch(`${API_URL}/api/finance/treasury/balances/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Balance deleted');
                fetchRecords();
            }
        } catch (error) {
            toast.error('Error deleting balance');
        }
    };

    const latestBalances = useMemo(() => {
        const accountBalances = {};
        records.forEach(r => {
            if (!accountBalances[r.account] || new Date(r.date) > new Date(accountBalances[r.account].date)) {
                accountBalances[r.account] = r;
            }
        });
        return Object.values(accountBalances);
    }, [records]);

    const totalBalance = latestBalances.reduce((sum, b) => sum + (b.opening_balance || 0), 0);

    return (
        <div className="space-y-6" data-testid="treasury-balances-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-500">Treasury - Opening Balances</h1>
                    <p className="text-muted-foreground">Manage account opening balances</p>
                </div>
                <Button variant="outline" onClick={fetchRecords}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add/Update Balance</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                        />
                        <Select value={form.account} onValueChange={(v) => handleChange('account', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Account" />
                            </SelectTrigger>
                            <SelectContent>
                                {ACCOUNT_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            placeholder="Opening Balance"
                            value={form.opening_balance}
                            onChange={(e) => handleChange('opening_balance', e.target.value)}
                            required
                        />
                        <Select value={form.currency} onValueChange={(v) => handleChange('currency', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            {editingId && (
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="h-4 w-4 mr-2" />
                                {saving ? 'Saving...' : (editingId ? 'Update' : 'Add')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Current Balances by Account</CardTitle>
                        <CardDescription>Latest recorded balance for each account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {latestBalances.map(b => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">{b.account}</TableCell>
                                        <TableCell>{formatDate(b.date)}</TableCell>
                                        <TableCell>{b.currency}</TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500">
                                            {formatNumber(b.opening_balance)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                        <Wallet className="h-5 w-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-500">AED {formatNumber(totalBalance)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across {latestBalances.length} accounts</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Balance History</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.slice(0, 20).map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell>{formatDate(record.date)}</TableCell>
                                        <TableCell>{record.account}</TableCell>
                                        <TableCell>{record.currency}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatNumber(record.opening_balance)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(record)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="text-red-500"
                                                    onClick={() => handleDelete(record.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TreasuryBalancesPage;

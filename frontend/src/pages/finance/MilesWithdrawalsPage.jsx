import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Pencil, Trash2, Minus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const USD_TO_AED_RATE = 3.674;

const PAYMENT_METHOD_OPTIONS = ["Mashreq", "ADIB", "Emirates Islamic", "Cash", "USDT", "INR"];
const CURRENCY_OPTIONS = ["AED", "USD", "INR"];

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "";
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

const MilesWithdrawalsPage = () => {
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        name: '',
        payment_method: '',
        amount: '',
        currency: 'AED'
    });
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const token = localStorage.getItem('clt_token');

    const convertToAED = useCallback((amount, currency) => {
        const amt = parseFloat(amount) || 0;
        if (currency === "USD") return amt * USD_TO_AED_RATE;
        if (currency === "INR") return amt * 0.045;
        return amt;
    }, []);

    const amountInAED = useMemo(() => convertToAED(form.amount, form.currency), [form.amount, form.currency, convertToAED]);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/finance/miles/withdrawals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRecords(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
        } catch (error) {
            toast.error('Failed to fetch withdrawals');
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
            name: '',
            payment_method: '',
            amount: '',
            currency: 'AED'
        });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        const payload = {
            ...form,
            amount: parseFloat(form.amount) || 0,
            amount_in_aed: amountInAED
        };

        try {
            const url = editingId 
                ? `${API_URL}/api/finance/miles/withdrawals/${editingId}`
                : `${API_URL}/api/finance/miles/withdrawals`;
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
                toast.success(editingId ? 'Withdrawal updated' : 'Withdrawal created');
                resetForm();
                fetchRecords();
            } else {
                toast.error('Failed to save withdrawal');
            }
        } catch (error) {
            toast.error('Error saving withdrawal');
        }
        setSaving(false);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setForm({
            date: record.date?.split('T')[0] || '',
            name: record.name || '',
            payment_method: record.payment_method || '',
            amount: record.amount || '',
            currency: record.currency || 'AED'
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this withdrawal?')) return;
        
        try {
            const response = await fetch(`${API_URL}/api/finance/miles/withdrawals/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Withdrawal deleted');
                fetchRecords();
            }
        } catch (error) {
            toast.error('Error deleting withdrawal');
        }
    };

    const handleExport = () => {
        const headers = ['Date', 'Name', 'Payment Method', 'Amount (AED)'];
        const rows = records.map(r => [
            formatDate(r.date),
            r.name,
            r.payment_method,
            formatNumber(r.amount_in_aed)
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'miles_withdrawals.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
    };

    const paginatedRecords = useMemo(() => {
        const start = (page - 1) * pageSize;
        return records.slice(start, start + pageSize);
    }, [records, page]);

    const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
    const totalWithdrawals = records.reduce((sum, r) => sum + (r.amount_in_aed || 0), 0);

    return (
        <div className="space-y-6" data-testid="miles-withdrawals-page">
            <Card>
                <CardHeader>
                    <CardTitle className="text-blue-500">Miles Capitals - Withdrawals</CardTitle>
                    <CardDescription>Record capital withdrawals</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                            data-testid="withdrawal-date"
                        />
                        <Input
                            placeholder="Withdrawer Name"
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            required
                            data-testid="withdrawal-name"
                        />
                        <Select value={form.payment_method} onValueChange={(v) => handleChange('payment_method', v)}>
                            <SelectTrigger data-testid="withdrawal-method">
                                <SelectValue placeholder="Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHOD_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={form.amount}
                            onChange={(e) => handleChange('amount', e.target.value)}
                            required
                            data-testid="withdrawal-amount"
                        />
                        <Select value={form.currency} onValueChange={(v) => handleChange('currency', v)}>
                            <SelectTrigger data-testid="withdrawal-currency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center px-3 py-2 bg-muted rounded-md font-mono">
                            AED: {formatNumber(amountInAED)}
                        </div>
                        <div className="lg:col-span-3 flex justify-end gap-2">
                            {editingId && (
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                                <Minus className="h-4 w-4 mr-2" />
                                {saving ? 'Saving...' : (editingId ? 'Update' : 'Add Withdrawal')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Total Withdrawals</div>
                        <div className="text-3xl font-bold text-red-500">AED {formatNumber(totalWithdrawals)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Total Transactions</div>
                        <div className="text-3xl font-bold">{records.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Withdrawals History</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead className="text-right">Amount (AED)</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{formatDate(record.date)}</TableCell>
                                            <TableCell>{record.name}</TableCell>
                                            <TableCell>{record.payment_method}</TableCell>
                                            <TableCell className="text-right font-mono text-red-600">
                                                -{formatNumber(record.amount_in_aed)}
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
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-muted-foreground">
                                    Page {page} of {totalPages} ({records.length} records)
                                </span>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MilesWithdrawalsPage;

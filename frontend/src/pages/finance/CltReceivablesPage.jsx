import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const USD_TO_AED_RATE = 3.674;

const PAYMENT_METHOD_OPTIONS = ["USDT", "Bank", "Tabby", "Tamara", "Payorc", "Network", "INR", "Pay by Link", "Cash"];
const PAYMENT_FOR_OPTIONS = ["Basic Course", "Intermediate Course", "Upgrade", "Add-ons", "Others"];
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

const CltReceivablesPage = () => {
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        account_name: '',
        amount: '',
        currency: 'AED',
        payment_method: '',
        payment_for: '',
        other_description: ''
    });
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const token = localStorage.getItem('token');

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
            const response = await fetch(`${API_URL}/api/finance/clt/receivables`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRecords(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
        } catch (error) {
            toast.error('Failed to fetch receivables');
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
            account_name: '',
            amount: '',
            currency: 'AED',
            payment_method: '',
            payment_for: '',
            other_description: ''
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
                ? `${API_URL}/api/finance/clt/receivables/${editingId}`
                : `${API_URL}/api/finance/clt/receivables`;
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
                toast.success(editingId ? 'Receivable updated' : 'Receivable created');
                resetForm();
                fetchRecords();
            } else {
                toast.error('Failed to save receivable');
            }
        } catch (error) {
            toast.error('Error saving receivable');
        }
        setSaving(false);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setForm({
            date: record.date?.split('T')[0] || '',
            account_name: record.account_name || '',
            amount: record.amount || '',
            currency: record.currency || 'AED',
            payment_method: record.payment_method || '',
            payment_for: record.payment_for || '',
            other_description: record.other_description || ''
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this receivable?')) return;
        
        try {
            const response = await fetch(`${API_URL}/api/finance/clt/receivables/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Receivable deleted');
                fetchRecords();
            }
        } catch (error) {
            toast.error('Error deleting receivable');
        }
    };

    const handleExport = () => {
        const headers = ['Date', 'Account Name', 'Payment Method', 'Payment For', 'Amount (AED)'];
        const rows = records.map(r => [
            formatDate(r.date),
            r.account_name,
            r.payment_method,
            r.payment_for,
            formatNumber(r.amount_in_aed)
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'clt_receivables.csv';
        a.click();
    };

    const paginatedRecords = useMemo(() => {
        const start = (page - 1) * pageSize;
        return records.slice(start, start + pageSize);
    }, [records, page]);

    const totalPages = Math.max(1, Math.ceil(records.length / pageSize));

    return (
        <div className="space-y-6" data-testid="clt-receivables-page">
            <Card>
                <CardHeader>
                    <CardTitle className="text-red-500">CLT Receivables</CardTitle>
                    <CardDescription>Record incoming payments for CLT Academy</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                            data-testid="receivable-date"
                        />
                        <Input
                            placeholder="Account Name"
                            value={form.account_name}
                            onChange={(e) => handleChange('account_name', e.target.value)}
                            required
                            data-testid="receivable-account"
                        />
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={form.amount}
                            onChange={(e) => handleChange('amount', e.target.value)}
                            required
                            data-testid="receivable-amount"
                        />
                        <Select value={form.currency} onValueChange={(v) => handleChange('currency', v)}>
                            <SelectTrigger data-testid="receivable-currency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={form.payment_method} onValueChange={(v) => handleChange('payment_method', v)}>
                            <SelectTrigger data-testid="receivable-method">
                                <SelectValue placeholder="Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHOD_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={form.payment_for} onValueChange={(v) => handleChange('payment_for', v)}>
                            <SelectTrigger data-testid="receivable-for">
                                <SelectValue placeholder="Payment For" />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_FOR_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {form.payment_for === 'Others' && (
                            <Textarea
                                placeholder="Describe 'Other'"
                                value={form.other_description}
                                onChange={(e) => handleChange('other_description', e.target.value)}
                                className="lg:col-span-2"
                            />
                        )}
                        <div className="flex items-center px-3 py-2 bg-muted rounded-md font-mono">
                            AED: {formatNumber(amountInAED)}
                        </div>
                        <div className="lg:col-span-4 flex justify-end gap-2">
                            {editingId && (
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700">
                                <Plus className="h-4 w-4 mr-2" />
                                {saving ? 'Saving...' : (editingId ? 'Update' : 'Add Receivable')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Receivables History</CardTitle>
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
                                        <TableHead>Account Name</TableHead>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead>Payment For</TableHead>
                                        <TableHead className="text-right">Amount (AED)</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{formatDate(record.date)}</TableCell>
                                            <TableCell>{record.account_name}</TableCell>
                                            <TableCell>{record.payment_method}</TableCell>
                                            <TableCell>{record.payment_for}</TableCell>
                                            <TableCell className="text-right font-mono text-green-600">
                                                {formatNumber(record.amount_in_aed)}
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

export default CltReceivablesPage;

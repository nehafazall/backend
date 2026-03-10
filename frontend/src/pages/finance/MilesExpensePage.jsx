import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const USD_TO_AED_RATE = 3.674;

const COST_CENTER_OPTIONS = ["Marketing", "Operations", "IT", "Salary & Commissions", "Miscellaneous"];
const SUB_COST_CENTERS = {
    "Salary & Commissions": ["Salary", "Commissions"],
    "Marketing": ["Meta Ads", "Agency Fees", "Promotional Items", "Billboard Advertising", "Branding"],
    "IT": ["Assets", "Subscriptions", "Server Costs", "Software Solutions"],
    "Operations": ["Rent", "DEWA", "Air Tickets", "Documentation", "Visa", "Insurance", "Office Supplies", "Telecom Charges", "Banking Charges", "Wifi"],
    "Miscellaneous": ["Miscellaneous Expense", "Entertainment", "Event", "Employee Rewards"],
};
const SOURCE_OPTIONS = ["Mashreq", "ADIB", "Emirates Islamic", "Cash", "USDT", "INR"];
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

const MilesExpensePage = () => {
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        account_name: '',
        cost_center: '',
        sub_cost_center: '',
        source: 'Mashreq',
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
            const response = await fetch(`${API_URL}/api/finance/miles/expenses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRecords(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
        } catch (error) {
            toast.error('Failed to fetch expenses');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleChange = (name, value) => {
        setForm(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'cost_center' && { sub_cost_center: '' })
        }));
    };

    const resetForm = () => {
        setForm({
            date: new Date().toISOString().split('T')[0],
            account_name: '',
            cost_center: '',
            sub_cost_center: '',
            source: 'Mashreq',
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
                ? `${API_URL}/api/finance/miles/expenses/${editingId}`
                : `${API_URL}/api/finance/miles/expenses`;
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
                toast.success(editingId ? 'Expense updated' : 'Expense created');
                resetForm();
                fetchRecords();
            } else {
                toast.error('Failed to save expense');
            }
        } catch (error) {
            toast.error('Error saving expense');
        }
        setSaving(false);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setForm({
            date: record.date?.split('T')[0] || '',
            account_name: record.account_name || '',
            cost_center: record.cost_center || '',
            sub_cost_center: record.sub_cost_center || '',
            source: record.source || 'Mashreq',
            amount: record.amount || '',
            currency: record.currency || 'AED'
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        
        try {
            const response = await fetch(`${API_URL}/api/finance/miles/expenses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Expense deleted');
                fetchRecords();
            }
        } catch (error) {
            toast.error('Error deleting expense');
        }
    };

    const handleExport = () => {
        const headers = ['Date', 'Account', 'Cost Center', 'Sub Cost Center', 'Source', 'Amount (AED)'];
        const rows = records.map(r => [
            formatDate(r.date),
            r.account_name,
            r.cost_center,
            r.sub_cost_center,
            r.source,
            formatNumber(r.amount_in_aed)
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'miles_expenses.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
    };

    const paginatedRecords = useMemo(() => {
        const start = (page - 1) * pageSize;
        return records.slice(start, start + pageSize);
    }, [records, page]);

    const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
    const totalExpenses = records.reduce((sum, r) => sum + (r.amount_in_aed || 0), 0);

    return (
        <div className="space-y-6" data-testid="miles-expense-page">
            <Card>
                <CardHeader>
                    <CardTitle className="text-blue-500">Miles Capitals - Expenses</CardTitle>
                    <CardDescription>Record operational expenses</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                            data-testid="expense-date"
                        />
                        <Input
                            placeholder="Account Name"
                            value={form.account_name}
                            onChange={(e) => handleChange('account_name', e.target.value)}
                            required
                            data-testid="expense-account"
                        />
                        <Select value={form.cost_center} onValueChange={(v) => handleChange('cost_center', v)}>
                            <SelectTrigger data-testid="expense-cost-center">
                                <SelectValue placeholder="Cost Center" />
                            </SelectTrigger>
                            <SelectContent>
                                {COST_CENTER_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select 
                            value={form.sub_cost_center} 
                            onValueChange={(v) => handleChange('sub_cost_center', v)}
                            disabled={!form.cost_center}
                        >
                            <SelectTrigger data-testid="expense-sub-cost-center">
                                <SelectValue placeholder="Sub Cost Center" />
                            </SelectTrigger>
                            <SelectContent>
                                {(SUB_COST_CENTERS[form.cost_center] || []).map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={form.source} onValueChange={(v) => handleChange('source', v)}>
                            <SelectTrigger data-testid="expense-source">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={form.amount}
                            onChange={(e) => handleChange('amount', e.target.value)}
                            required
                            data-testid="expense-amount"
                        />
                        <Select value={form.currency} onValueChange={(v) => handleChange('currency', v)}>
                            <SelectTrigger data-testid="expense-currency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center px-3 py-2 bg-muted rounded-md font-mono">
                            AED: {formatNumber(amountInAED)}
                        </div>
                        <div className="lg:col-span-4 flex justify-end gap-2">
                            {editingId && (
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4 mr-2" />
                                {saving ? 'Saving...' : (editingId ? 'Update' : 'Add Expense')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Total Expenses</div>
                    <div className="text-3xl font-bold text-red-500">AED {formatNumber(totalExpenses)}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Expenses History</CardTitle>
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
                                        <TableHead>Account</TableHead>
                                        <TableHead>Cost Center</TableHead>
                                        <TableHead>Sub Cost Center</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Amount (AED)</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{formatDate(record.date)}</TableCell>
                                            <TableCell>{record.account_name}</TableCell>
                                            <TableCell>{record.cost_center}</TableCell>
                                            <TableCell>{record.sub_cost_center}</TableCell>
                                            <TableCell>{record.source}</TableCell>
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

export default MilesExpensePage;

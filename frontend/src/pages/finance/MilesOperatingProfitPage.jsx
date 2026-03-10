import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Pencil, Trash2, Target } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const USD_TO_AED_RATE = 3.674;

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

const MilesOperatingProfitPage = () => {
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        lp_booked_amount: '',
        lp_booked_currency: 'USD',
        lp_floating_amount: '',
        lp_floating_currency: 'USD',
        miles_booked_amount: '',
        miles_booked_currency: 'USD',
        miles_floating_amount: '',
        miles_floating_currency: 'USD'
    });
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const token = localStorage.getItem('clt_token');

    const convertToUSD = useCallback((amount, currency) => {
        const amt = parseFloat(amount) || 0;
        if (currency === "AED") return amt / USD_TO_AED_RATE;
        if (currency === "INR") return amt * 0.012;
        return amt;
    }, []);

    const calculatedProfit = useMemo(() => {
        const lpBooked = convertToUSD(form.lp_booked_amount, form.lp_booked_currency);
        const lpFloating = convertToUSD(form.lp_floating_amount, form.lp_floating_currency);
        const milesBooked = convertToUSD(form.miles_booked_amount, form.miles_booked_currency);
        const milesFloating = convertToUSD(form.miles_floating_amount, form.miles_floating_currency);
        
        const profitUSD = lpBooked + lpFloating + milesBooked + milesFloating;
        const profitAED = profitUSD * USD_TO_AED_RATE;
        
        return { profitUSD, profitAED };
    }, [form, convertToUSD]);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/finance/miles/operating-profit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRecords(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
        } catch (error) {
            toast.error('Failed to fetch operating profit records');
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
            lp_booked_amount: '',
            lp_booked_currency: 'USD',
            lp_floating_amount: '',
            lp_floating_currency: 'USD',
            miles_booked_amount: '',
            miles_booked_currency: 'USD',
            miles_floating_amount: '',
            miles_floating_currency: 'USD'
        });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        const payload = {
            ...form,
            lp_booked_amount: parseFloat(form.lp_booked_amount) || 0,
            lp_floating_amount: parseFloat(form.lp_floating_amount) || 0,
            miles_booked_amount: parseFloat(form.miles_booked_amount) || 0,
            miles_floating_amount: parseFloat(form.miles_floating_amount) || 0,
            operating_profit_usd: calculatedProfit.profitUSD,
            operating_profit_aed: calculatedProfit.profitAED
        };

        try {
            const url = editingId 
                ? `${API_URL}/api/finance/miles/operating-profit/${editingId}`
                : `${API_URL}/api/finance/miles/operating-profit`;
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
                toast.success(editingId ? 'Record updated' : 'Record created');
                resetForm();
                fetchRecords();
            } else {
                toast.error('Failed to save record');
            }
        } catch (error) {
            toast.error('Error saving record');
        }
        setSaving(false);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setForm({
            date: record.date?.split('T')[0] || '',
            lp_booked_amount: record.lp_booked_amount || '',
            lp_booked_currency: record.lp_booked_currency || 'USD',
            lp_floating_amount: record.lp_floating_amount || '',
            lp_floating_currency: record.lp_floating_currency || 'USD',
            miles_booked_amount: record.miles_booked_amount || '',
            miles_booked_currency: record.miles_booked_currency || 'USD',
            miles_floating_amount: record.miles_floating_amount || '',
            miles_floating_currency: record.miles_floating_currency || 'USD'
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        
        try {
            const response = await fetch(`${API_URL}/api/finance/miles/operating-profit/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Record deleted');
                fetchRecords();
            }
        } catch (error) {
            toast.error('Error deleting record');
        }
    };

    const handleExport = () => {
        const headers = ['Date', 'LP Booked (USD)', 'LP Floating (USD)', 'Miles Booked (USD)', 'Miles Floating (USD)', 'Total Profit (USD)', 'Total Profit (AED)'];
        const rows = records.map(r => [
            formatDate(r.date),
            formatNumber(r.lp_booked_amount),
            formatNumber(r.lp_floating_amount),
            formatNumber(r.miles_booked_amount),
            formatNumber(r.miles_floating_amount),
            formatNumber(r.operating_profit_usd),
            formatNumber(r.operating_profit_aed)
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'miles_operating_profit.csv';
        a.click();
    };

    const paginatedRecords = useMemo(() => {
        const start = (page - 1) * pageSize;
        return records.slice(start, start + pageSize);
    }, [records, page]);

    const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
    const totalProfitUSD = records.reduce((sum, r) => sum + (r.operating_profit_usd || 0), 0);
    const totalProfitAED = records.reduce((sum, r) => sum + (r.operating_profit_aed || 0), 0);

    const CURRENCY_OPTIONS = ["USD", "AED", "INR"];

    return (
        <div className="space-y-6" data-testid="miles-operating-profit-page">
            <Card>
                <CardHeader>
                    <CardTitle className="text-blue-500">Miles Capitals - Operating Profit</CardTitle>
                    <CardDescription>Daily operating profit recording</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => handleChange('date', e.target.value)}
                                required
                                data-testid="profit-date"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-muted/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">LP Provider</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Booked Amount"
                                            value={form.lp_booked_amount}
                                            onChange={(e) => handleChange('lp_booked_amount', e.target.value)}
                                        />
                                        <Select value={form.lp_booked_currency} onValueChange={(v) => handleChange('lp_booked_currency', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Floating Amount"
                                            value={form.lp_floating_amount}
                                            onChange={(e) => handleChange('lp_floating_amount', e.target.value)}
                                        />
                                        <Select value={form.lp_floating_currency} onValueChange={(v) => handleChange('lp_floating_currency', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Miles Trading</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Booked Amount"
                                            value={form.miles_booked_amount}
                                            onChange={(e) => handleChange('miles_booked_amount', e.target.value)}
                                        />
                                        <Select value={form.miles_booked_currency} onValueChange={(v) => handleChange('miles_booked_currency', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Floating Amount"
                                            value={form.miles_floating_amount}
                                            onChange={(e) => handleChange('miles_floating_amount', e.target.value)}
                                        />
                                        <Select value={form.miles_floating_currency} onValueChange={(v) => handleChange('miles_floating_currency', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <div>
                                <p className="text-sm text-muted-foreground">Calculated Operating Profit</p>
                                <div className="flex gap-6 mt-1">
                                    <span className="text-xl font-bold text-green-500">USD {formatNumber(calculatedProfit.profitUSD)}</span>
                                    <span className="text-xl font-bold text-blue-500">AED {formatNumber(calculatedProfit.profitAED)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {editingId && (
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                )}
                                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                                    <Target className="h-4 w-4 mr-2" />
                                    {saving ? 'Saving...' : (editingId ? 'Update' : 'Record Profit')}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Total Profit (USD)</div>
                        <div className="text-3xl font-bold text-green-500">$ {formatNumber(totalProfitUSD)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Total Profit (AED)</div>
                        <div className="text-3xl font-bold text-blue-500">AED {formatNumber(totalProfitAED)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Profit History</CardTitle>
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
                                        <TableHead className="text-right">LP Booked</TableHead>
                                        <TableHead className="text-right">LP Floating</TableHead>
                                        <TableHead className="text-right">Miles Booked</TableHead>
                                        <TableHead className="text-right">Miles Floating</TableHead>
                                        <TableHead className="text-right">Profit (USD)</TableHead>
                                        <TableHead className="text-right">Profit (AED)</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{formatDate(record.date)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(record.lp_booked_amount)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(record.lp_floating_amount)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(record.miles_booked_amount)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(record.miles_floating_amount)}</TableCell>
                                            <TableCell className="text-right font-mono text-green-600">
                                                {formatNumber(record.operating_profit_usd)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-blue-600">
                                                {formatNumber(record.operating_profit_aed)}
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

export default MilesOperatingProfitPage;

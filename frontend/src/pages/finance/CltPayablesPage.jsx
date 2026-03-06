import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Pencil, Trash2, Plus, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

const USD_TO_AED_RATE = 3.674;
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

const CltPayablesPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        currency: 'AED',
        account_name: '',
        cost_center_id: '',
        cost_center: '',
        sub_cost_center: '',
        bank_account_id: '',
        source: ''
    });
    const [records, setRecords] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        costCenter: 'all',
        bank: 'all',
        status: 'all'
    });

    const convertToAED = useCallback((amount, currency) => {
        const amt = parseFloat(amount) || 0;
        if (currency === "USD") return amt * USD_TO_AED_RATE;
        if (currency === "INR") return amt * 0.045;
        return amt;
    }, []);

    const amountInAED = useMemo(() => convertToAED(form.amount, form.currency), [form.amount, form.currency, convertToAED]);

    // Fetch all data including Finance Settings
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [payablesRes, costCentersRes, bankAccountsRes] = await Promise.all([
                api.get('/finance/clt/payables'),
                api.get('/finance/settings/cost-centers'),
                api.get('/finance/settings/bank-accounts')
            ]);
            
            setRecords((payablesRes.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
            setCostCenters(costCentersRes.data?.filter(c => c.is_active !== false) || []);
            setBankAccounts(bankAccountsRes.data?.filter(b => b.is_active !== false) || []);
        } catch (error) {
            toast.error('Failed to fetch data');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Get unique departments from cost centers (for grouping)
    const costCentersByDepartment = useMemo(() => {
        const grouped = {};
        costCenters.forEach(cc => {
            const dept = cc.department || 'General';
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push(cc);
        });
        return grouped;
    }, [costCenters]);

    const handleChange = (name, value) => {
        setForm(prev => {
            const updates = { [name]: value };
            
            // When cost center changes, set the name and clear sub cost center
            if (name === 'cost_center_id') {
                const selected = costCenters.find(c => c.id === value);
                updates.cost_center = selected?.name || '';
                updates.sub_cost_center = '';
            }
            
            // When bank account changes, set the source name
            if (name === 'bank_account_id') {
                const selected = bankAccounts.find(b => b.id === value);
                updates.source = selected ? `${selected.bank_name} - ${selected.account_name}` : '';
            }
            
            return { ...prev, ...updates };
        });
    };

    const resetForm = () => {
        setForm({
            date: new Date().toISOString().split('T')[0],
            amount: '',
            currency: 'AED',
            account_name: '',
            cost_center_id: '',
            cost_center: '',
            sub_cost_center: '',
            bank_account_id: '',
            source: ''
        });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.bank_account_id) {
            toast.error('Please select a bank account');
            return;
        }
        
        setSaving(true);
        
        const payload = {
            ...form,
            amount: parseFloat(form.amount) || 0,
            amount_in_aed: amountInAED
        };

        try {
            if (editingId) {
                await api.put(`/finance/clt/payables/${editingId}`, payload);
                toast.success('Payable updated');
            } else {
                await api.post('/finance/clt/payables', payload);
                toast.success('Payable created');
            }
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error saving payable');
        }
        setSaving(false);
    };

    const handleEdit = (record) => {
        setEditingId(record.id);
        setForm({
            date: record.date?.split('T')[0] || '',
            amount: record.amount || '',
            currency: record.currency || 'AED',
            account_name: record.account_name || '',
            cost_center_id: record.cost_center_id || '',
            cost_center: record.cost_center || '',
            sub_cost_center: record.sub_cost_center || '',
            bank_account_id: record.bank_account_id || '',
            source: record.source || ''
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this payable?')) return;
        
        try {
            await api.delete(`/finance/clt/payables/${id}`);
            toast.success('Payable deleted');
            fetchData();
        } catch (error) {
            toast.error('Error deleting payable');
        }
    };

    const handleExport = () => {
        const headers = ['Date', 'Account', 'Cost Center', 'Sub Cost Center', 'Bank Account', 'Amount (AED)'];
        const rows = records.map(r => [
            formatDate(r.date),
            r.account_name,
            r.cost_center,
            r.sub_cost_center,
            r.source,
            formatNumber(r.amount_in_aed)
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'clt_payables.csv';
        a.click();
    };

    // Filter records based on filters
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            // Date filters
            if (filters.dateFrom && r.date < filters.dateFrom) return false;
            if (filters.dateTo && r.date > filters.dateTo) return false;
            
            // Cost Center filter
            if (filters.costCenter !== 'all' && r.cost_center_id !== filters.costCenter) return false;
            
            // Bank filter
            if (filters.bank !== 'all' && r.bank_account_id !== filters.bank) return false;
            
            // Status filter
            if (filters.status !== 'all') {
                const isPaid = r.status === 'paid';
                if (filters.status === 'paid' && !isPaid) return false;
                if (filters.status === 'pending' && isPaid) return false;
            }
            
            return true;
        });
    }, [records, filters]);

    // Calculate filtered total
    const filteredTotal = useMemo(() => {
        return filteredRecords.reduce((sum, r) => sum + (r.amount_in_aed || r.amount || 0), 0);
    }, [filteredRecords]);

    const paginatedRecords = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRecords.slice(start, start + pageSize);
    }, [filteredRecords, page]);

    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));

    return (
        <div className="space-y-6" data-testid="clt-payables-page">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-red-500">CLT Payables</CardTitle>
                            <CardDescription>Record outgoing payments for CLT Academy</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate('/finance/settings/cost-centers')}>
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Cost Centers
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {costCenters.length === 0 && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
                            <strong>Note:</strong> No cost centers configured. 
                            <Button variant="link" className="h-auto p-0 ml-1 text-amber-500" onClick={() => navigate('/finance/settings/cost-centers')}>
                                Add cost centers in Finance Settings
                            </Button>
                        </div>
                    )}
                    {bankAccounts.length === 0 && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
                            <strong>Note:</strong> No bank accounts configured. 
                            <Button variant="link" className="h-auto p-0 ml-1 text-amber-500" onClick={() => navigate('/finance/settings/bank-accounts')}>
                                Add bank accounts in Finance Settings
                            </Button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                            data-testid="payable-date"
                        />
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={form.amount}
                            onChange={(e) => handleChange('amount', e.target.value)}
                            required
                            data-testid="payable-amount"
                        />
                        <Select value={form.currency} onValueChange={(v) => handleChange('currency', v)}>
                            <SelectTrigger data-testid="payable-currency">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Payee / Account Name"
                            value={form.account_name}
                            onChange={(e) => handleChange('account_name', e.target.value)}
                            required
                            data-testid="payable-account"
                        />
                        
                        {/* Cost Center from Finance Settings */}
                        <Select value={form.cost_center_id} onValueChange={(v) => handleChange('cost_center_id', v)}>
                            <SelectTrigger data-testid="payable-cost-center">
                                <SelectValue placeholder="Select Cost Center" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(costCentersByDepartment).map(([dept, centers]) => (
                                    <React.Fragment key={dept}>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">{dept}</div>
                                        {centers.map(cc => (
                                            <SelectItem key={cc.id} value={cc.id}>
                                                {cc.code} - {cc.name}
                                            </SelectItem>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {/* Sub Cost Center (manual input for now) */}
                        <Input
                            placeholder="Sub Cost Center (optional)"
                            value={form.sub_cost_center}
                            onChange={(e) => handleChange('sub_cost_center', e.target.value)}
                            data-testid="payable-sub-cost-center"
                        />
                        
                        {/* Bank Account from Finance Settings */}
                        <Select value={form.bank_account_id} onValueChange={(v) => handleChange('bank_account_id', v)}>
                            <SelectTrigger data-testid="payable-source">
                                <SelectValue placeholder="Select Bank Account" />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts.map(ba => (
                                    <SelectItem key={ba.id} value={ba.id}>
                                        {ba.bank_name} - {ba.account_name} ({ba.currency})
                                    </SelectItem>
                                ))}
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
                            <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700">
                                <Plus className="h-4 w-4 mr-2" />
                                {saving ? 'Saving...' : (editingId ? 'Update' : 'Add Payable')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Payables History</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchData}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Date From</label>
                            <Input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                                className="h-9"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Date To</label>
                            <Input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                                className="h-9"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Cost Center</label>
                            <Select value={filters.costCenter} onValueChange={(v) => setFilters(f => ({ ...f, costCenter: v }))}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Cost Centers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Cost Centers</SelectItem>
                                    {costCenters.map(cc => (
                                        <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Bank Account</label>
                            <Select value={filters.bank} onValueChange={(v) => setFilters(f => ({ ...f, bank: v }))}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Banks" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Banks</SelectItem>
                                    {bankAccounts.map(ba => (
                                        <SelectItem key={ba.id} value={ba.id}>{ba.bank_name} - {ba.account_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                            <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Summary Row */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                                Showing {filteredRecords.length} of {records.length} records
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm">
                                <span className="text-muted-foreground">Total: </span>
                                <span className="font-bold text-red-500">AED {formatNumber(filteredTotal)}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setFilters({ dateFrom: '', dateTo: '', costCenter: 'all', bank: 'all', status: 'all' })}>
                                Clear Filters
                            </Button>
                        </div>
                    </div>

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
                                        <TableHead>Payee</TableHead>
                                        <TableHead>Cost Center</TableHead>
                                        <TableHead>Sub Cost Center</TableHead>
                                        <TableHead>Bank Account</TableHead>
                                        <TableHead className="text-right">Amount (AED)</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRecords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                No payables recorded yet
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedRecords.map(record => (
                                            <TableRow key={record.id}>
                                                <TableCell>{formatDate(record.date)}</TableCell>
                                                <TableCell>{record.account_name}</TableCell>
                                                <TableCell>{record.cost_center}</TableCell>
                                                <TableCell>{record.sub_cost_center || '-'}</TableCell>
                                                <TableCell>{record.source}</TableCell>
                                                <TableCell className="text-right font-mono text-red-500">
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
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-muted-foreground">
                                    Page {page} of {totalPages} ({filteredRecords.length} records)
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

export default CltPayablesPage;

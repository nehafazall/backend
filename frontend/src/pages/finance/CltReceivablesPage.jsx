import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, Pencil, Trash2, Plus, RefreshCw, Settings, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

const USD_TO_AED_RATE = 3.674;
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
    const navigate = useNavigate();
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        account_name: '',
        amount: '',
        currency: 'AED',
        payment_gateway_id: '',
        payment_method: '',
        bank_account_id: '',
        destination_bank: '',
        payment_for: '',
        other_description: ''
    });
    const [records, setRecords] = useState([]);
    const [paymentGateways, setPaymentGateways] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        gateway: 'all',
        settlementStatus: 'all',
        bank: 'all'
    });
    const [pspMappings, setPspMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;

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
            const [receivablesRes, gatewaysRes, bankAccountsRes, pspMappingsRes] = await Promise.all([
                api.get('/finance/clt/receivables'),
                api.get('/finance/settings/payment-gateways'),
                api.get('/finance/settings/bank-accounts'),
                api.get('/finance/settings/psp-bank-mapping')
            ]);
            
            setRecords((receivablesRes.data || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
            setPaymentGateways(gatewaysRes.data?.filter(g => g.is_active !== false) || []);
            setBankAccounts(bankAccountsRes.data?.filter(b => b.is_active !== false) || []);
            setPspMappings(pspMappingsRes.data?.filter(m => m.is_active !== false) || []);
        } catch (error) {
            toast.error('Failed to fetch data');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Get the mapped bank account for a payment gateway
    const getDestinationBankForGateway = useCallback((gatewayId) => {
        const mapping = pspMappings.find(m => m.gateway_id === gatewayId);
        if (mapping) {
            return {
                bank_account_id: mapping.gateway_id, // Use gateway_id as reference
                bank_name: mapping.bank_name,
                account_number: mapping.bank_account_number
            };
        }
        return null;
    }, [pspMappings]);

    // Calculate settlement date based on gateway rules
    const calculateSettlementDate = useCallback((gateway, transactionDate) => {
        if (!gateway || !transactionDate) return null;
        
        const date = new Date(transactionDate);
        
        if (gateway.settlement_day_of_week) {
            // Weekly settlement (e.g., Tabby settles on Monday)
            const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const targetDay = dayMap[gateway.settlement_day_of_week.toLowerCase()];
            const currentDay = date.getDay();
            let daysUntilSettlement = targetDay - currentDay;
            if (daysUntilSettlement <= 0) daysUntilSettlement += 7;
            date.setDate(date.getDate() + daysUntilSettlement);
        } else {
            // T+n days settlement
            date.setDate(date.getDate() + (gateway.settlement_days || 1));
        }
        
        return date.toISOString().split('T')[0];
    }, []);

    const handleChange = (name, value) => {
        setForm(prev => {
            const updates = { [name]: value };
            
            // When payment gateway changes, set the name and auto-select destination bank
            if (name === 'payment_gateway_id') {
                const selectedGateway = paymentGateways.find(g => g.id === value);
                updates.payment_method = selectedGateway?.name || '';
                
                // Auto-select destination bank from PSP mapping
                const destBank = getDestinationBankForGateway(value);
                if (destBank) {
                    updates.destination_bank = `${destBank.bank_name} (${destBank.account_number || 'N/A'})`;
                } else {
                    updates.destination_bank = '';
                }
            }
            
            // When bank account is manually selected
            if (name === 'bank_account_id') {
                const selected = bankAccounts.find(b => b.id === value);
                updates.destination_bank = selected ? `${selected.bank_name} - ${selected.account_name}` : '';
            }
            
            return { ...prev, ...updates };
        });
    };

    const resetForm = () => {
        setForm({
            date: new Date().toISOString().split('T')[0],
            account_name: '',
            amount: '',
            currency: 'AED',
            payment_gateway_id: '',
            payment_method: '',
            bank_account_id: '',
            destination_bank: '',
            payment_for: '',
            other_description: ''
        });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        // Get gateway for settlement calculation
        const selectedGateway = paymentGateways.find(g => g.id === form.payment_gateway_id);
        const settlementDate = calculateSettlementDate(selectedGateway, form.date);
        
        const payload = {
            ...form,
            amount: parseFloat(form.amount) || 0,
            amount_in_aed: amountInAED,
            settlement_date: settlementDate,
            gateway_code: selectedGateway?.code,
            processing_fee_percent: selectedGateway?.processing_fee_percent || 0,
            processing_fee_fixed: selectedGateway?.processing_fee_fixed || 0
        };

        try {
            if (editingId) {
                await api.put(`/finance/clt/receivables/${editingId}`, payload);
                toast.success('Receivable updated');
            } else {
                await api.post('/finance/clt/receivables', payload);
                toast.success('Receivable created');
            }
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error saving receivable');
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
            payment_gateway_id: record.payment_gateway_id || '',
            payment_method: record.payment_method || '',
            bank_account_id: record.bank_account_id || '',
            destination_bank: record.destination_bank || '',
            payment_for: record.payment_for || '',
            other_description: record.other_description || ''
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this receivable?')) return;
        
        try {
            await api.delete(`/finance/clt/receivables/${id}`);
            toast.success('Receivable deleted');
            fetchData();
        } catch (error) {
            toast.error('Error deleting receivable');
        }
    };

    const handleExport = () => {
        const headers = ['Date', 'Customer', 'Payment Gateway', 'Destination Bank', 'Payment For', 'Amount (AED)', 'Settlement Date'];
        const rows = records.map(r => [
            formatDate(r.date),
            r.account_name,
            r.payment_method,
            r.destination_bank,
            r.payment_for,
            formatNumber(r.amount_in_aed),
            formatDate(r.settlement_date)
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'clt_receivables.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
    };

    // Filter records based on filters
    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            // Date filters
            if (filters.dateFrom && r.date < filters.dateFrom) return false;
            if (filters.dateTo && r.date > filters.dateTo) return false;
            
            // Gateway filter
            if (filters.gateway !== 'all' && r.payment_gateway_id !== filters.gateway) return false;
            
            // Settlement status filter
            if (filters.settlementStatus !== 'all') {
                const isSettled = r.settlement_status === 'settled';
                if (filters.settlementStatus === 'settled' && !isSettled) return false;
                if (filters.settlementStatus === 'pending' && isSettled) return false;
            }
            
            // Bank filter
            if (filters.bank !== 'all' && r.bank_account_id !== filters.bank) return false;
            
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

    // Get selected gateway for settlement info display
    const selectedGateway = useMemo(() => {
        return paymentGateways.find(g => g.id === form.payment_gateway_id);
    }, [form.payment_gateway_id, paymentGateways]);

    return (
        <div className="space-y-6" data-testid="clt-receivables-page">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-green-500">CLT Receivables</CardTitle>
                            <CardDescription>Record incoming payments for CLT Academy</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate('/finance/settings/payment-gateways')}>
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Payment Gateways
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {paymentGateways.length === 0 && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
                            <strong>Note:</strong> No payment gateways configured. 
                            <Button variant="link" className="h-auto p-0 ml-1 text-amber-500" onClick={() => navigate('/finance/settings/payment-gateways')}>
                                Add payment gateways in Finance Settings
                            </Button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            required
                            data-testid="receivable-date"
                        />
                        <Input
                            placeholder="Customer Name"
                            value={form.account_name}
                            onChange={(e) => handleChange('account_name', e.target.value)}
                            required
                            data-testid="receivable-customer"
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
                        
                        {/* Payment Gateway from Finance Settings */}
                        <Select value={form.payment_gateway_id} onValueChange={(v) => handleChange('payment_gateway_id', v)}>
                            <SelectTrigger data-testid="receivable-gateway">
                                <SelectValue placeholder="Select Payment Gateway" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentGateways.map(gw => (
                                    <SelectItem key={gw.id} value={gw.id}>
                                        {gw.name} ({gw.code})
                                        {gw.settlement_day_of_week ? ` - ${gw.settlement_day_of_week}` : ` - T+${gw.settlement_days || 1}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {/* Destination Bank (auto-filled or manual) */}
                        <Select value={form.bank_account_id} onValueChange={(v) => handleChange('bank_account_id', v)}>
                            <SelectTrigger data-testid="receivable-bank">
                                <SelectValue placeholder={form.destination_bank || "Destination Bank (optional)"} />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts.map(ba => (
                                    <SelectItem key={ba.id} value={ba.id}>
                                        {ba.bank_name} - {ba.account_name} ({ba.currency})
                                    </SelectItem>
                                ))}
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
                        
                        <div className="flex items-center px-3 py-2 bg-muted rounded-md font-mono">
                            AED: {formatNumber(amountInAED)}
                        </div>
                        
                        {form.payment_for === 'Others' && (
                            <div className="lg:col-span-4">
                                <Textarea
                                    placeholder="Description for 'Others'"
                                    value={form.other_description}
                                    onChange={(e) => handleChange('other_description', e.target.value)}
                                    data-testid="receivable-other-desc"
                                />
                            </div>
                        )}
                        
                        {/* Settlement Info */}
                        {selectedGateway && (
                            <div className="lg:col-span-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-emerald-500" />
                                    <span className="font-medium">Settlement:</span>
                                    <span>
                                        {selectedGateway.settlement_day_of_week 
                                            ? `Every ${selectedGateway.settlement_day_of_week}`
                                            : `T+${selectedGateway.settlement_days || 1} days`
                                        }
                                    </span>
                                    {selectedGateway.processing_fee_percent > 0 && (
                                        <Badge variant="outline" className="ml-2">
                                            Fee: {selectedGateway.processing_fee_percent}%
                                            {selectedGateway.processing_fee_fixed > 0 && ` + ${selectedGateway.currency} ${selectedGateway.processing_fee_fixed}`}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="lg:col-span-4 flex justify-end gap-2">
                            {editingId && (
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
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
                            <label className="text-xs text-muted-foreground mb-1 block">Gateway</label>
                            <Select value={filters.gateway} onValueChange={(v) => setFilters(f => ({ ...f, gateway: v }))}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Gateways" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Gateways</SelectItem>
                                    {paymentGateways.map(gw => (
                                        <SelectItem key={gw.id} value={gw.id}>{gw.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Settlement Status</label>
                            <Select value={filters.settlementStatus} onValueChange={(v) => setFilters(f => ({ ...f, settlementStatus: v }))}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="settled">Settled</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
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
                    </div>

                    {/* Summary Row */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                                Showing {filteredRecords.length} of {records.length} records
                            </span>
                            {filters.settlementStatus !== 'all' && (
                                <Badge variant="outline" className="text-green-500">
                                    {filters.settlementStatus === 'settled' ? 'Settled' : 'Pending'} only
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm">
                                <span className="text-muted-foreground">Total: </span>
                                <span className="font-bold text-green-500">AED {formatNumber(filteredTotal)}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setFilters({ dateFrom: '', dateTo: '', gateway: 'all', settlementStatus: 'all', bank: 'all' })}>
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
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Gateway</TableHead>
                                        <TableHead>Payment For</TableHead>
                                        <TableHead className="text-right">Amount (AED)</TableHead>
                                        <TableHead>Settlement</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRecords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                No receivables recorded yet
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedRecords.map(record => (
                                            <TableRow key={record.id}>
                                                <TableCell>{formatDate(record.date)}</TableCell>
                                                <TableCell>{record.account_name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{record.payment_method || record.gateway_code}</Badge>
                                                </TableCell>
                                                <TableCell>{record.payment_for}</TableCell>
                                                <TableCell className="text-right font-mono text-green-500">
                                                    +{formatNumber(record.amount_in_aed)}
                                                </TableCell>
                                                <TableCell>
                                                    {record.settlement_date ? (
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(record.settlement_date)}
                                                        </span>
                                                    ) : '-'}
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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowDownCircle, ArrowUpCircle, RefreshCw, Search, Filter, Download, 
    TrendingUp, TrendingDown, Wallet, Calendar, Building2
} from 'lucide-react';

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return "-";
    }
};

const UnifiedTransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [bankFilter, setBankFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [txnRes, bankRes] = await Promise.all([
                api.get('/finance/unified-transactions'),
                api.get('/finance/settings/bank-accounts')
            ]);
            setTransactions(txnRes.data || []);
            setBankAccounts(bankRes.data || []);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to fetch transactions');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(txn => {
            const matchesSearch = 
                txn.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                txn.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                txn.party_name?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType = typeFilter === 'all' || 
                (typeFilter === 'in' && txn.type === 'credit') ||
                (typeFilter === 'out' && txn.type === 'debit');
            
            const matchesBank = bankFilter === 'all' || txn.bank_account_id === bankFilter;
            const matchesSource = sourceFilter === 'all' || txn.source === sourceFilter;
            
            const txnDate = new Date(txn.date);
            const matchesDateFrom = !dateFrom || txnDate >= new Date(dateFrom);
            const matchesDateTo = !dateTo || txnDate <= new Date(dateTo);
            
            return matchesSearch && matchesType && matchesBank && matchesSource && matchesDateFrom && matchesDateTo;
        });
    }, [transactions, searchTerm, typeFilter, bankFilter, sourceFilter, dateFrom, dateTo]);

    const summary = useMemo(() => {
        const inflows = filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + (t.amount || 0), 0);
        const outflows = filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + (t.amount || 0), 0);
        return { inflows, outflows, net: inflows - outflows };
    }, [filteredTransactions]);

    const sources = useMemo(() => {
        const unique = [...new Set(transactions.map(t => t.source).filter(Boolean))];
        return unique;
    }, [transactions]);

    const handleExport = () => {
        const headers = ['Date', 'Type', 'Party', 'Description', 'Source', 'Bank Account', 'Reference', 'Amount (AED)'];
        const rows = filteredTransactions.map(t => [
            formatDate(t.date),
            t.type === 'credit' ? 'Money In' : 'Money Out',
            t.party_name || '-',
            t.description || '-',
            t.source || '-',
            t.bank_account_name || '-',
            t.reference || '-',
            (t.type === 'credit' ? '+' : '-') + formatNumber(t.amount)
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 150);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="unified-transactions-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Unified Transactions</h1>
                    <p className="text-muted-foreground">All money movement across bank accounts</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
                        <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">+AED {formatNumber(summary.inflows)}</div>
                        <p className="text-xs text-muted-foreground">
                            {filteredTransactions.filter(t => t.type === 'credit').length} transactions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outflows</CardTitle>
                        <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">-AED {formatNumber(summary.outflows)}</div>
                        <p className="text-xs text-muted-foreground">
                            {filteredTransactions.filter(t => t.type === 'debit').length} transactions
                        </p>
                    </CardContent>
                </Card>
                <Card className={summary.net >= 0 ? 'border-green-500/30' : 'border-red-500/30'}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                        {summary.net >= 0 ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {summary.net >= 0 ? '+' : ''}AED {formatNumber(summary.net)}
                        </div>
                        <p className="text-xs text-muted-foreground">For selected period</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="col-span-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search transactions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="in">Money In</SelectItem>
                                <SelectItem value="out">Money Out</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={bankFilter} onValueChange={setBankFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Bank Account" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Banks</SelectItem>
                                {bankAccounts.map(ba => (
                                    <SelectItem key={ba.id} value={ba.id}>{ba.bank_name} - {ba.account_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder="From"
                        />
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder="To"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History ({filteredTransactions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Party</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Bank Account</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Amount (AED)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No transactions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTransactions.slice(0, 100).map((txn) => (
                                    <TableRow key={txn.id}>
                                        <TableCell>{formatDate(txn.date)}</TableCell>
                                        <TableCell>
                                            {txn.type === 'credit' ? (
                                                <Badge className="bg-green-500"><ArrowDownCircle className="h-3 w-3 mr-1" /> In</Badge>
                                            ) : (
                                                <Badge className="bg-red-500"><ArrowUpCircle className="h-3 w-3 mr-1" /> Out</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{txn.party_name || '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{txn.description || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{txn.source || '-'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm">{txn.bank_account_name || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{txn.reference || '-'}</TableCell>
                                        <TableCell className={`text-right font-mono font-medium ${txn.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                                            {txn.type === 'credit' ? '+' : '-'}{formatNumber(txn.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {filteredTransactions.length > 100 && (
                        <p className="text-center text-sm text-muted-foreground mt-4">
                            Showing 100 of {filteredTransactions.length} transactions. Export to see all.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default UnifiedTransactionsPage;

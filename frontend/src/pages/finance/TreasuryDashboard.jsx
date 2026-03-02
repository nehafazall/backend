import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, ArrowDownCircle, ArrowUpCircle, Landmark, Building2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const TreasuryDashboard = () => {
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cltPayables, setCltPayables] = useState([]);
    const [cltReceivables, setCltReceivables] = useState([]);
    const [pendingSettlements, setPendingSettlements] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [bankRes, cltPayRes, cltRecRes, settlementsRes] = await Promise.all([
                api.get('/finance/settings/bank-accounts').catch(() => ({ data: [] })),
                api.get('/finance/clt/payables').catch(() => ({ data: [] })),
                api.get('/finance/clt/receivables').catch(() => ({ data: [] })),
                api.get('/finance/pending-settlements').catch(() => ({ data: { settlements: [] } }))
            ]);

            setBankAccounts(bankRes.data || []);
            setCltPayables(cltPayRes.data || []);
            setCltReceivables(cltRecRes.data || []);
            setPendingSettlements(settlementsRes.data?.settlements || []);
        } catch (error) {
            toast.error('Failed to fetch treasury data');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summary = useMemo(() => {
        // Calculate total opening balance from bank accounts
        const activeAccounts = bankAccounts.filter(a => a.is_active !== false);
        const totalOpeningBalance = activeAccounts.reduce((sum, a) => sum + (a.opening_balance || 0), 0);
        const totalCurrentBalance = activeAccounts.reduce((sum, a) => sum + (a.current_balance || a.opening_balance || 0), 0);
        
        // Calculate inflows and outflows from CLT transactions
        const totalCltInflows = cltReceivables.reduce((sum, r) => sum + (r.amount_in_aed || 0), 0);
        const totalCltOutflows = cltPayables.reduce((sum, p) => sum + (p.amount_in_aed || 0), 0);
        
        // Calculate pending settlements
        const pendingSettlementAmount = pendingSettlements.reduce((sum, s) => sum + (s.amount || 0), 0);
        
        const netCashFlow = totalCltInflows - totalCltOutflows;

        // Group bank accounts by type
        const accountsByType = activeAccounts.reduce((acc, a) => {
            const type = a.account_type || 'current';
            if (!acc[type]) acc[type] = [];
            acc[type].push(a);
            return acc;
        }, {});

        return {
            totalOpeningBalance,
            totalCurrentBalance,
            totalCltInflows,
            totalCltOutflows,
            pendingSettlementAmount,
            netCashFlow,
            bankAccounts: activeAccounts,
            accountsByType,
            accountCount: activeAccounts.length
        };
    }, [bankAccounts, cltPayables, cltReceivables, pendingSettlements]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="treasury-dashboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-500">Treasury Dashboard</h1>
                    <p className="text-muted-foreground">Bank accounts & cash flow overview</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/finance/settings/bank-accounts')}>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Bank Accounts
                    </Button>
                    <Button variant="outline" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bank Balance</CardTitle>
                        <Wallet className="h-5 w-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">AED {formatNumber(summary.totalCurrentBalance)}</div>
                        <p className="text-xs text-muted-foreground">{summary.accountCount} active accounts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
                        <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">AED {formatNumber(summary.totalCltInflows)}</div>
                        <p className="text-xs text-muted-foreground">Receivables collected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outflows</CardTitle>
                        <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">AED {formatNumber(summary.totalCltOutflows)}</div>
                        <p className="text-xs text-muted-foreground">Payables disbursed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Settlements</CardTitle>
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">AED {formatNumber(summary.pendingSettlementAmount)}</div>
                        <p className="text-xs text-muted-foreground">{pendingSettlements.length} pending</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bank Accounts List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Landmark className="h-5 w-5" />
                        Bank Account Balances
                    </CardTitle>
                    <CardDescription>Current balance across all accounts</CardDescription>
                </CardHeader>
                <CardContent>
                    {summary.bankAccounts.length === 0 ? (
                        <div className="text-center py-8">
                            <Landmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">No bank accounts configured</p>
                            <Button onClick={() => navigate('/finance/settings/bank-accounts')}>
                                Add Bank Account
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Bank</TableHead>
                                    <TableHead>Account Number</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead className="text-right">Opening Balance</TableHead>
                                    <TableHead className="text-right">Current Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summary.bankAccounts.map(account => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium">{account.account_name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                {account.bank_name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{account.account_number}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {account.account_type?.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{account.currency}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatNumber(account.opening_balance)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-emerald-500 font-medium">
                                            {formatNumber(account.current_balance || account.opening_balance)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-muted/50 font-bold">
                                    <TableCell colSpan={5}>Total</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {formatNumber(summary.totalOpeningBalance)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-emerald-500">
                                        {formatNumber(summary.totalCurrentBalance)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Cash Flow Summary */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Cash Flow Summary</CardTitle>
                        <CardDescription>CLT Academy transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-medium text-green-500">Inflows (Receivables)</h4>
                                        <p className="text-xs text-muted-foreground">{cltReceivables.length} transactions</p>
                                    </div>
                                    <div className="text-2xl font-bold text-green-500">
                                        +AED {formatNumber(summary.totalCltInflows)}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-medium text-red-500">Outflows (Payables)</h4>
                                        <p className="text-xs text-muted-foreground">{cltPayables.length} transactions</p>
                                    </div>
                                    <div className="text-2xl font-bold text-red-500">
                                        -AED {formatNumber(summary.totalCltOutflows)}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-medium text-emerald-500">Net Cash Flow</h4>
                                    </div>
                                    <div className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {summary.netCashFlow >= 0 ? '+' : ''}AED {formatNumber(summary.netCashFlow)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Accounts by Type</CardTitle>
                        <CardDescription>Balance distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(summary.accountsByType).length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">No accounts configured</p>
                            ) : (
                                Object.entries(summary.accountsByType).map(([type, accounts]) => {
                                    const total = accounts.reduce((sum, a) => sum + (a.current_balance || a.opening_balance || 0), 0);
                                    return (
                                        <div key={type} className="p-4 rounded-lg bg-muted/50 border">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-medium capitalize">{type.replace('_', ' ')} Accounts</h4>
                                                    <p className="text-xs text-muted-foreground">{accounts.length} account(s)</p>
                                                </div>
                                                <div className="text-xl font-bold text-emerald-500">
                                                    AED {formatNumber(total)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TreasuryDashboard;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const TreasuryDashboard = () => {
    const [balances, setBalances] = useState([]);
    const [cltPayables, setCltPayables] = useState([]);
    const [cltReceivables, setCltReceivables] = useState([]);
    const [milesDeposits, setMilesDeposits] = useState([]);
    const [milesWithdrawals, setMilesWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [balancesRes, cltPayRes, cltRecRes, milesDepRes, milesWithRes] = await Promise.all([
                fetch(`${API_URL}/api/finance/treasury/balances`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/clt/payables`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/clt/receivables`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/miles/deposits`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/miles/withdrawals`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (balancesRes.ok) setBalances(await balancesRes.json());
            if (cltPayRes.ok) setCltPayables(await cltPayRes.json());
            if (cltRecRes.ok) setCltReceivables(await cltRecRes.json());
            if (milesDepRes.ok) setMilesDeposits(await milesDepRes.json());
            if (milesWithRes.ok) setMilesWithdrawals(await milesWithRes.json());
        } catch (error) {
            toast.error('Failed to fetch treasury data');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summary = useMemo(() => {
        // Get latest balance per account
        const accountBalances = {};
        balances.forEach(b => {
            if (!accountBalances[b.account] || new Date(b.date) > new Date(accountBalances[b.account].date)) {
                accountBalances[b.account] = b;
            }
        });
        const totalOpeningBalance = Object.values(accountBalances).reduce((sum, b) => sum + (b.opening_balance || 0), 0);
        
        const totalCltInflows = cltReceivables.reduce((sum, r) => sum + (r.amount_in_aed || 0), 0);
        const totalCltOutflows = cltPayables.reduce((sum, p) => sum + (p.amount_in_aed || 0), 0);
        const totalMilesInflows = milesDeposits.reduce((sum, d) => sum + (d.amount_in_aed || 0), 0);
        const totalMilesOutflows = milesWithdrawals.reduce((sum, w) => sum + (w.amount_in_aed || 0), 0);
        
        const totalInflows = totalCltInflows + totalMilesInflows;
        const totalOutflows = totalCltOutflows + totalMilesOutflows;
        const netCashFlow = totalInflows - totalOutflows;
        const currentBalance = totalOpeningBalance + netCashFlow;

        return {
            totalOpeningBalance,
            totalCltInflows,
            totalCltOutflows,
            totalMilesInflows,
            totalMilesOutflows,
            totalInflows,
            totalOutflows,
            netCashFlow,
            currentBalance,
            accountBalances: Object.values(accountBalances)
        };
    }, [balances, cltPayables, cltReceivables, milesDeposits, milesWithdrawals]);

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
                    <p className="text-muted-foreground">Consolidated cash flow overview</p>
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
                        <Wallet className="h-5 w-5 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">AED {formatNumber(summary.totalOpeningBalance)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
                        <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">AED {formatNumber(summary.totalInflows)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outflows</CardTitle>
                        <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">AED {formatNumber(summary.totalOutflows)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        {summary.currentBalance >= summary.totalOpeningBalance 
                            ? <TrendingUp className="h-5 w-5 text-emerald-500" />
                            : <TrendingDown className="h-5 w-5 text-red-500" />
                        }
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.currentBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            AED {formatNumber(summary.currentBalance)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Balances</CardTitle>
                        <CardDescription>Current balance by account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summary.accountBalances.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            No balances recorded
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    summary.accountBalances.map(b => (
                                        <TableRow key={b.id}>
                                            <TableCell className="font-medium">{b.account}</TableCell>
                                            <TableCell>{b.currency}</TableCell>
                                            <TableCell className="text-right font-mono text-emerald-500">
                                                {formatNumber(b.opening_balance)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cash Flow Breakdown</CardTitle>
                        <CardDescription>By entity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                                <h4 className="font-medium text-red-500 mb-2">CLT Academy</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Receivables:</span>
                                        <span className="ml-2 text-green-500">+{formatNumber(summary.totalCltInflows)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Payables:</span>
                                        <span className="ml-2 text-red-500">-{formatNumber(summary.totalCltOutflows)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                                <h4 className="font-medium text-blue-500 mb-2">Miles Capitals</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Deposits:</span>
                                        <span className="ml-2 text-green-500">+{formatNumber(summary.totalMilesInflows)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Withdrawals:</span>
                                        <span className="ml-2 text-red-500">-{formatNumber(summary.totalMilesOutflows)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                <h4 className="font-medium text-emerald-500 mb-2">Net Cash Flow</h4>
                                <div className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {summary.netCashFlow >= 0 ? '+' : ''}AED {formatNumber(summary.netCashFlow)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TreasuryDashboard;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const OverallPNLDashboard = () => {
    const [period, setPeriod] = useState('ytd');
    const [cltData, setCltData] = useState({ payables: [], receivables: [] });
    const [milesData, setMilesData] = useState({ deposits: [], withdrawals: [], expenses: [], profit: [] });
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [cltPay, cltRec, milesDep, milesWit, milesExp, milesProf] = await Promise.all([
                fetch(`${API_URL}/api/finance/clt/payables`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/clt/receivables`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/miles/deposits`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/miles/withdrawals`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/miles/expenses`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/miles/operating-profit`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            setCltData({
                payables: cltPay.ok ? await cltPay.json() : [],
                receivables: cltRec.ok ? await cltRec.json() : []
            });
            setMilesData({
                deposits: milesDep.ok ? await milesDep.json() : [],
                withdrawals: milesWit.ok ? await milesWit.json() : [],
                expenses: milesExp.ok ? await milesExp.json() : [],
                profit: milesProf.ok ? await milesProf.json() : []
            });
        } catch (error) {
            toast.error('Failed to fetch PNL data');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filterByPeriod = useCallback((data) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        return data.filter(item => {
            const itemDate = new Date(item.date);
            if (period === 'ytd') {
                return itemDate.getFullYear() === currentYear;
            } else if (period === 'mtd') {
                return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
            } else if (period === 'q1') {
                return itemDate.getFullYear() === currentYear && itemDate.getMonth() < 3;
            } else if (period === 'q2') {
                return itemDate.getFullYear() === currentYear && itemDate.getMonth() >= 3 && itemDate.getMonth() < 6;
            } else if (period === 'q3') {
                return itemDate.getFullYear() === currentYear && itemDate.getMonth() >= 6 && itemDate.getMonth() < 9;
            } else if (period === 'q4') {
                return itemDate.getFullYear() === currentYear && itemDate.getMonth() >= 9;
            }
            return true;
        });
    }, [period]);

    const pnlSummary = useMemo(() => {
        // CLT
        const cltReceivables = filterByPeriod(cltData.receivables).reduce((sum, r) => sum + (r.amount_in_aed || 0), 0);
        const cltPayables = filterByPeriod(cltData.payables).reduce((sum, p) => sum + (p.amount_in_aed || 0), 0);
        const cltNetIncome = cltReceivables - cltPayables;

        // Miles
        const milesDeposits = filterByPeriod(milesData.deposits).reduce((sum, d) => sum + (d.amount_in_aed || 0), 0);
        const milesWithdrawals = filterByPeriod(milesData.withdrawals).reduce((sum, w) => sum + (w.amount_in_aed || 0), 0);
        const milesExpenses = filterByPeriod(milesData.expenses).reduce((sum, e) => sum + (e.amount_in_aed || 0), 0);
        const milesProfit = filterByPeriod(milesData.profit).reduce((sum, p) => sum + (p.operating_profit_aed || 0), 0);
        const milesNetCapital = milesDeposits - milesWithdrawals - milesExpenses;
        const milesNetIncome = milesProfit - milesExpenses;

        // Consolidated
        const totalRevenue = cltReceivables + milesProfit;
        const totalExpenses = cltPayables + milesExpenses;
        const consolidatedPnl = totalRevenue - totalExpenses;

        return {
            clt: {
                revenue: cltReceivables,
                expenses: cltPayables,
                netIncome: cltNetIncome
            },
            miles: {
                deposits: milesDeposits,
                withdrawals: milesWithdrawals,
                expenses: milesExpenses,
                operatingProfit: milesProfit,
                netCapital: milesNetCapital,
                netIncome: milesNetIncome
            },
            consolidated: {
                totalRevenue,
                totalExpenses,
                netPnl: consolidatedPnl
            }
        };
    }, [cltData, milesData, filterByPeriod]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="overall-pnl-dashboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-amber-500">Overall P&L Dashboard</h1>
                    <p className="text-muted-foreground">Consolidated financial performance</p>
                </div>
                <div className="flex gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mtd">Month to Date</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                            <SelectItem value="q1">Q1</SelectItem>
                            <SelectItem value="q2">Q2</SelectItem>
                            <SelectItem value="q3">Q3</SelectItem>
                            <SelectItem value="q4">Q4</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Consolidated Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">AED {formatNumber(pnlSummary.consolidated.totalRevenue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">AED {formatNumber(pnlSummary.consolidated.totalExpenses)}</div>
                    </CardContent>
                </Card>
                <Card className="border-2 border-amber-500/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net P&L</CardTitle>
                        {pnlSummary.consolidated.netPnl >= 0 
                            ? <TrendingUp className="h-5 w-5 text-green-500" />
                            : <TrendingDown className="h-5 w-5 text-red-500" />
                        }
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${pnlSummary.consolidated.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            AED {formatNumber(pnlSummary.consolidated.netPnl)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Entity Breakdown */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* CLT P&L */}
                <Card className="border-red-500/30">
                    <CardHeader>
                        <CardTitle className="text-red-500">CLT Academy P&L</CardTitle>
                        <CardDescription>Revenue and expenses breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Receivables (Revenue)</TableCell>
                                    <TableCell className="text-right font-mono text-green-500">
                                        +{formatNumber(pnlSummary.clt.revenue)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Payables (Expenses)</TableCell>
                                    <TableCell className="text-right font-mono text-red-500">
                                        -{formatNumber(pnlSummary.clt.expenses)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableCell className="font-bold">Net Income</TableCell>
                                    <TableCell className={`text-right font-mono font-bold ${pnlSummary.clt.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {formatNumber(pnlSummary.clt.netIncome)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Miles P&L */}
                <Card className="border-blue-500/30">
                    <CardHeader>
                        <CardTitle className="text-blue-500">Miles Capitals P&L</CardTitle>
                        <CardDescription>Capital and trading performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Operating Profit</TableCell>
                                    <TableCell className="text-right font-mono text-green-500">
                                        +{formatNumber(pnlSummary.miles.operatingProfit)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium">Expenses</TableCell>
                                    <TableCell className="text-right font-mono text-red-500">
                                        -{formatNumber(pnlSummary.miles.expenses)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50">
                                    <TableCell className="font-bold">Net Income</TableCell>
                                    <TableCell className={`text-right font-mono font-bold ${pnlSummary.miles.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {formatNumber(pnlSummary.miles.netIncome)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={2} className="pt-4">
                                        <div className="text-xs text-muted-foreground">Capital Movement</div>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-sm">Deposits</TableCell>
                                    <TableCell className="text-right font-mono text-sm text-green-500">
                                        +{formatNumber(pnlSummary.miles.deposits)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="text-sm">Withdrawals</TableCell>
                                    <TableCell className="text-right font-mono text-sm text-red-500">
                                        -{formatNumber(pnlSummary.miles.withdrawals)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OverallPNLDashboard;

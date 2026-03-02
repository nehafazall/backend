import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Wallet, Receipt, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const OverallPNLDashboard = () => {
    const [period, setPeriod] = useState('ytd');
    const [cltData, setCltData] = useState({ payables: [], receivables: [], expenses: [] });
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [cltPay, cltRec, cltExp] = await Promise.all([
                fetch(`${API_URL}/api/finance/clt/payables`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/finance/clt/receivables`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/expenses`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            setCltData({
                payables: cltPay.ok ? await cltPay.json() : [],
                receivables: cltRec.ok ? await cltRec.json() : [],
                expenses: cltExp.ok ? await cltExp.json() : []
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
            const itemDate = new Date(item.date || item.created_at);
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
        // CLT Revenue (Receivables)
        const cltReceivables = filterByPeriod(cltData.receivables).reduce((sum, r) => sum + (r.amount_in_aed || 0), 0);
        
        // CLT Expenses (Payables + Expenses)
        const cltPayables = filterByPeriod(cltData.payables).reduce((sum, p) => sum + (p.amount_in_aed || 0), 0);
        const cltExpenses = filterByPeriod(cltData.expenses).reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalExpenses = cltPayables + cltExpenses;
        
        // Net Income
        const netIncome = cltReceivables - totalExpenses;

        // Breakdown by category
        const expensesByCategory = filterByPeriod(cltData.expenses).reduce((acc, e) => {
            const cat = e.category || 'Other';
            acc[cat] = (acc[cat] || 0) + (e.amount || 0);
            return acc;
        }, {});

        return {
            revenue: cltReceivables,
            payables: cltPayables,
            operationalExpenses: cltExpenses,
            totalExpenses,
            netIncome,
            expensesByCategory,
            receivablesCount: filterByPeriod(cltData.receivables).length,
            payablesCount: filterByPeriod(cltData.payables).length,
            expensesCount: filterByPeriod(cltData.expenses).length
        };
    }, [cltData, filterByPeriod]);

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
                    <h1 className="text-2xl font-bold text-amber-500">CLT Academy P&L Dashboard</h1>
                    <p className="text-muted-foreground">Financial performance overview</p>
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

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">AED {formatNumber(pnlSummary.revenue)}</div>
                        <p className="text-xs text-muted-foreground">{pnlSummary.receivablesCount} transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Payables</CardTitle>
                        <CreditCard className="h-5 w-5 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">AED {formatNumber(pnlSummary.payables)}</div>
                        <p className="text-xs text-muted-foreground">{pnlSummary.payablesCount} invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Operational Expenses</CardTitle>
                        <Receipt className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">AED {formatNumber(pnlSummary.operationalExpenses)}</div>
                        <p className="text-xs text-muted-foreground">{pnlSummary.expensesCount} entries</p>
                    </CardContent>
                </Card>
                <Card className="border-2 border-amber-500/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net P&L</CardTitle>
                        {pnlSummary.netIncome >= 0 
                            ? <TrendingUp className="h-5 w-5 text-green-500" />
                            : <TrendingDown className="h-5 w-5 text-red-500" />
                        }
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${pnlSummary.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            AED {formatNumber(pnlSummary.netIncome)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {pnlSummary.netIncome >= 0 ? 'Profit' : 'Loss'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* P&L Statement */}
                <Card className="border-red-500/30">
                    <CardHeader>
                        <CardTitle className="text-red-500">Profit & Loss Statement</CardTitle>
                        <CardDescription>Revenue and expenses breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow className="bg-green-500/5">
                                    <TableCell className="font-bold text-green-600">Revenue</TableCell>
                                    <TableCell className="text-right font-mono"></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-8">Receivables</TableCell>
                                    <TableCell className="text-right font-mono text-green-500">
                                        +{formatNumber(pnlSummary.revenue)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-red-500/5">
                                    <TableCell className="font-bold text-red-600">Expenses</TableCell>
                                    <TableCell className="text-right font-mono"></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-8">Payables</TableCell>
                                    <TableCell className="text-right font-mono text-red-500">
                                        -{formatNumber(pnlSummary.payables)}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-8">Operational Expenses</TableCell>
                                    <TableCell className="text-right font-mono text-red-500">
                                        -{formatNumber(pnlSummary.operationalExpenses)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="border-t-2">
                                    <TableCell className="font-bold">Total Expenses</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-red-500">
                                        -{formatNumber(pnlSummary.totalExpenses)}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="bg-muted/50 border-t-2">
                                    <TableCell className="font-bold text-lg">Net Income</TableCell>
                                    <TableCell className={`text-right font-mono font-bold text-lg ${pnlSummary.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        AED {formatNumber(pnlSummary.netIncome)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Expenses by Category */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expenses by Category</CardTitle>
                        <CardDescription>Breakdown of operational expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount (AED)</TableHead>
                                    <TableHead className="text-right">%</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(pnlSummary.expensesByCategory).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                            No expenses recorded for this period
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    Object.entries(pnlSummary.expensesByCategory)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([category, amount]) => (
                                            <TableRow key={category}>
                                                <TableCell className="font-medium">{category}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatNumber(amount)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {pnlSummary.operationalExpenses > 0 
                                                        ? ((amount / pnlSummary.operationalExpenses) * 100).toFixed(1)
                                                        : 0}%
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OverallPNLDashboard;

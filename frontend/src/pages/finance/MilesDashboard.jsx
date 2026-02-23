import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, MinusCircle, Receipt, Target, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

const StatCard = ({ title, value, icon: Icon, colorClass, prefix = "AED " }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {Icon && <Icon className={`h-5 w-5 ${colorClass}`} />}
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${colorClass}`}>{prefix}{value}</div>
        </CardContent>
    </Card>
);

const MilesDashboard = () => {
    const [deposits, setDeposits] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [operatingProfit, setOperatingProfit] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [depositsRes, withdrawalsRes, expensesRes, profitRes] = await Promise.all([
                fetch(`${API_URL}/api/finance/miles/deposits`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/finance/miles/withdrawals`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/finance/miles/expenses`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/finance/miles/operating-profit`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (depositsRes.ok) setDeposits(await depositsRes.json());
            if (withdrawalsRes.ok) setWithdrawals(await withdrawalsRes.json());
            if (expensesRes.ok) setExpenses(await expensesRes.json());
            if (profitRes.ok) setOperatingProfit(await profitRes.json());
        } catch (error) {
            toast.error('Failed to fetch dashboard data');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { totalDeposits, totalWithdrawals, totalExpenses, totalProfit, netCapital } = useMemo(() => {
        const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount_in_aed || 0), 0);
        const totalWithdrawals = withdrawals.reduce((sum, w) => sum + (w.amount_in_aed || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount_in_aed || 0), 0);
        const totalProfit = operatingProfit.reduce((sum, p) => sum + (p.operating_profit_aed || 0), 0);
        const netCapital = totalDeposits - totalWithdrawals - totalExpenses + totalProfit;
        
        return { totalDeposits, totalWithdrawals, totalExpenses, totalProfit, netCapital };
    }, [deposits, withdrawals, expenses, operatingProfit]);

    const recentActivity = useMemo(() => {
        const combined = [
            ...deposits.map(d => ({ ...d, type: 'Deposit', displayAmount: d.amount_in_aed || 0 })),
            ...withdrawals.map(w => ({ ...w, type: 'Withdrawal', displayAmount: -(w.amount_in_aed || 0) })),
            ...expenses.map(e => ({ ...e, type: 'Expense', displayAmount: -(e.amount_in_aed || 0) })),
            ...operatingProfit.map(p => ({ ...p, type: 'Profit', displayAmount: p.operating_profit_aed || 0 }))
        ];
        return combined.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    }, [deposits, withdrawals, expenses, operatingProfit]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-5">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="miles-dashboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-blue-500">Miles Capitals Dashboard</h1>
                    <p className="text-muted-foreground">Overview of capital and trading activity</p>
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard 
                    title="Total Deposits" 
                    value={formatNumber(totalDeposits)} 
                    icon={PlusCircle} 
                    colorClass="text-green-500" 
                />
                <StatCard 
                    title="Total Withdrawals" 
                    value={formatNumber(totalWithdrawals)} 
                    icon={MinusCircle} 
                    colorClass="text-red-500" 
                />
                <StatCard 
                    title="Total Expenses" 
                    value={formatNumber(totalExpenses)} 
                    icon={Receipt} 
                    colorClass="text-orange-500" 
                />
                <StatCard 
                    title="Operating Profit" 
                    value={formatNumber(totalProfit)} 
                    icon={Target} 
                    colorClass="text-blue-500" 
                />
                <StatCard 
                    title="Net Capital" 
                    value={formatNumber(netCapital)} 
                    icon={netCapital >= 0 ? TrendingUp : TrendingDown} 
                    colorClass={netCapital >= 0 ? 'text-green-500' : 'text-red-500'} 
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Capital Summary</CardTitle>
                        <CardDescription>Breakdown of capital flow</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                                <span className="font-medium">Inflows (Deposits + Profit)</span>
                                <span className="text-green-500 font-bold">
                                    +AED {formatNumber(totalDeposits + totalProfit)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                                <span className="font-medium">Outflows (Withdrawals + Expenses)</span>
                                <span className="text-red-500 font-bold">
                                    -AED {formatNumber(totalWithdrawals + totalExpenses)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border-2 border-blue-500/30">
                                <span className="font-medium">Net Position</span>
                                <span className={`font-bold ${netCapital >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    AED {formatNumber(netCapital)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest 10 transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount (AED)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentActivity.map((t, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{formatDate(t.date)}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="outline"
                                                className={
                                                    t.type === 'Deposit' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                                                    t.type === 'Withdrawal' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                                                    t.type === 'Expense' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' :
                                                    'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                                }
                                            >
                                                {t.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono ${
                                            t.displayAmount >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {t.displayAmount >= 0 ? '+' : ''}{formatNumber(t.displayAmount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MilesDashboard;

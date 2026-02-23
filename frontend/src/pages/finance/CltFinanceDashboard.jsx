import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownCircle, ArrowUpCircle, Scale, RefreshCw } from 'lucide-react';
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

const CltFinanceDashboard = () => {
    const [payables, setPayables] = useState([]);
    const [receivables, setReceivables] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [payablesRes, receivablesRes] = await Promise.all([
                fetch(`${API_URL}/api/finance/clt/payables`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/finance/clt/receivables`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (payablesRes.ok) setPayables(await payablesRes.json());
            if (receivablesRes.ok) setReceivables(await receivablesRes.json());
        } catch (error) {
            toast.error('Failed to fetch dashboard data');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { totalPayables, totalReceivables, netBalance } = useMemo(() => {
        const totalPayables = payables.reduce((sum, p) => sum + (p.amount_in_aed || 0), 0);
        const totalReceivables = receivables.reduce((sum, r) => sum + (r.amount_in_aed || 0), 0);
        const netBalance = totalReceivables - totalPayables;
        return { totalPayables, totalReceivables, netBalance };
    }, [payables, receivables]);

    const monthlyData = useMemo(() => {
        const combined = [
            ...payables.map(p => ({ ...p, type: 'Payable' })),
            ...receivables.map(r => ({ ...r, type: 'Receivable' }))
        ];
        
        const grouped = combined.reduce((acc, item) => {
            if (!item.date) return acc;
            const month = new Date(item.date).toISOString().slice(0, 7);
            if (!acc[month]) acc[month] = { month, Payables: 0, Receivables: 0 };
            if (item.type === 'Payable') {
                acc[month].Payables += item.amount_in_aed || 0;
            } else {
                acc[month].Receivables += item.amount_in_aed || 0;
            }
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
    }, [payables, receivables]);

    const recentTransactions = useMemo(() => {
        const combined = [
            ...payables.map(p => ({ ...p, type: 'Payable', displayAmount: -(p.amount_in_aed || 0) })),
            ...receivables.map(r => ({ ...r, type: 'Receivable', displayAmount: r.amount_in_aed || 0 }))
        ];
        return combined.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    }, [payables, receivables]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="clt-finance-dashboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-red-500">CLT Financial Dashboard</h1>
                    <p className="text-muted-foreground">Overview of CLT Academy financials</p>
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard 
                    title="Total Receivables" 
                    value={formatNumber(totalReceivables)} 
                    icon={ArrowDownCircle} 
                    colorClass="text-green-500" 
                />
                <StatCard 
                    title="Total Payables" 
                    value={formatNumber(totalPayables)} 
                    icon={ArrowUpCircle} 
                    colorClass="text-red-500" 
                />
                <StatCard 
                    title="Net Balance" 
                    value={formatNumber(netBalance)} 
                    icon={Scale} 
                    colorClass={netBalance >= 0 ? 'text-green-500' : 'text-red-500'} 
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Flow</CardTitle>
                        <CardDescription>Payables vs. Receivables over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">Receivables</TableHead>
                                    <TableHead className="text-right">Payables</TableHead>
                                    <TableHead className="text-right">Net</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monthlyData.slice(-6).map(row => (
                                    <TableRow key={row.month}>
                                        <TableCell>{row.month}</TableCell>
                                        <TableCell className="text-right text-green-600">
                                            {formatNumber(row.Receivables)}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            {formatNumber(row.Payables)}
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${
                                            row.Receivables - row.Payables >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {formatNumber(row.Receivables - row.Payables)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Latest 10 transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount (AED)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentTransactions.map((t, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{formatDate(t.date)}</TableCell>
                                        <TableCell>{t.account_name}</TableCell>
                                        <TableCell>
                                            <Badge variant={t.type === 'Payable' ? 'destructive' : 'default'} 
                                                   className={t.type === 'Receivable' ? 'bg-green-500' : ''}>
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

export default CltFinanceDashboard;

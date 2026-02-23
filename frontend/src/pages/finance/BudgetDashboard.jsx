import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COST_CENTERS = ["Marketing", "Operations", "IT", "Salary & Commissions", "Miscellaneous"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const BudgetDashboard = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [entity, setEntity] = useState('CLT');
    const [budgetData, setBudgetData] = useState([]);
    const [actualData, setActualData] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [budgetRes, actualRes] = await Promise.all([
                fetch(`${API_URL}/api/finance/budgeting/sheet?year=${year}&entity=${entity}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/finance/budgeting/actuals?year=${year}&entity=${entity}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (budgetRes.ok) setBudgetData(await budgetRes.json());
            if (actualRes.ok) setActualData(await actualRes.json());
        } catch (error) {
            toast.error('Failed to fetch budget data');
        }
        setLoading(false);
    }, [token, year, entity]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const analysis = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentMonthName = MONTHS[currentMonth];
        
        const costCenterAnalysis = COST_CENTERS.map(cc => {
            const budgetItem = budgetData.find(b => b.cost_center === cc);
            const actualItem = actualData.find(a => a.cost_center === cc);
            
            const ytdBudget = budgetItem 
                ? MONTHS.slice(0, currentMonth + 1).reduce((sum, m) => sum + (budgetItem.monthly_budgets?.[m] || 0), 0)
                : 0;
            const ytdActual = actualItem?.ytd_actual || 0;
            const variance = ytdBudget - ytdActual;
            const variancePercent = ytdBudget > 0 ? (variance / ytdBudget) * 100 : 0;
            
            return {
                cost_center: cc,
                ytdBudget,
                ytdActual,
                variance,
                variancePercent,
                status: variance >= 0 ? 'under' : 'over'
            };
        });

        const totalYtdBudget = costCenterAnalysis.reduce((sum, c) => sum + c.ytdBudget, 0);
        const totalYtdActual = costCenterAnalysis.reduce((sum, c) => sum + c.ytdActual, 0);
        const totalVariance = totalYtdBudget - totalYtdActual;
        const totalVariancePercent = totalYtdBudget > 0 ? (totalVariance / totalYtdBudget) * 100 : 0;

        return {
            costCenterAnalysis,
            totalYtdBudget,
            totalYtdActual,
            totalVariance,
            totalVariancePercent,
            currentMonthName
        };
    }, [budgetData, actualData]);

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
        <div className="space-y-6" data-testid="budget-dashboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-purple-500">Budget Dashboard</h1>
                    <p className="text-muted-foreground">Budget vs. Actual comparison (YTD through {analysis.currentMonthName})</p>
                </div>
                <div className="flex gap-2">
                    <Select value={entity} onValueChange={setEntity}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CLT">CLT</SelectItem>
                            <SelectItem value="Miles">Miles</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[2024, 2025, 2026, 2027].map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">YTD Budget</CardTitle>
                        <Target className="h-5 w-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">AED {formatNumber(analysis.totalYtdBudget)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">YTD Actual</CardTitle>
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">AED {formatNumber(analysis.totalYtdActual)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Variance</CardTitle>
                        {analysis.totalVariance >= 0 
                            ? <TrendingDown className="h-5 w-5 text-green-500" />
                            : <TrendingUp className="h-5 w-5 text-red-500" />
                        }
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${analysis.totalVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            AED {formatNumber(Math.abs(analysis.totalVariance))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {analysis.totalVariance >= 0 ? 'Under budget' : 'Over budget'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Variance %</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${analysis.totalVariancePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {analysis.totalVariancePercent >= 0 ? '+' : ''}{analysis.totalVariancePercent.toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Budget vs. Actual by Cost Center</CardTitle>
                    <CardDescription>Year-to-date comparison</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cost Center</TableHead>
                                <TableHead className="text-right">YTD Budget</TableHead>
                                <TableHead className="text-right">YTD Actual</TableHead>
                                <TableHead className="text-right">Variance</TableHead>
                                <TableHead className="text-right">Variance %</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysis.costCenterAnalysis.map(item => (
                                <TableRow key={item.cost_center}>
                                    <TableCell className="font-medium">{item.cost_center}</TableCell>
                                    <TableCell className="text-right font-mono">{formatNumber(item.ytdBudget)}</TableCell>
                                    <TableCell className="text-right font-mono text-blue-500">{formatNumber(item.ytdActual)}</TableCell>
                                    <TableCell className={`text-right font-mono ${item.variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {item.variance >= 0 ? '+' : ''}{formatNumber(item.variance)}
                                    </TableCell>
                                    <TableCell className={`text-right font-mono ${item.variancePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {item.variancePercent >= 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={
                                            item.status === 'under' 
                                                ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                                : 'bg-red-500/10 text-red-500 border-red-500/30'
                                        }>
                                            {item.status === 'under' ? 'Under Budget' : 'Over Budget'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default BudgetDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Save, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COST_CENTERS = ["Marketing", "Operations", "IT", "Salary & Commissions", "Miscellaneous"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const BudgetSheetPage = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [entity, setEntity] = useState('CLT');
    const [budgetItems, setBudgetItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const token = localStorage.getItem('token');

    const fetchBudget = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/finance/budgeting/sheet?year=${year}&entity=${entity}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setBudgetItems(data.length > 0 ? data : getDefaultBudgetItems());
            } else {
                setBudgetItems(getDefaultBudgetItems());
            }
        } catch (error) {
            toast.error('Failed to fetch budget');
            setBudgetItems(getDefaultBudgetItems());
        }
        setLoading(false);
    }, [token, year, entity]);

    useEffect(() => {
        fetchBudget();
    }, [fetchBudget]);

    const getDefaultBudgetItems = () => {
        return COST_CENTERS.map(cc => ({
            id: `new-${cc}`,
            cost_center: cc,
            year,
            entity,
            monthly_budgets: MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {})
        }));
    };

    const handleMonthChange = (itemIndex, month, value) => {
        setBudgetItems(prev => {
            const updated = [...prev];
            updated[itemIndex] = {
                ...updated[itemIndex],
                monthly_budgets: {
                    ...updated[itemIndex].monthly_budgets,
                    [month]: parseFloat(value) || 0
                }
            };
            return updated;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/finance/budgeting/sheet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    year,
                    entity,
                    items: budgetItems
                })
            });

            if (response.ok) {
                toast.success('Budget saved successfully');
                fetchBudget();
            } else {
                toast.error('Failed to save budget');
            }
        } catch (error) {
            toast.error('Error saving budget');
        }
        setSaving(false);
    };

    const handleExport = () => {
        const headers = ['Cost Center', ...MONTHS, 'Total'];
        const rows = budgetItems.map(item => {
            const monthlyValues = MONTHS.map(m => item.monthly_budgets[m] || 0);
            const total = monthlyValues.reduce((sum, v) => sum + v, 0);
            return [item.cost_center, ...monthlyValues.map(v => formatNumber(v)), formatNumber(total)];
        });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budget_${entity}_${year}.csv`;
        a.click();
    };

    const calculateRowTotal = (item) => {
        return MONTHS.reduce((sum, m) => sum + (item.monthly_budgets[m] || 0), 0);
    };

    const calculateColumnTotal = (month) => {
        return budgetItems.reduce((sum, item) => sum + (item.monthly_budgets[month] || 0), 0);
    };

    const grandTotal = budgetItems.reduce((sum, item) => sum + calculateRowTotal(item), 0);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="budget-sheet-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-purple-500">Budget Sheet</h1>
                    <p className="text-muted-foreground">Annual budget planning by cost center</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchBudget}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Budget'}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Budget Planning</CardTitle>
                            <CardDescription>Enter monthly budget allocations</CardDescription>
                        </div>
                        <div className="flex gap-4">
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
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background">Cost Center</TableHead>
                                    {MONTHS.map(m => (
                                        <TableHead key={m} className="text-center min-w-[100px]">{m}</TableHead>
                                    ))}
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {budgetItems.map((item, idx) => (
                                    <TableRow key={item.id || idx}>
                                        <TableCell className="sticky left-0 bg-background font-medium">
                                            {item.cost_center}
                                        </TableCell>
                                        {MONTHS.map(m => (
                                            <TableCell key={m} className="p-1">
                                                <Input
                                                    type="number"
                                                    value={item.monthly_budgets[m] || ''}
                                                    onChange={(e) => handleMonthChange(idx, m, e.target.value)}
                                                    className="w-24 text-right text-sm"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-mono font-medium text-purple-500">
                                            {formatNumber(calculateRowTotal(item))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-muted/50 font-bold">
                                    <TableCell className="sticky left-0 bg-muted/50">Total</TableCell>
                                    {MONTHS.map(m => (
                                        <TableCell key={m} className="text-center font-mono">
                                            {formatNumber(calculateColumnTotal(m))}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right font-mono text-purple-500">
                                        {formatNumber(grandTotal)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default BudgetSheetPage;

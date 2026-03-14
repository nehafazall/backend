import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Users, TrendingUp, ChevronRight, Building2 } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(v || 0);

export const SalaryEstimationWidget = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDetail, setShowDetail] = useState(false);

    useEffect(() => {
        api.get('/hr/salary-estimation').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
    }, []);

    if (loading) return <Card><CardContent className="pt-6 h-32 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary" /></CardContent></Card>;
    if (!data) return null;

    return (
        <>
            <Card className="border-2 border-primary/20" data-testid="salary-estimation-widget">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" /> Salary Estimation
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowDetail(true)} data-testid="salary-detail-btn">
                            Details <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                    <CardDescription>Estimated monthly gross salary payout</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Total Gross</p>
                            <p className="text-2xl font-bold text-primary" data-testid="salary-total-gross">{fmt(data.total_gross)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Net</p>
                            <p className="text-2xl font-bold text-emerald-500">{fmt(data.total_net)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Deductions</p>
                            <p className="text-2xl font-bold text-amber-500">{fmt(data.total_deductions)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Active Employees</p>
                            <p className="text-2xl font-bold">{data.total_employees}</p>
                        </div>
                    </div>
                    {data.by_department?.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Top Departments</p>
                            {data.by_department.slice(0, 3).map((d, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{d.department}</span>
                                    <span className="font-medium">{fmt(d.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Salary Estimation Breakdown</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Gross</p><p className="text-xl font-bold text-primary">{fmt(data.total_gross)}</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Net</p><p className="text-xl font-bold text-emerald-500">{fmt(data.total_net)}</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Deductions</p><p className="text-xl font-bold text-amber-500">{fmt(data.total_deductions)}</p></CardContent></Card>
                        </div>
                        {data.employees?.length > 0 && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Designation</TableHead>
                                        <TableHead className="text-right">Gross</TableHead>
                                        <TableHead className="text-right">Net</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.employees.map((e, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{e.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{e.department}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{e.designation}</TableCell>
                                            <TableCell className="text-right font-medium">{fmt(e.gross)}</TableCell>
                                            <TableCell className="text-right">{fmt(e.net)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SalaryEstimationWidget;

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
    DollarSign, RefreshCw, Play, Check, Download, 
    FileText, Building2, Users, Calculator
} from 'lucide-react';

const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

const STATUS_COLORS = {
    draft: 'bg-slate-500',
    calculated: 'bg-blue-500',
    hr_approved: 'bg-amber-500',
    finance_approved: 'bg-green-500',
    paid: 'bg-emerald-600',
    on_hold: 'bg-red-500'
};

const PayrollPage = () => {
    const [batches, setBatches] = useState([]);
    const [payroll, setPayroll] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('batches');
    const [showRunModal, setShowRunModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    
    const currentDate = new Date();
    const [runMonth, setRunMonth] = useState(currentDate.getMonth() + 1);
    const [runYear, setRunYear] = useState(currentDate.getFullYear());
    const [runDepartment, setRunDepartment] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const batchesRes = await api.get('/hr/payroll/batches');
            setBatches(batchesRes.data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayrollForMonth = async (month) => {
        try {
            const res = await api.get(`/hr/payroll?month=${month}`);
            setPayroll(res.data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleRunPayroll = async () => {
        try {
            const data = {
                month: runMonth,
                year: runYear,
                department: runDepartment || null
            };
            const res = await api.post('/hr/payroll/run', data);
            toast.success(res.data.message);
            setShowRunModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to run payroll');
        }
    };

    const handleApprove = async (batchId, level) => {
        try {
            await api.put(`/hr/payroll/batch/${batchId}/approve?approval_level=${level}`);
            toast.success(`Payroll ${level} approved`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Approval failed');
        }
    };

    const handleMarkPaid = async (batchId) => {
        try {
            await api.put(`/hr/payroll/batch/${batchId}/pay`);
            toast.success('Payroll marked as paid');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Action failed');
        }
    };

    const viewBatchDetails = (batch) => {
        setSelectedBatch(batch);
        fetchPayrollForMonth(batch.month);
        setActiveTab('details');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount || 0);
    };

    const totalGross = batches.reduce((sum, b) => sum + (b.total_gross || 0), 0);
    const totalNet = batches.reduce((sum, b) => sum + (b.total_net || 0), 0);

    return (
        <div className="space-y-6" data-testid="payroll-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
                    <p className="text-muted-foreground">Process and manage employee payroll</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={() => setShowRunModal(true)} data-testid="run-payroll-btn">
                        <Play className="h-4 w-4 mr-2" />Run Payroll
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{batches.length}</p>
                                <p className="text-sm text-muted-foreground">Payroll Batches</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{formatCurrency(totalGross)}</p>
                                <p className="text-sm text-muted-foreground">Total Gross</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                                <Calculator className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{formatCurrency(totalNet)}</p>
                                <p className="text-sm text-muted-foreground">Total Net</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {batches.reduce((sum, b) => sum + (b.employee_count || 0), 0)}
                                </p>
                                <p className="text-sm text-muted-foreground">Employees Processed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="batches">Payroll Batches</TabsTrigger>
                    <TabsTrigger value="details" disabled={!selectedBatch}>
                        {selectedBatch ? `Details: ${selectedBatch.month}` : 'Details'}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="batches" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payroll Batches</CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Employees</TableHead>
                                    <TableHead>Total Gross</TableHead>
                                    <TableHead>Total Net</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batches.map((batch) => (
                                    <TableRow key={batch.id}>
                                        <TableCell className="font-medium">{batch.month}</TableCell>
                                        <TableCell>{batch.department || 'All'}</TableCell>
                                        <TableCell>{batch.employee_count}</TableCell>
                                        <TableCell>{formatCurrency(batch.total_gross)}</TableCell>
                                        <TableCell className="font-medium">{formatCurrency(batch.total_net)}</TableCell>
                                        <TableCell>
                                            <Badge className={`${STATUS_COLORS[batch.status]} text-white`}>
                                                {batch.status?.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{batch.created_by_name}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => viewBatchDetails(batch)}
                                                >
                                                    View
                                                </Button>
                                                {batch.status === 'draft' && (
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleApprove(batch.id, 'hr')}
                                                    >
                                                        HR Approve
                                                    </Button>
                                                )}
                                                {batch.status === 'hr_approved' && (
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleApprove(batch.id, 'finance')}
                                                    >
                                                        Finance Approve
                                                    </Button>
                                                )}
                                                {batch.status === 'finance_approved' && (
                                                    <Button 
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                        onClick={() => handleMarkPaid(batch.id)}
                                                    >
                                                        Mark Paid
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {batches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No payroll batches. Click "Run Payroll" to process.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="details" className="mt-4">
                    {selectedBatch && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Payroll Details - {selectedBatch.month}</CardTitle>
                            </CardHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Basic</TableHead>
                                        <TableHead>Allowances</TableHead>
                                        <TableHead>Gross</TableHead>
                                        <TableHead>Deductions</TableHead>
                                        <TableHead>Additions</TableHead>
                                        <TableHead>Net Salary</TableHead>
                                        <TableHead>Days Worked</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payroll.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{record.employee_name}</p>
                                                    <p className="text-xs text-muted-foreground">{record.employee_code}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{record.department}</TableCell>
                                            <TableCell>{formatCurrency(record.basic_salary)}</TableCell>
                                            <TableCell>
                                                {formatCurrency(
                                                    (record.housing_allowance || 0) + 
                                                    (record.transport_allowance || 0) + 
                                                    (record.food_allowance || 0) + 
                                                    (record.phone_allowance || 0)
                                                )}
                                            </TableCell>
                                            <TableCell>{formatCurrency(record.gross_salary)}</TableCell>
                                            <TableCell className="text-red-600">
                                                -{formatCurrency(record.total_deductions)}
                                            </TableCell>
                                            <TableCell className="text-green-600">
                                                +{formatCurrency(record.total_additions)}
                                            </TableCell>
                                            <TableCell className="font-bold">
                                                {formatCurrency(record.net_salary)}
                                            </TableCell>
                                            <TableCell>{record.days_worked}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Run Payroll Modal */}
            <Dialog open={showRunModal} onOpenChange={setShowRunModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Run Payroll</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Month</Label>
                                <Select value={String(runMonth)} onValueChange={(v) => setRunMonth(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map(m => (
                                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Year</Label>
                                <Input 
                                    type="number" 
                                    value={runYear}
                                    onChange={(e) => setRunYear(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Department (Optional)</Label>
                            <Select value={runDepartment} onValueChange={setRunDepartment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                    <SelectItem value="Finance">Finance</SelectItem>
                                    <SelectItem value="Customer Service">Customer Service</SelectItem>
                                    <SelectItem value="Mentors/Academics">Mentors/Academics</SelectItem>
                                    <SelectItem value="Operations">Operations</SelectItem>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="HR">HR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            This will calculate payroll for all active employees based on their salary structure and attendance records.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRunModal(false)}>Cancel</Button>
                        <Button onClick={handleRunPayroll}>Run Payroll</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PayrollPage;

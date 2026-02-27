import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Receipt, Download, Eye, Calendar, DollarSign, FileText } from 'lucide-react';

const PayslipsPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedPayslip, setSelectedPayslip] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
        years.push(y.toString());
    }

    useEffect(() => {
        fetchPayslips();
    }, [selectedYear]);

    const fetchPayslips = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/ess/payslips?year=${selectedYear}`);
            setPayslips(res.data);
        } catch (error) {
            // May not have payslips yet
            setPayslips([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewPayslip = (payslip) => {
        setSelectedPayslip(payslip);
        setShowDetail(true);
    };

    const handleDownloadPayslip = async (payslipId) => {
        try {
            toast.info('Generating PDF payslip...');
            const res = await apiClient.get(`/ess/payslips/${payslipId}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payslip_${payslipId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Payslip downloaded');
        } catch (error) {
            toast.error('Payslip download not available yet');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const getMonthName = (monthStr) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="space-y-6" data-testid="payslips-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="h-6 w-6 text-primary" />
                        My Payslips
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        View and download your salary payslips
                    </p>
                </div>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[150px]" data-testid="year-selector">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                                <DollarSign className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(payslips.reduce((sum, p) => sum + (p.net_salary || 0), 0))}
                                </p>
                                <p className="text-xs text-muted-foreground">Total Earned ({selectedYear})</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <FileText className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{payslips.length}</p>
                                <p className="text-xs text-muted-foreground">Payslips Available</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <Receipt className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {payslips.length > 0 ? getMonthName(payslips[0]?.month) : '--'}
                                </p>
                                <p className="text-xs text-muted-foreground">Latest Payslip</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payslips Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Payslip History</CardTitle>
                    <CardDescription>All your payslips for {selectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : payslips.length === 0 ? (
                        <div className="text-center py-12">
                            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No payslips found for {selectedYear}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Payslips will appear here once processed by HR
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Basic Salary</TableHead>
                                    <TableHead>Allowances</TableHead>
                                    <TableHead>Deductions</TableHead>
                                    <TableHead>Net Salary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslips.map((payslip) => (
                                    <TableRow key={payslip.id}>
                                        <TableCell className="font-medium">
                                            {getMonthName(payslip.month)}
                                        </TableCell>
                                        <TableCell>{formatCurrency(payslip.basic_salary)}</TableCell>
                                        <TableCell className="text-emerald-600">
                                            +{formatCurrency(payslip.total_allowances)}
                                        </TableCell>
                                        <TableCell className="text-red-600">
                                            -{formatCurrency(payslip.total_deductions)}
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {formatCurrency(payslip.net_salary)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={payslip.status === 'paid' ? 'default' : 'secondary'}>
                                                {payslip.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewPayslip(payslip)}
                                                    data-testid={`view-payslip-${payslip.id}`}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDownloadPayslip(payslip.id)}
                                                    data-testid={`download-payslip-${payslip.id}`}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Payslip Detail Dialog */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-2xl" data-testid="payslip-detail-modal">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" />
                            Payslip - {selectedPayslip && getMonthName(selectedPayslip.month)}
                        </DialogTitle>
                        <DialogDescription>
                            Detailed breakdown of your salary
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedPayslip && (
                        <div className="space-y-6">
                            {/* Employee Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div>
                                    <p className="text-xs text-muted-foreground">Employee</p>
                                    <p className="font-medium">{selectedPayslip.employee_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Employee ID</p>
                                    <p className="font-medium">{selectedPayslip.employee_id}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Department</p>
                                    <p className="font-medium">{selectedPayslip.department || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Designation</p>
                                    <p className="font-medium">{selectedPayslip.designation || 'N/A'}</p>
                                </div>
                            </div>
                            
                            {/* Earnings */}
                            <div>
                                <h3 className="font-semibold mb-3 text-emerald-600">Earnings</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Basic Salary</span>
                                        <span>{formatCurrency(selectedPayslip.basic_salary)}</span>
                                    </div>
                                    {selectedPayslip.allowances?.map((a, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{a.name}</span>
                                            <span className="text-emerald-600">+{formatCurrency(a.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-medium border-t pt-2">
                                        <span>Total Earnings</span>
                                        <span className="text-emerald-600">
                                            {formatCurrency(selectedPayslip.basic_salary + (selectedPayslip.total_allowances || 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Deductions */}
                            <div>
                                <h3 className="font-semibold mb-3 text-red-600">Deductions</h3>
                                <div className="space-y-2">
                                    {selectedPayslip.deductions?.map((d, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{d.name}</span>
                                            <span className="text-red-600">-{formatCurrency(d.amount)}</span>
                                        </div>
                                    ))}
                                    {(selectedPayslip.deductions?.length === 0 || !selectedPayslip.deductions) && (
                                        <div className="text-sm text-muted-foreground">No deductions</div>
                                    )}
                                    <div className="flex justify-between font-medium border-t pt-2">
                                        <span>Total Deductions</span>
                                        <span className="text-red-600">
                                            -{formatCurrency(selectedPayslip.total_deductions || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Net Salary */}
                            <div className="p-4 bg-primary/10 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">Net Salary</span>
                                    <span className="text-2xl font-bold text-primary">
                                        {formatCurrency(selectedPayslip.net_salary)}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Working Days */}
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xl font-bold">{selectedPayslip.working_days || 0}</p>
                                    <p className="text-xs text-muted-foreground">Working Days</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xl font-bold">{selectedPayslip.present_days || 0}</p>
                                    <p className="text-xs text-muted-foreground">Present Days</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xl font-bold">{selectedPayslip.absent_days || 0}</p>
                                    <p className="text-xs text-muted-foreground">Absent Days</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PayslipsPage;

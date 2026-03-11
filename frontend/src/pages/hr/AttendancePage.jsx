import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Clock, CheckCircle, AlertTriangle, UserCheck, Calendar, Download, Upload, FileSpreadsheet } from 'lucide-react';

const AttendancePage = () => {
    const [attendance, setAttendance] = useState([]);
    const [regularizations, setRegularizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterDept, setFilterDept] = useState('');
    const [activeTab, setActiveTab] = useState('daily');

    // Manual import state
    const [importMonth, setImportMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [downloading, setDownloading] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, [selectedDate, filterDept]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('date', selectedDate);
            if (filterDept && filterDept !== 'all') params.append('department', filterDept);
            
            const [attendanceRes, regRes] = await Promise.all([
                api.get(`/hr/attendance?${params.toString()}`),
                api.get('/hr/regularization-requests?pending_approval=true')
            ]);
            setAttendance(attendanceRes.data || []);
            setRegularizations(regRes.data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegApprove = async (requestId, action) => {
        try {
            await api.put(`/hr/regularization-requests/${requestId}/approve?action=${action}`);
            toast.success(`Request ${action}d`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Action failed');
        }
    };

    const handleDownloadTemplate = async () => {
        setDownloading(true);
        try {
            const response = await api.get(`/hr/attendance/template/download?month=${importMonth}`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const [y, m] = importMonth.split('-');
            const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            a.download = `attendance_template_${monthNames[parseInt(m)-1]}_${y}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Template downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            toast.error(error.response?.data?.detail || 'Failed to download template');
        } finally {
            setDownloading(false);
        }
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('month', importMonth);

            const response = await api.post('/hr/attendance/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = response.data;
            toast.success(data.message);
            if (data.errors?.length > 0) {
                data.errors.forEach(err => toast.error(err, { duration: 5000 }));
            }
            fetchData();
        } catch (error) {
            console.error('Import error:', error);
            toast.error(error.response?.data?.detail || 'Failed to import attendance');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getStatusBadge = (record) => {
        if (record.status === 'wfh') return <Badge className="bg-blue-500 text-white">WFH</Badge>;
        if (record.status === 'leave') return <Badge className="bg-purple-500 text-white">Leave</Badge>;
        if (record.status === 'holiday') return <Badge className="bg-slate-500 text-white">Holiday</Badge>;
        if (record.half_day) return <Badge className="bg-orange-500 text-white">Half Day</Badge>;
        if (record.late_minutes > 0) return <Badge className="bg-amber-500 text-white">Late</Badge>;
        if (record.status === 'present') return <Badge className="bg-green-500 text-white">Present</Badge>;
        return <Badge className="bg-red-500 text-white">Absent</Badge>;
    };

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const lateCount = attendance.filter(a => a.late_minutes > 0 && !a.half_day).length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const wfhCount = attendance.filter(a => a.status === 'wfh').length;
    const halfDayCount = attendance.filter(a => a.half_day).length;

    // Generate month options for the selector
    const monthOptions = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        monthOptions.push({ value: val, label });
    }

    return (
        <div className="space-y-6" data-testid="attendance-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
                    <p className="text-muted-foreground">Track daily attendance, regularizations, and manual imports</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-attendance-btn">
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{presentCount}</p>
                                <p className="text-sm text-muted-foreground">Present</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{lateCount}</p>
                                <p className="text-sm text-muted-foreground">Late</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{absentCount}</p>
                                <p className="text-sm text-muted-foreground">Absent</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                <UserCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{wfhCount}</p>
                                <p className="text-sm text-muted-foreground">WFH</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{regularizations.length}</p>
                                <p className="text-sm text-muted-foreground">Pending Reg.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
                    <TabsTrigger value="regularization">Regularizations ({regularizations.length})</TabsTrigger>
                    <TabsTrigger value="import" data-testid="manual-import-tab">Manual Import</TabsTrigger>
                </TabsList>

                {/* Daily Attendance Tab */}
                <TabsContent value="daily" className="mt-4">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between gap-4">
                            <CardTitle>Attendance for {selectedDate}</CardTitle>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="date" 
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-[180px]"
                                />
                                <Select value={filterDept} onValueChange={setFilterDept}>
                                    <SelectTrigger className="w-[180px]">
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
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    <TableHead>Work Hours</TableHead>
                                    <TableHead>Late (mins)</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendance.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{record.employee_name}</p>
                                                <p className="text-xs text-muted-foreground">{record.employee_code}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{record.department}</TableCell>
                                        <TableCell>{record.biometric_in || '-'}</TableCell>
                                        <TableCell>{record.biometric_out || '-'}</TableCell>
                                        <TableCell>{record.total_work_hours?.toFixed(1) || '-'} hrs</TableCell>
                                        <TableCell>
                                            {record.late_minutes > 0 ? (
                                                <span className="text-amber-600 font-medium">{record.late_minutes}</span>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(record)}</TableCell>
                                    </TableRow>
                                ))}
                                {attendance.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No attendance records for this date
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Regularization Tab */}
                <TabsContent value="regularization" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Regularization Requests</CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Original</TableHead>
                                    <TableHead>Corrected</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {regularizations.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{req.employee_name}</p>
                                                <p className="text-xs text-muted-foreground">{req.employee_code}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{req.date}</TableCell>
                                        <TableCell className="capitalize">{req.type?.replace(/_/g, ' ')}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>In: {req.original_in || '-'}</p>
                                                <p>Out: {req.original_out || '-'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>In: {req.corrected_in || '-'}</p>
                                                <p>Out: {req.corrected_out || '-'}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[150px] truncate">{req.reason}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{req.current_approver_level}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" className="text-green-600"
                                                    onClick={() => handleRegApprove(req.id, 'approve')}>
                                                    Approve
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600"
                                                    onClick={() => handleRegApprove(req.id, 'reject')}>
                                                    Reject
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {regularizations.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No pending regularization requests
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Manual Import Tab */}
                <TabsContent value="import" className="mt-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Step 1: Download Template */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Download className="h-5 w-5 text-blue-600" />
                                    Step 1: Download Template
                                </CardTitle>
                                <CardDescription>
                                    Select a month and download the pre-filled attendance template with all active employees and their salary breakdowns.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Select Month</label>
                                    <Select value={importMonth} onValueChange={setImportMonth}>
                                        <SelectTrigger data-testid="import-month-select">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button 
                                    onClick={handleDownloadTemplate} 
                                    disabled={downloading}
                                    className="w-full"
                                    data-testid="download-attendance-template-btn"
                                >
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    {downloading ? 'Generating...' : 'Download XLSX Template'}
                                </Button>
                                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                                    <p className="font-medium">Template includes:</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        <li>Employee ID, Name, Department, Designation</li>
                                        <li>Basic Salary & all allowances (pre-filled)</li>
                                        <li>Yellow columns to fill: Full Days, Half Days, Approved Leaves</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step 2: Upload Filled Sheet */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="h-5 w-5 text-green-600" />
                                    Step 2: Upload Filled Sheet
                                </CardTitle>
                                <CardDescription>
                                    Fill in the attendance columns (Full Days, Half Days, Approved Leaves) and upload the completed sheet.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Import Month</label>
                                    <Select value={importMonth} onValueChange={setImportMonth}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monthOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".xlsx,.xls"
                                    onChange={handleImportFile}
                                    className="hidden"
                                    data-testid="attendance-file-input"
                                />
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importing}
                                    variant="outline"
                                    className="w-full border-dashed border-2 h-20"
                                    data-testid="upload-attendance-btn"
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <Upload className="h-5 w-5" />
                                        <span className="text-sm">{importing ? 'Importing...' : 'Click to upload filled XLSX'}</span>
                                    </div>
                                </Button>
                                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                                    <p className="font-medium">After import:</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        <li>Attendance records are created for each employee</li>
                                        <li>Previous manual imports for the same month are replaced</li>
                                        <li>Payroll can be run using this attendance data</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AttendancePage;

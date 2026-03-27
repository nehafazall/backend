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
    const [attendanceData, setAttendanceData] = useState(null);
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
            setAttendanceData(attendanceRes.data || {});
            setAttendance(attendanceRes.data?.records || attendanceRes.data || []);
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
        if (record.status === 'warning') return <Badge className="bg-orange-600 text-white">Warning</Badge>;
        if (record.status === 'half_day') return <Badge className="bg-orange-500 text-white">Half Day</Badge>;
        if (record.status === 'late') return <Badge className="bg-amber-500 text-white">Late</Badge>;
        if (record.late_minutes > 0 && record.status === 'present') return <Badge className="bg-amber-500 text-white">Late</Badge>;
        if (record.status === 'present') return <Badge className="bg-green-500 text-white">Present</Badge>;
        return <Badge className="bg-red-500 text-white">Absent</Badge>;
    };

    // Use summary from API if available
    const teamStrength = attendanceData?.team_strength || {};
    const summary = attendanceData?.summary || {};
    const presentCount = summary.present || attendance.filter(a => a.status === 'present').length;
    const lateCount = summary.late || attendance.filter(a => a.status === 'late').length;
    const warningCount = summary.warning || attendance.filter(a => a.status === 'warning').length;
    const halfDayCount = summary.half_day || attendance.filter(a => a.status === 'half_day').length;
    const absentCount = summary.absent || 0;
    const wfhCount = attendance.filter(a => a.status === 'wfh').length;

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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-2xl font-bold">{teamStrength.total || '-'}</p>
                        <p className="text-xs text-muted-foreground">Team Strength</p>
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span>UAE: {teamStrength.uae || 0}</span>
                            <span>IND: {teamStrength.india || 0}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                        <p className="text-xs text-muted-foreground">Present</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
                        <p className="text-xs text-muted-foreground">Late</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-600">
                    <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-2xl font-bold text-orange-600">{warningCount}</p>
                        <p className="text-xs text-muted-foreground">Warning</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-400">
                    <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-2xl font-bold text-orange-500">{halfDayCount}</p>
                        <p className="text-xs text-muted-foreground">Half Day</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                        <p className="text-xs text-muted-foreground">Absent</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-400">
                    <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-2xl font-bold text-blue-500">{wfhCount}</p>
                        <p className="text-xs text-muted-foreground">WFH</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-2xl font-bold text-purple-600">{regularizations.length}</p>
                        <p className="text-xs text-muted-foreground">Pending Reg.</p>
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
                                    <TableHead>Remarks</TableHead>
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
                                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                            {record.half_day_reason || record.shift_name || '-'}
                                        </TableCell>
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
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Step 1: Download Template */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Download className="h-5 w-5 text-blue-600" />
                                    Step 1: Download Template
                                </CardTitle>
                                <CardDescription>
                                    Download the pre-filled template with daily punch-in/out columns.
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
                                        <li>Employee ID, Name, Department, Salary</li>
                                        <li>Daily In/Out columns (pre-filled from biometric)</li>
                                        <li>Auto-calculated Full/Half/Absent days</li>
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
                                    Fill daily punch times and upload the completed sheet.
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
                                        <li>Daily attendance records created per employee</li>
                                        <li>Half/Full day auto-calculated from hours</li>
                                        <li>Previous manual imports for same month replaced</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Biocloud Upload */}
                        <Card className="border-emerald-500/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-emerald-600" />
                                    BioCloud Upload
                                </CardTitle>
                                <CardDescription>
                                    Upload the BioCloud attendance export directly to sync biometric punch data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <input
                                    type="file"
                                    id="biocloud-file"
                                    accept=".xlsx,.xls"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        try {
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            toast.info('Processing BioCloud export...');
                                            const res = await api.post('/hr/biocloud/upload-attendance', formData, {
                                                headers: { 'Content-Type': 'multipart/form-data' }
                                            });
                                            const d = res.data;
                                            toast.success(d.message, { duration: 8000 });
                                            if (d.unmatched_employees?.length > 0) {
                                                toast.warning(`${d.unmatched_employees.length} badge numbers not mapped: ${d.unmatched_employees.map(u => u.badge + ' ' + u.name).join(', ')}`, { duration: 10000 });
                                            }
                                            fetchData();
                                        } catch (err) {
                                            toast.error(err.response?.data?.detail || 'Upload failed');
                                        }
                                        e.target.value = '';
                                    }}
                                    className="hidden"
                                    data-testid="biocloud-file-input"
                                />
                                <Button
                                    onClick={() => document.getElementById('biocloud-file')?.click()}
                                    variant="outline"
                                    className="w-full border-dashed border-2 h-20 border-emerald-500/40 hover:border-emerald-500"
                                    data-testid="upload-biocloud-btn"
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <UserCheck className="h-5 w-5 text-emerald-600" />
                                        <span className="text-sm">Upload BioCloud XLSX Export</span>
                                    </div>
                                </Button>
                                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                                    <p className="font-medium">How it works:</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        <li>Upload the raw export from BioCloud</li>
                                        <li>First In & Last Out auto-extracted per day</li>
                                        <li>Matched by Badge Number to mapped employees</li>
                                        <li>Pre-fills the attendance template</li>
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

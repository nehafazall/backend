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
import { RefreshCw, Clock, CheckCircle, AlertTriangle, UserCheck, Calendar } from 'lucide-react';

const AttendancePage = () => {
    const [attendance, setAttendance] = useState([]);
    const [regularizations, setRegularizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterDept, setFilterDept] = useState('');
    const [activeTab, setActiveTab] = useState('daily');

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

    const getStatusBadge = (record) => {
        if (record.status === 'wfh') return <Badge className="bg-blue-500 text-white">WFH</Badge>;
        if (record.status === 'leave') return <Badge className="bg-purple-500 text-white">Leave</Badge>;
        if (record.status === 'holiday') return <Badge className="bg-slate-500 text-white">Holiday</Badge>;
        if (record.late_minutes > 0) return <Badge className="bg-amber-500 text-white">Late</Badge>;
        if (record.status === 'present') return <Badge className="bg-green-500 text-white">Present</Badge>;
        return <Badge className="bg-red-500 text-white">Absent</Badge>;
    };

    const presentCount = attendance.filter(a => a.status === 'present').length;
    const lateCount = attendance.filter(a => a.late_minutes > 0).length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const wfhCount = attendance.filter(a => a.status === 'wfh').length;

    return (
        <div className="space-y-6" data-testid="attendance-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
                    <p className="text-muted-foreground">Track daily attendance and regularizations</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                </TabsList>

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
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="text-green-600"
                                                    onClick={() => handleRegApprove(req.id, 'approve')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="text-red-600"
                                                    onClick={() => handleRegApprove(req.id, 'reject')}
                                                >
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
            </Tabs>
        </div>
    );
};

export default AttendancePage;

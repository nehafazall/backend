import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Calendar,
    Clock,
    Plus,
    RefreshCw,
    CalendarDays,
    Timer,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Briefcase,
    ChevronRight,
    User,
    ListTodo,
    ArrowUpDown,
    Trash2,
} from 'lucide-react';
import {
    LeaveBalanceWidget,
    WeeklyAttendanceWidget,
    PendingRequestsWidget,
    AssetsWidget,
    RequestHistoryWidget,
} from './ESSWidgets';
import LeaveApplicationModal from './LeaveApplicationModal';
import AttendanceRegularizationModal from './AttendanceRegularizationModal';

const ESSSection = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [essData, setEssData] = useState(null);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showRegModal, setShowRegModal] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [punchStatus, setPunchStatus] = useState(null);
    const [timesheetTasks, setTimesheetTasks] = useState([{ task_id: '', task_title: '', description: '', hours: 0, category: '', notes: '' }]);
    const [timesheetSummary, setTimesheetSummary] = useState('');
    const [assignedTasks, setAssignedTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [timesheetHistory, setTimesheetHistory] = useState([]);
    const [monthlyAttendance, setMonthlyAttendance] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const fetchESSData = useCallback(async () => {
        setLoading(true);
        try {
            const [essRes, punchRes, tasksRes, catRes, tsRes] = await Promise.all([
                apiClient.get('/ess/dashboard'),
                apiClient.get('/hr/my-punch-status').catch(() => ({ data: { has_employee_record: false } })),
                apiClient.get('/hr/tasks').catch(() => ({ data: [] })),
                apiClient.get('/hr/task-categories').catch(() => ({ data: [] })),
                apiClient.get('/hr/timesheet').catch(() => ({ data: [] })),
            ]);
            setEssData(essRes.data);
            setPunchStatus(punchRes.data);
            setAssignedTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
            setCategories(Array.isArray(catRes.data) ? catRes.data : []);
            setTimesheetHistory(Array.isArray(tsRes.data) ? tsRes.data : []);
        } catch (error) {
            console.error('Failed to fetch ESS data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMonthlyAttendance = useCallback(async () => {
        try {
            const [y, m] = selectedMonth.split('-');
            const res = await apiClient.get(`/hr/my-monthly-attendance?year=${y}&month=${m}`);
            setMonthlyAttendance(res.data);
        } catch {
            console.error('Failed to fetch monthly attendance');
        }
    }, [selectedMonth]);

    useEffect(() => { fetchMonthlyAttendance(); }, [fetchMonthlyAttendance]);

    useEffect(() => {
        fetchESSData();
    }, [fetchESSData]);

    const handleAttendanceClick = (record) => {
        setSelectedAttendance(record);
        setShowRegModal(true);
    };

    const handleRefresh = () => {
        fetchESSData();
        toast.success('Data refreshed');
    };

    const handlePunch = async (type) => {
        try {
            const res = await apiClient.post('/hr/punch', { type });
            toast.success(res.data.message);
            fetchESSData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Punch failed');
        }
    };

    const handleSubmitTimesheet = async () => {
        const validTasks = timesheetTasks.filter(t => (t.description?.trim() || t.task_title?.trim()) && t.hours > 0);
        if (validTasks.length === 0) {
            toast.error('Add at least one task with hours');
            return;
        }
        try {
            await apiClient.post('/hr/timesheet', {
                tasks: validTasks.map(t => ({
                    task_id: t.task_id || '',
                    task_title: t.task_title || t.description || '',
                    description: t.notes || t.description || '',
                    hours: t.hours,
                    category: t.category || 'Other',
                })),
                summary: timesheetSummary
            });
            toast.success('Timesheet submitted');
            setTimesheetTasks([{ task_id: '', task_title: '', description: '', hours: 0, category: '', notes: '' }]);
            setTimesheetSummary('');
            fetchESSData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Timesheet submission failed');
        }
    };

    const handlePickTask = (task) => {
        setTimesheetTasks(prev => [...prev, {
            task_id: task.id,
            task_title: task.title,
            description: '',
            hours: 0,
            category: task.category || '',
            notes: '',
        }]);
    };

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            await apiClient.put(`/hr/tasks/${taskId}`, { status: newStatus });
            toast.success('Task updated');
            fetchESSData();
        } catch (err) {
            toast.error('Failed to update task');
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'approved') return <Badge className="bg-emerald-500">Approved</Badge>;
        if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
        if (status?.startsWith('pending')) return <Badge variant="secondary">Pending</Badge>;
        return <Badge variant="outline">{status}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!essData?.employee && !punchStatus?.has_employee_record) {
        return (
            <Card className="border-amber-500/50 bg-amber-500/5">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-amber-500/10">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Employee Record Not Found</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Your user account is not linked to an employee record. Please contact HR to set up your employee profile.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6" data-testid="ess-section">
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <User className="h-6 w-6 text-primary" />
                        My Self-Service
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {essData?.employee?.full_name} • {essData?.employee?.designation || 'Employee'} • {essData?.employee?.department}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => setShowLeaveModal(true)} data-testid="apply-leave-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Apply Leave
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowRegModal(true)} data-testid="regularization-btn">
                        <Clock className="h-4 w-4 mr-2" />
                        Regularization
                    </Button>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{essData?.attendance?.monthly_summary?.present || 0}</p>
                                <p className="text-xs text-muted-foreground">Days Present (Month)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <Timer className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{essData?.attendance?.monthly_summary?.total_hours || 0}</p>
                                <p className="text-xs text-muted-foreground">Hours Worked (Month)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <CalendarDays className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {essData?.leave_balance?.find(l => l.leave_type === 'annual_leave')?.remaining_days || '--'}
                                </p>
                                <p className="text-xs text-muted-foreground">Annual Leave Left</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/20">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {(essData?.pending_requests?.leave || 0) + (essData?.pending_requests?.regularization || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Pending Requests</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Punch In/Out Card */}
            {punchStatus?.has_employee_record && (
                <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="punch-card">
                    <CardContent className="py-4 px-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-primary/10">
                                    <Clock className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">
                                        {punchStatus.shift?.name || 'Morning Shift'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {punchStatus.shift?.start || '10:00'} — {punchStatus.shift?.end || '19:00'} | {punchStatus.location || 'UAE'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {punchStatus.punch_in_time && (
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground">Punched In</p>
                                        <p className="font-mono font-bold text-green-600">{punchStatus.punch_in_time}</p>
                                    </div>
                                )}
                                {punchStatus.punch_out_time && (
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground">Punched Out</p>
                                        <p className="font-mono font-bold text-blue-600">{punchStatus.punch_out_time}</p>
                                    </div>
                                )}
                                {punchStatus.work_hours && (
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground">Hours</p>
                                        <p className="font-bold">{punchStatus.work_hours?.toFixed(1)}h</p>
                                    </div>
                                )}
                                {!punchStatus.punched_in ? (
                                    <Button onClick={() => handlePunch('in')} className="bg-green-600 hover:bg-green-700" data-testid="punch-in-btn">
                                        <Clock className="h-4 w-4 mr-2" />Punch In
                                    </Button>
                                ) : !punchStatus.punched_out ? (
                                    <Button onClick={() => handlePunch('out')} variant="destructive" data-testid="punch-out-btn">
                                        <Clock className="h-4 w-4 mr-2" />Punch Out
                                    </Button>
                                ) : (
                                    <Badge className="bg-green-600 text-white px-4 py-2">Completed</Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leaves">Leaves</TabsTrigger>
                    <TabsTrigger value="timesheet" data-testid="timesheet-tab">Timesheet</TabsTrigger>
                    <TabsTrigger value="requests">Requests</TabsTrigger>
                </TabsList>
                
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <WeeklyAttendanceWidget 
                            attendance={essData?.attendance} 
                            loading={loading} 
                        />
                        <LeaveBalanceWidget 
                            leaveBalance={essData?.leave_balance || []} 
                            loading={loading} 
                        />
                        <PendingRequestsWidget 
                            pendingRequests={essData?.pending_requests} 
                            loading={loading} 
                        />
                        <AssetsWidget 
                            assets={essData?.assets} 
                            loading={loading} 
                        />
                        <RequestHistoryWidget 
                            history={essData?.request_history} 
                            loading={loading} 
                        />
                    </div>
                </TabsContent>
                
                {/* Attendance Tab — Calendar View */}
                <TabsContent value="attendance" className="mt-4 space-y-4">
                    {/* Month Selector + Summary */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="px-3 py-2 rounded-md border bg-background text-sm"
                                data-testid="attendance-month-picker"
                            />
                            {monthlyAttendance?.shift && (
                                <Badge variant="outline" className="text-xs">
                                    {monthlyAttendance.shift.name}: {monthlyAttendance.shift.start} - {monthlyAttendance.shift.end}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Summary Cards */}
                    {monthlyAttendance?.summary && (
                        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                            {[
                                { label: 'Present', value: monthlyAttendance.summary.present, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
                                { label: 'Absent', value: monthlyAttendance.summary.absent, color: 'text-red-600 bg-red-50 dark:bg-red-950' },
                                { label: 'Half Day', value: monthlyAttendance.summary.half_day, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
                                { label: 'On Leave', value: monthlyAttendance.summary.on_leave, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' },
                                { label: 'Holiday', value: monthlyAttendance.summary.holiday || 0, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
                                { label: 'Late', value: monthlyAttendance.summary.late, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950' },
                                { label: 'No Data', value: monthlyAttendance.summary.no_data, color: 'text-slate-500 bg-slate-50 dark:bg-slate-900' },
                            ].map(s => (
                                <div key={s.label} className={`p-2.5 rounded-lg text-center ${s.color}`}>
                                    <p className="text-lg font-bold">{s.value}</p>
                                    <p className="text-[10px] font-medium uppercase tracking-wider">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Calendar Grid */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Monthly Calendar</CardTitle>
                            <CardDescription>Click any working day to view details or apply for regularization</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Day headers */}
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                    <div key={d} className={`text-center text-[10px] font-semibold uppercase tracking-wider py-1 ${d === 'Sun' ? 'text-red-400' : 'text-muted-foreground'}`}>{d}</div>
                                ))}
                            </div>
                            {/* Calendar cells */}
                            {(() => {
                                if (!monthlyAttendance?.days?.length) return (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>No attendance data for this month</p>
                                    </div>
                                );
                                
                                // Build calendar rows (pad leading empty cells for day alignment)
                                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                const firstDayName = monthlyAttendance.days[0]?.day_name;
                                const startOffset = dayNames.indexOf(firstDayName);
                                const padded = [...Array(startOffset >= 0 ? startOffset : 0).fill(null), ...monthlyAttendance.days];
                                const rows = [];
                                for (let i = 0; i < padded.length; i += 7) rows.push(padded.slice(i, i + 7));
                                
                                const cellColors = {
                                    present: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200',
                                    half_day: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 hover:bg-amber-200',
                                    absent: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 hover:bg-red-200',
                                    on_leave: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
                                    holiday: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700',
                                    weekend: 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-50',
                                    upcoming: 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-30',
                                    no_data: 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 hover:bg-orange-100',
                                };
                                const dotColors = {
                                    present: 'bg-emerald-500',
                                    half_day: 'bg-amber-500',
                                    absent: 'bg-red-500',
                                    on_leave: 'bg-blue-500',
                                    holiday: 'bg-purple-500',
                                    weekend: 'bg-slate-300',
                                    upcoming: 'bg-slate-200',
                                    no_data: 'bg-orange-400',
                                };
                                
                                return (
                                    <div className="space-y-1">
                                        {rows.map((row, ri) => (
                                            <div key={ri} className="grid grid-cols-7 gap-1">
                                                {row.map((day, ci) => {
                                                    if (!day) return <div key={`empty-${ci}`} className="min-h-[72px]" />;
                                                    const isClickable = !day.is_weekend && !day.is_future && day.status !== 'holiday';
                                                    return (
                                                        <div
                                                            key={day.date}
                                                            onClick={() => isClickable && handleAttendanceClick({ date: day.date, biometric_in: day.biometric_in, biometric_out: day.biometric_out })}
                                                            className={`min-h-[72px] p-1.5 rounded-lg border text-center transition-all ${isClickable ? 'cursor-pointer' : 'cursor-default'} ${cellColors[day.status] || 'border-slate-200'}`}
                                                            data-testid={`cal-${day.date}`}
                                                        >
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <span className={`text-xs font-bold ${day.is_weekend ? 'text-red-400' : ''}`}>{day.day}</span>
                                                                <span className={`w-2 h-2 rounded-full ${dotColors[day.status] || ''}`} />
                                                            </div>
                                                            {!day.is_weekend && !day.is_future && day.status !== 'holiday' && (
                                                                <div className="text-[9px] space-y-0.5">
                                                                    {day.biometric_in && <p className="font-mono text-foreground">{day.biometric_in?.slice(0,5)}</p>}
                                                                    {day.total_work_hours != null && <p className="text-muted-foreground">{day.total_work_hours}h</p>}
                                                                    {day.late_minutes > 0 && <p className="text-amber-600 font-medium">Late {day.late_minutes}m</p>}
                                                                    {!day.biometric_in && day.status === 'no_data' && <p className="text-orange-500">No punch</p>}
                                                                </div>
                                                            )}
                                                            {day.status === 'holiday' && <p className="text-[8px] text-purple-500 mt-1 truncate">{day.holiday_name}</p>}
                                                            {day.status === 'on_leave' && <p className="text-[8px] text-blue-500 mt-1">{day.leave_type?.replace(/_/g,' ')}</p>}
                                                            {day.status === 'weekend' && <p className="text-[8px] text-slate-400 mt-1">Off</p>}
                                                            {day.special_period && <p className="text-[7px] text-purple-400 truncate">{day.special_period}</p>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
                                {[
                                    { label: 'Present', color: 'bg-emerald-500' },
                                    { label: 'Late', color: 'bg-amber-500' },
                                    { label: 'Half Day', color: 'bg-amber-500' },
                                    { label: 'Absent', color: 'bg-red-500' },
                                    { label: 'On Leave', color: 'bg-blue-500' },
                                    { label: 'Holiday', color: 'bg-purple-500' },
                                    { label: 'No Record', color: 'bg-orange-400' },
                                    { label: 'Off Day', color: 'bg-slate-300' },
                                ].map(l => (
                                    <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                                        {l.label}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {/* Leaves Tab */}
                <TabsContent value="leaves" className="mt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Leave Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Limited leaves - show balance */}
                                    {essData?.leave_balance?.filter(l => !l.is_unlimited).map((leave) => (
                                        <div key={leave.leave_type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <p className="font-medium">{leave.leave_type_name}</p>
                                            <p className="text-xl font-bold text-primary">
                                                {leave.remaining_days} days
                                            </p>
                                        </div>
                                    ))}
                                    
                                    {/* Unlimited leaves - show taken this month */}
                                    {essData?.leave_balance?.filter(l => l.is_unlimited).length > 0 && (
                                        <div className="pt-3 border-t">
                                            <p className="text-sm text-muted-foreground mb-3">Taken This Month</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {essData?.leave_balance?.filter(l => l.is_unlimited).map((leave) => (
                                                    <div key={leave.leave_type} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                                        <span className="text-sm">{leave.leave_type_name}</span>
                                                        <Badge variant="secondary">{leave.taken_this_month || 0}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Leave Requests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px]">
                                    <div className="space-y-2">
                                        {essData?.request_history?.leave?.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                <p>No leave requests</p>
                                            </div>
                                        ) : (
                                            essData?.request_history?.leave?.map((req) => (
                                                <div key={req.id} className="p-3 bg-muted/50 rounded-lg">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium">{req.leave_type_name}</span>
                                                        {getStatusBadge(req.status)}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {req.start_date} to {req.end_date} ({req.total_days} days)
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                
                {/* Timesheet Tab */}
                <TabsContent value="timesheet" className="mt-4">
                    <div className="space-y-4">
                        {/* Assigned Tasks - Pick from manager assignments */}
                        {assignedTasks.filter(t => t.status !== 'completed').length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <ListTodo className="h-4 w-4" />
                                        Assigned Tasks
                                    </CardTitle>
                                    <CardDescription>Pick a task to log time against it</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {assignedTasks.filter(t => t.status !== 'completed').map(task => (
                                            <div key={task.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors" data-testid={`assigned-task-${task.id}`}>
                                                <div className="flex-1 min-w-0 mr-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium truncate">{task.title}</span>
                                                        <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                                                            {task.priority}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px] shrink-0">{task.category}</Badge>
                                                    </div>
                                                    {task.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <select
                                                        value={task.status}
                                                        onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                                        className="text-xs px-1.5 py-1 rounded border bg-background"
                                                    >
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="completed">Done</option>
                                                    </select>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePickTask(task)}>
                                                        <Plus className="h-3 w-3 mr-1" />Log
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Timesheet Entry */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Daily Timesheet
                                </CardTitle>
                                <CardDescription>Log tasks & hours. You can pick assigned tasks or add custom entries.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {timesheetTasks.map((task, i) => (
                                    <div key={i} className="p-3 border border-border/50 rounded-lg space-y-2 bg-muted/20" data-testid={`timesheet-entry-${i}`}>
                                        <div className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder={task.task_id ? task.task_title : "Task name / description"}
                                                    value={task.task_title || task.description || ''}
                                                    onChange={(e) => {
                                                        const updated = [...timesheetTasks];
                                                        if (updated[i].task_id) {
                                                            // Assigned task — title is locked
                                                        } else {
                                                            updated[i].description = e.target.value;
                                                            updated[i].task_title = e.target.value;
                                                        }
                                                        setTimesheetTasks(updated);
                                                    }}
                                                    readOnly={!!task.task_id}
                                                    className={`w-full px-3 py-2 rounded-md border bg-background text-sm ${task.task_id ? 'bg-muted/50 cursor-default' : ''}`}
                                                    data-testid={`timesheet-task-${i}`}
                                                />
                                            </div>
                                            <div className="w-20">
                                                <input
                                                    type="number"
                                                    placeholder="Hrs"
                                                    step="0.5"
                                                    min="0"
                                                    max="12"
                                                    value={task.hours || ''}
                                                    onChange={(e) => {
                                                        const updated = [...timesheetTasks];
                                                        updated[i].hours = parseFloat(e.target.value) || 0;
                                                        setTimesheetTasks(updated);
                                                    }}
                                                    className="w-full px-3 py-2 rounded-md border bg-background text-sm text-center"
                                                />
                                            </div>
                                            <div className="w-32">
                                                <select
                                                    value={task.category}
                                                    onChange={(e) => {
                                                        const updated = [...timesheetTasks];
                                                        updated[i].category = e.target.value;
                                                        setTimesheetTasks(updated);
                                                    }}
                                                    className="w-full px-2 py-2 rounded-md border bg-background text-sm"
                                                >
                                                    <option value="">Category</option>
                                                    {categories.map(c => (
                                                        <option key={c} value={c.toLowerCase().replace(/ /g, '_')}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {timesheetTasks.length > 1 && (
                                                <Button variant="ghost" size="sm" className="text-red-500 h-9"
                                                    onClick={() => setTimesheetTasks(timesheetTasks.filter((_, idx) => idx !== i))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <textarea
                                            placeholder="Notes — what specifically did you work on?"
                                            value={task.notes || ''}
                                            onChange={(e) => {
                                                const updated = [...timesheetTasks];
                                                updated[i].notes = e.target.value;
                                                setTimesheetTasks(updated);
                                            }}
                                            className="w-full px-3 py-1.5 rounded-md border bg-background text-xs min-h-[36px] resize-none"
                                            rows={1}
                                        />
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => setTimesheetTasks([...timesheetTasks, { task_id: '', task_title: '', description: '', hours: 0, category: '', notes: '' }])}>
                                    <Plus className="h-4 w-4 mr-1" />Add Custom Task
                                </Button>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Daily Summary</label>
                                    <textarea
                                        value={timesheetSummary}
                                        onChange={(e) => setTimesheetSummary(e.target.value)}
                                        placeholder="Brief summary of what you accomplished today..."
                                        className="w-full px-3 py-2 rounded-md border bg-background text-sm min-h-[50px]"
                                        data-testid="timesheet-summary"
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Total: <span className="font-bold">{timesheetTasks.reduce((s, t) => s + (t.hours || 0), 0).toFixed(1)} hours</span>
                                    </p>
                                    <Button onClick={handleSubmitTimesheet} data-testid="submit-timesheet-btn">
                                        <CheckCircle className="h-4 w-4 mr-2" />Submit Timesheet
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Timesheets */}
                        {timesheetHistory.length > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Recent Submissions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[200px]">
                                        <div className="space-y-2">
                                            {timesheetHistory.slice(0, 7).map(ts => (
                                                <div key={ts.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                                                    <div>
                                                        <p className="text-sm font-medium">{ts.date}</p>
                                                        <p className="text-xs text-muted-foreground">{ts.tasks?.length || 0} tasks</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold">{ts.total_logged_hours?.toFixed(1) || 0}h</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                {/* Requests Tab */}
                <TabsContent value="requests" className="mt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Leave Requests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[350px]">
                                    {essData?.request_history?.leave?.map((req) => (
                                        <div key={req.id} className="p-3 mb-2 bg-muted/50 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{req.leave_type_name}</span>
                                                {getStatusBadge(req.status)}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {req.start_date} - {req.end_date}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Reason: {req.reason?.substring(0, 50)}...
                                            </p>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Regularization Requests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[350px]">
                                    {essData?.request_history?.regularization?.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>No regularization requests</p>
                                        </div>
                                    ) : (
                                        essData?.request_history?.regularization?.map((req) => (
                                            <div key={req.id} className="p-3 mb-2 bg-muted/50 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{req.date}</span>
                                                    {getStatusBadge(req.status)}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {req.requested_check_in} - {req.requested_check_out}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {req.reason?.substring(0, 50)}...
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <LeaveApplicationModal
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                onSuccess={fetchESSData}
            />
            
            <AttendanceRegularizationModal
                isOpen={showRegModal}
                onClose={() => {
                    setShowRegModal(false);
                    setSelectedAttendance(null);
                }}
                onSuccess={fetchESSData}
                attendanceRecord={selectedAttendance}
            />
        </div>
    );
};

export default ESSSection;

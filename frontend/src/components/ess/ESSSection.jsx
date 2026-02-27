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

    const fetchESSData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/ess/dashboard');
            setEssData(res.data);
        } catch (error) {
            console.error('Failed to fetch ESS data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

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

    const getStatusBadge = (status) => {
        if (status === 'approved') return <Badge className="bg-emerald-500">Approved</Badge>;
        if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
        if (status?.startsWith('pending')) return <Badge variant="secondary">Pending</Badge>;
        return <Badge variant="outline">{status}</Badge>;
    };

    if (!essData?.employee) {
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
                                <p className="text-2xl font-bold">{essData?.attendance?.weekly_summary?.present || 0}</p>
                                <p className="text-xs text-muted-foreground">Days Present (Week)</p>
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
                                <p className="text-2xl font-bold">{essData?.attendance?.weekly_summary?.total_hours || 0}</p>
                                <p className="text-xs text-muted-foreground">Hours Worked (Week)</p>
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
                                    {essData?.leave_balance?.find(l => l.type === 'annual_leave')?.remaining || '--'}
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

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leaves">Leaves</TabsTrigger>
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
                
                {/* Attendance Tab */}
                <TabsContent value="attendance" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Attendance Records</CardTitle>
                            <CardDescription>Click on any date to request regularization</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-2">
                                    {essData?.attendance?.recent_records?.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>No attendance records found</p>
                                        </div>
                                    ) : (
                                        essData?.attendance?.recent_records?.map((record) => (
                                            <div
                                                key={record.id || record.date}
                                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                                onClick={() => handleAttendanceClick(record)}
                                                data-testid={`attendance-row-${record.date}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold">{record.date?.split('-')[2]}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(record.date).toLocaleDateString('en', { weekday: 'short' })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <span className="text-muted-foreground">In:</span>
                                                            <span className="font-mono">{record.biometric_in || '--:--'}</span>
                                                            <span className="text-muted-foreground ml-2">Out:</span>
                                                            <span className="font-mono">{record.biometric_out || '--:--'}</span>
                                                        </div>
                                                        {record.late_minutes > 0 && (
                                                            <p className="text-xs text-amber-500">Late by {record.late_minutes} mins</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                                                        {record.status || 'N/A'}
                                                    </Badge>
                                                    {record.regularized && (
                                                        <Badge variant="outline" className="text-xs">Regularized</Badge>
                                                    )}
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
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
                                    {essData?.leave_balance?.map((leave) => (
                                        <div key={leave.type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div>
                                                <p className="font-medium">{leave.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {leave.total === 'Unlimited' ? 'Unlimited' : `${leave.total} days/year`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold">
                                                    {leave.remaining === 'Unlimited' ? '∞' : leave.remaining}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Used: {leave.used}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
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

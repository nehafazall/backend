import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Users, UserCheck, UserX, Clock, Calendar, AlertTriangle,
    FileWarning, RefreshCw, TrendingUp, Building2, MapPin
} from 'lucide-react';

const HRDashboard = () => {
    const [dashboard, setDashboard] = useState(null);
    const [expiryAlerts, setExpiryAlerts] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const [dashRes, alertsRes] = await Promise.all([
                api.get('/hr/dashboard'),
                api.get('/hr/expiry-alerts')
            ]);
            setDashboard(dashRes.data);
            setExpiryAlerts(alertsRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !dashboard) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const { workforce, attendance, approvals, document_alerts, leave_summary, upcoming_confirmations } = dashboard;

    return (
        <div className="space-y-6" data-testid="hr-dashboard">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
                    <p className="text-muted-foreground">Real-time workforce insights and metrics</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDashboard}>
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
            </div>

            {/* Workforce Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{workforce.total_employees}</p>
                                <p className="text-sm text-muted-foreground">Total Employees</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                                <UserCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{workforce.active}</p>
                                <p className="text-sm text-muted-foreground">Active</p>
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
                                <p className="text-3xl font-bold">{workforce.probation}</p>
                                <p className="text-sm text-muted-foreground">On Probation</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{workforce.company_visa}</p>
                                <p className="text-sm text-muted-foreground">Company Visa</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attendance Today */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Today's Attendance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Present</span>
                            <Badge className="bg-green-500">{attendance.present_today}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Absent</span>
                            <Badge variant="destructive">{attendance.absent_today}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Late Logins</span>
                            <Badge variant="outline" className="text-amber-600">{attendance.late_today}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">On Leave</span>
                            <Badge variant="secondary">{attendance.on_leave_today}</Badge>
                        </div>
                        
                        <div className="pt-2">
                            <div className="flex justify-between text-sm mb-1">
                                <span>Attendance Rate</span>
                                <span>
                                    {workforce.total_employees > 0 
                                        ? Math.round((attendance.present_today / workforce.total_employees) * 100) 
                                        : 0}%
                                </span>
                            </div>
                            <Progress 
                                value={workforce.total_employees > 0 
                                    ? (attendance.present_today / workforce.total_employees) * 100 
                                    : 0} 
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Approvals */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Pending Approvals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                <span>Leave Requests</span>
                            </div>
                            <Badge className="bg-blue-500 text-white">{approvals.pending_leave_requests}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-amber-500" />
                                <span>Regularizations</span>
                            </div>
                            <Badge className="bg-amber-500 text-white">{approvals.pending_regularizations}</Badge>
                        </div>
                        <div className="pt-4 text-center">
                            <p className="text-2xl font-bold text-primary">
                                {approvals.pending_leave_requests + approvals.pending_regularizations}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Pending Actions</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Document Expiry Alerts */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Document Expiry Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                <span>Critical (30 days)</span>
                            </div>
                            <Badge variant="destructive">{document_alerts?.critical_30_days || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span>Warning (60 days)</span>
                            </div>
                            <Badge className="bg-amber-500">{document_alerts?.warning_60_days || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <span>Info (90 days)</span>
                            </div>
                            <Badge className="bg-blue-500">{document_alerts?.info_90_days || 0}</Badge>
                        </div>
                        <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground">
                                {document_alerts?.total_employees_with_alerts || 0} employees need attention
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department Breakdown */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Department Headcount</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(workforce.by_department || {}).map(([dept, count]) => (
                                <div key={dept} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span>{dept}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Progress 
                                            value={(count / workforce.total_employees) * 100} 
                                            className="w-20 h-2"
                                        />
                                        <span className="font-medium w-8 text-right">{count}</span>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(workforce.by_department || {}).length === 0 && (
                                <p className="text-muted-foreground text-center py-4">No department data</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Upcoming Confirmations */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Upcoming Confirmations</CardTitle>
                        <CardDescription>Probation ending in 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px]">
                            <div className="space-y-3">
                                {upcoming_confirmations?.map((emp) => (
                                    <div key={emp.employee_id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="font-medium">{emp.employee_name}</p>
                                            <p className="text-xs text-muted-foreground">{emp.employee_id}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={emp.days_remaining <= 7 ? 'destructive' : 'outline'}>
                                                {emp.days_remaining} days
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-1">{emp.confirmation_date}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!upcoming_confirmations || upcoming_confirmations.length === 0) && (
                                    <p className="text-muted-foreground text-center py-4">No upcoming confirmations</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Document Expiry Details */}
            {expiryAlerts && expiryAlerts.alerts.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileWarning className="h-5 w-5 text-red-500" />
                            Document Expiry Details
                        </CardTitle>
                        <CardDescription>Employees with documents expiring within 90 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-3">
                                {expiryAlerts.alerts.map((alert, idx) => (
                                    <div key={idx} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="font-medium">{alert.employee_name}</p>
                                                <p className="text-xs text-muted-foreground">{alert.employee_id} • {alert.department}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {alert.alerts.map((a, i) => (
                                                <Badge 
                                                    key={i}
                                                    variant={a.urgency === 'critical' ? 'destructive' : a.urgency === 'warning' ? 'outline' : 'secondary'}
                                                    className={a.urgency === 'warning' ? 'border-amber-500 text-amber-600' : ''}
                                                >
                                                    {a.document_type}: {a.days_remaining} days ({a.expiry_date})
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Gender Ratio & Leave Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Gender Ratio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center gap-8">
                            <div className="text-center">
                                <p className="text-4xl font-bold text-blue-500">{workforce.gender_ratio?.male || 0}</p>
                                <p className="text-sm text-muted-foreground">Male</p>
                            </div>
                            <div className="h-16 w-px bg-border" />
                            <div className="text-center">
                                <p className="text-4xl font-bold text-pink-500">{workforce.gender_ratio?.female || 0}</p>
                                <p className="text-sm text-muted-foreground">Female</p>
                            </div>
                            {workforce.gender_ratio?.other > 0 && (
                                <>
                                    <div className="h-16 w-px bg-border" />
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-purple-500">{workforce.gender_ratio.other}</p>
                                        <p className="text-sm text-muted-foreground">Other</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Leave Balance Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center gap-8">
                            <div className="text-center">
                                <p className="text-4xl font-bold text-green-500">{leave_summary?.total_annual_balance || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Annual Leave Days</p>
                            </div>
                            <div className="h-16 w-px bg-border" />
                            <div className="text-center">
                                <p className="text-4xl font-bold text-amber-500">{leave_summary?.total_sick_balance || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Sick Leave Days</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default HRDashboard;

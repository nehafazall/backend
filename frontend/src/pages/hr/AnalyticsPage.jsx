import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
    RefreshCw, Users, TrendingUp, TrendingDown, DollarSign, 
    Clock, Calendar, BarChart3, PieChart, Activity
} from 'lucide-react';

const AnalyticsPage = () => {
    const [overview, setOverview] = useState(null);
    const [attendanceAnalytics, setAttendanceAnalytics] = useState(null);
    const [leaveAnalytics, setLeaveAnalytics] = useState(null);
    const [payrollAnalytics, setPayrollAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [overviewRes, attendanceRes, leaveRes, payrollRes] = await Promise.all([
                api.get('/hr/analytics/overview'),
                api.get('/hr/analytics/attendance'),
                api.get(`/hr/analytics/leave?year=${selectedYear}`),
                api.get(`/hr/analytics/payroll?year=${selectedYear}`)
            ]);
            setOverview(overviewRes.data);
            setAttendanceAnalytics(attendanceRes.data);
            setLeaveAnalytics(leaveRes.data);
            setPayrollAnalytics(payrollRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(amount || 0);
    };

    const getTenurePercentage = (tenure) => {
        if (!overview?.tenure_distribution) return 0;
        const total = Object.values(overview.tenure_distribution).reduce((a, b) => a + b, 0);
        return total > 0 ? Math.round((tenure / total) * 100) : 0;
    };

    const getAgePercentage = (age) => {
        if (!overview?.age_distribution) return 0;
        const total = Object.values(overview.age_distribution).reduce((a, b) => a + b, 0);
        return total > 0 ? Math.round((age / total) * 100) : 0;
    };

    return (
        <div className="space-y-6" data-testid="analytics-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">HR Analytics</h1>
                    <p className="text-muted-foreground">Workforce insights and reporting</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2026">2026</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leave">Leave</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4">
                    {overview && (
                        <>
                            {/* Attrition Card */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <TrendingDown className="h-5 w-5 text-red-500" />
                                            Attrition
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-4xl font-bold">{overview.attrition.attrition_rate}%</p>
                                                <p className="text-muted-foreground">Attrition Rate YTD</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-semibold text-red-500">{overview.attrition.resigned_ytd}</p>
                                                <p className="text-sm text-muted-foreground">Employees Left</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Department Costs */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-green-500" />
                                            Department Costs (Current Month)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {overview.department_costs && Object.entries(overview.department_costs).slice(0, 5).map(([dept, cost]) => (
                                                <div key={dept} className="flex items-center justify-between">
                                                    <span className="text-sm">{dept}</span>
                                                    <span className="font-medium">{formatCurrency(cost)}</span>
                                                </div>
                                            ))}
                                            {(!overview.department_costs || Object.keys(overview.department_costs).length === 0) && (
                                                <p className="text-muted-foreground text-sm">No payroll data for current month</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Tenure & Age Distribution */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-blue-500" />
                                            Tenure Distribution
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {overview.tenure_distribution && Object.entries(overview.tenure_distribution).map(([range, count]) => (
                                            <div key={range} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>{range}</span>
                                                    <span className="font-medium">{count} ({getTenurePercentage(count)}%)</span>
                                                </div>
                                                <Progress value={getTenurePercentage(count)} className="h-2" />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-purple-500" />
                                            Age Distribution
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {overview.age_distribution && Object.entries(overview.age_distribution).map(([range, count]) => (
                                            <div key={range} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>{range}</span>
                                                    <span className="font-medium">{count} ({getAgePercentage(count)}%)</span>
                                                </div>
                                                <Progress value={getAgePercentage(count)} className="h-2" />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Headcount Trend */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-green-500" />
                                        Headcount Trend (Last 12 Months)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-2 h-40">
                                        {overview.headcount_trends && overview.headcount_trends.map((item, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                <div 
                                                    className="w-full bg-blue-500 rounded-t transition-all"
                                                    style={{ height: `${Math.max((item.count / Math.max(...overview.headcount_trends.map(h => h.count || 1))) * 100, 5)}%` }}
                                                />
                                                <span className="text-xs text-muted-foreground rotate-45 origin-left">
                                                    {item.month?.slice(5)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* ATTENDANCE TAB */}
                <TabsContent value="attendance" className="space-y-4">
                    {attendanceAnalytics && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-4xl font-bold text-green-600">{attendanceAnalytics.summary.attendance_rate}%</p>
                                            <p className="text-muted-foreground">Attendance Rate</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-4xl font-bold text-blue-600">{attendanceAnalytics.summary.punctuality_rate}%</p>
                                            <p className="text-muted-foreground">Punctuality Rate</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-4xl font-bold text-amber-600">{attendanceAnalytics.late_minutes.total}</p>
                                            <p className="text-muted-foreground">Total Late Minutes</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-4xl font-bold">{attendanceAnalytics.avg_work_hours}</p>
                                            <p className="text-muted-foreground">Avg Work Hours</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Attendance by Day of Week</CardTitle>
                                    <CardDescription>Period: {attendanceAnalytics.period.start} to {attendanceAnalytics.period.end}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-7 gap-4">
                                        {attendanceAnalytics.by_day_of_week && Object.entries(attendanceAnalytics.by_day_of_week).map(([day, stats]) => (
                                            <div key={day} className="text-center p-4 bg-muted rounded-lg">
                                                <p className="font-medium text-sm mb-2">{day.slice(0, 3)}</p>
                                                <p className="text-green-600 text-lg font-bold">{stats.present}</p>
                                                <p className="text-xs text-muted-foreground">Present</p>
                                                <p className="text-amber-600 text-sm">{stats.late}</p>
                                                <p className="text-xs text-muted-foreground">Late</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* LEAVE TAB */}
                <TabsContent value="leave" className="space-y-4">
                    {leaveAnalytics && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Leave by Type</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {leaveAnalytics.by_type && Object.entries(leaveAnalytics.by_type).map(([type, data]) => (
                                            <div key={type} className="flex items-center justify-between">
                                                <span className="capitalize">{type} Leave</span>
                                                <div className="text-right">
                                                    <span className="font-medium">{data.count} requests</span>
                                                    <span className="text-muted-foreground text-sm ml-2">({data.total_days} days)</span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!leaveAnalytics.by_type || Object.keys(leaveAnalytics.by_type).length === 0) && (
                                            <p className="text-muted-foreground">No leave data for this year</p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Leave by Status</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {leaveAnalytics.by_status && Object.entries(leaveAnalytics.by_status).map(([status, count]) => (
                                            <div key={status} className="flex items-center justify-between">
                                                <span className="capitalize">{status}</span>
                                                <span className="font-medium">{count}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Leave by Department</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {leaveAnalytics.by_department && Object.entries(leaveAnalytics.by_department).map(([dept, data]) => (
                                            <div key={dept} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                                <span>{dept}</span>
                                                <div className="text-right">
                                                    <span className="font-medium">{data.count} requests</span>
                                                    <span className="text-muted-foreground text-sm ml-2">({data.total_days} days)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* PAYROLL TAB */}
                <TabsContent value="payroll" className="space-y-4">
                    {payrollAnalytics && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Monthly Payroll Trend - {selectedYear}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {payrollAnalytics.monthly_trend && payrollAnalytics.monthly_trend.length > 0 ? (
                                        <div className="space-y-4">
                                            {payrollAnalytics.monthly_trend.map((item) => (
                                                <div key={item.month} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                                                    <span className="w-20 font-medium">{item.month}</span>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-sm text-muted-foreground">{item.employee_count} employees</span>
                                                            <span className="font-medium">{formatCurrency(item.total_net)}</span>
                                                        </div>
                                                        <Progress value={(item.total_net / (payrollAnalytics.monthly_trend[0]?.total_net || 1)) * 100} className="h-2" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-8">No payroll data for this year</p>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Payroll by Department</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {payrollAnalytics.by_department && Object.entries(payrollAnalytics.by_department).map(([dept, data]) => (
                                            <div key={dept} className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{dept}</p>
                                                    <p className="text-xs text-muted-foreground">{data.employee_count} employees</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(data.total_net)}</p>
                                                    <p className="text-xs text-muted-foreground">Avg: {formatCurrency(data.avg_salary)}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!payrollAnalytics.by_department || Object.keys(payrollAnalytics.by_department).length === 0) && (
                                            <p className="text-muted-foreground">No payroll data</p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Deduction Breakdown</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                            <span>Late Penalties</span>
                                            <span className="font-medium text-amber-600">{formatCurrency(payrollAnalytics.deduction_breakdown?.late_penalties)}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <span>Absence Deductions</span>
                                            <span className="font-medium text-red-600">{formatCurrency(payrollAnalytics.deduction_breakdown?.absence_deductions)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AnalyticsPage;

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { RefreshCw } from 'lucide-react';
import { AttritionCard, DeptCostsCard, TenureCard, AgeCard, HeadcountTrendCard } from '@/components/hr/AnalyticsWidgets';

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
        return new Intl.NumberFormat('en-AE', { 
            style: 'currency', 
            currency: 'AED', 
            maximumFractionDigits: 0 
        }).format(amount || 0);
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

                <TabsContent value="overview" className="space-y-4">
                    {overview && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AttritionCard data={overview.attrition} />
                                <DeptCostsCard costs={overview.department_costs} formatCurrency={formatCurrency} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TenureCard data={overview.tenure_distribution} />
                                <AgeCard data={overview.age_distribution} />
                            </div>
                            <HeadcountTrendCard trends={overview.headcount_trends} />
                        </>
                    )}
                </TabsContent>

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
                                    <CardDescription>
                                        Period: {attendanceAnalytics.period.start} to {attendanceAnalytics.period.end}
                                    </CardDescription>
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
                                                        <Progress 
                                                            value={(item.total_net / (payrollAnalytics.monthly_trend[0]?.total_net || 1)) * 100} 
                                                            className="h-2" 
                                                        />
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
                                            <span className="font-medium text-amber-600">
                                                {formatCurrency(payrollAnalytics.deduction_breakdown?.late_penalties)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <span>Absence Deductions</span>
                                            <span className="font-medium text-red-600">
                                                {formatCurrency(payrollAnalytics.deduction_breakdown?.absence_deductions)}
                                            </span>
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

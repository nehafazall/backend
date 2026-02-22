import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';

const StatCard = ({ value, label, color }) => (
    <Card>
        <CardContent className="pt-6">
            <div className="text-center">
                <p className={`text-4xl font-bold ${color}`}>{value}</p>
                <p className="text-muted-foreground">{label}</p>
            </div>
        </CardContent>
    </Card>
);

const DataRow = ({ label, value, subValue }) => (
    <div className="flex items-center justify-between">
        <span>{label}</span>
        <div className="text-right">
            <span className="font-medium">{value}</span>
            {subValue && <span className="text-muted-foreground text-sm ml-2">{subValue}</span>}
        </div>
    </div>
);

const AnalyticsPage = () => {
    const [overview, setOverview] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [leave, setLeave] = useState(null);
    const [payroll, setPayroll] = useState(null);
    const [year, setYear] = useState(2026);

    const fetchData = async () => {
        const [o, a, l, p] = await Promise.all([
            api.get('/hr/analytics/overview').catch(() => ({ data: null })),
            api.get('/hr/analytics/attendance').catch(() => ({ data: null })),
            api.get(`/hr/analytics/leave?year=${year}`).catch(() => ({ data: null })),
            api.get(`/hr/analytics/payroll?year=${year}`).catch(() => ({ data: null }))
        ]);
        setOverview(o.data);
        setAttendance(a.data);
        setLeave(l.data);
        setPayroll(p.data);
    };

    useEffect(() => { fetchData(); }, [year]);

    const fmt = (n) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(n || 0);

    return (
        <div className="space-y-6" data-testid="analytics-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">HR Analytics</h1>
                    <p className="text-muted-foreground">Workforce insights</p>
                </div>
                <div className="flex gap-2">
                    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2026">2026</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leave">Leave</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                    {overview && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard value={`${overview.attrition?.attrition_rate || 0}%`} label="Attrition Rate" color="text-red-600" />
                            <StatCard value={overview.attrition?.resigned_ytd || 0} label="Resigned YTD" color="text-amber-600" />
                            <StatCard value={Object.values(overview.tenure_distribution || {}).reduce((a,b) => a+b, 0)} label="Total Employees" color="text-blue-600" />
                            <StatCard value={Object.keys(overview.department_costs || {}).length} label="Departments" color="text-green-600" />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="attendance" className="mt-4 space-y-4">
                    {attendance && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard value={`${attendance.summary?.attendance_rate || 0}%`} label="Attendance Rate" color="text-green-600" />
                            <StatCard value={`${attendance.summary?.punctuality_rate || 0}%`} label="Punctuality" color="text-blue-600" />
                            <StatCard value={attendance.late_minutes?.total || 0} label="Late Minutes" color="text-amber-600" />
                            <StatCard value={attendance.avg_work_hours || 0} label="Avg Hours" color="text-slate-600" />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="leave" className="mt-4 space-y-4">
                    {leave && (
                        <Card>
                            <CardHeader><CardTitle>Leave by Type</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {Object.entries(leave.by_type || {}).map(([t, d]) => (
                                    <DataRow key={t} label={`${t} Leave`} value={`${d.count} requests`} subValue={`(${d.total_days} days)`} />
                                ))}
                                {Object.keys(leave.by_type || {}).length === 0 && (
                                    <p className="text-muted-foreground">No leave data</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="payroll" className="mt-4 space-y-4">
                    {payroll && (
                        <Card>
                            <CardHeader><CardTitle>Payroll by Department</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {Object.entries(payroll.by_department || {}).map(([d, v]) => (
                                    <DataRow key={d} label={d} value={fmt(v.total_net)} subValue={`${v.employee_count} emp`} />
                                ))}
                                {Object.keys(payroll.by_department || {}).length === 0 && (
                                    <p className="text-muted-foreground">No payroll data</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AnalyticsPage;

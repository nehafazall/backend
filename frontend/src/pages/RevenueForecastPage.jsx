import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, Legend,
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Users, Target, Activity, Loader2,
} from 'lucide-react';

const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

function MetricCard({ title, value, subtitle, icon: Icon, trend, colorClass }) {
    return (
        <Card data-testid={`forecast-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
                        <p className="text-xl font-bold mt-1 font-mono">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                    </div>
                    <div className={`p-2 rounded-xl ${colorClass || 'bg-primary/10 text-primary'}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {trend >= 0 ? '+' : ''}{trend}%
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function RevenueForecastPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchForecast();
    }, []);

    const fetchForecast = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/forecasting/revenue');
            setData(res.data);
        } catch { toast.error('Failed to load forecast data'); }
        setLoading(false);
    };

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center py-20" data-testid="forecast-loading">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const { historical, forecast, metrics, pipeline } = data;

    // Combine historical + forecast for the chart
    const chartData = [
        ...historical.map(h => ({ ...h, type: 'actual' })),
        ...forecast.map(f => ({ month: f.month, total: f.projected_total, type: 'forecast', confidence: f.confidence })),
    ];

    // Stacked revenue breakdown
    const stackedData = historical.map(h => ({
        month: h.month,
        Enrollments: h.enrollments,
        Upgrades: h.upgrades,
        Redeposits: h.redeposits,
    }));

    return (
        <div className="space-y-6" data-testid="revenue-forecast-page">
            <div>
                <h1 className="text-2xl font-bold">Revenue Forecasting</h1>
                <p className="text-muted-foreground text-sm">Historical trends, pipeline analysis, and projected revenue</p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard title="Avg Monthly" value={fmtAED(metrics.avg_monthly_revenue)} icon={DollarSign}
                    colorClass="bg-emerald-500/10 text-emerald-500" />
                <MetricCard title="Recent 3M Avg" value={fmtAED(metrics.recent_3m_avg)} icon={TrendingUp}
                    trend={metrics.growth_rate} colorClass="bg-sky-500/10 text-sky-500" />
                <MetricCard title="Conversion Rate" value={`${metrics.conversion_rate}%`} icon={Target}
                    colorClass="bg-violet-500/10 text-violet-500" />
                <MetricCard title="Pipeline Leads" value={metrics.total_pipeline_leads} icon={Users}
                    subtitle={fmtAED(metrics.total_pipeline_value)} colorClass="bg-amber-500/10 text-amber-500" />
                <MetricCard title="Growth Trend" value={`${metrics.growth_rate >= 0 ? '+' : ''}${metrics.growth_rate}%`}
                    icon={Activity} trend={metrics.growth_rate} colorClass="bg-lime-500/10 text-lime-500" />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Revenue Trend + Forecast */}
                <Card data-testid="forecast-trend-chart">
                    <CardHeader>
                        <CardTitle className="text-base">Revenue Trend &amp; Forecast</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip formatter={(v) => fmtAED(v)} />
                                <Area type="monotone" dataKey="total" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15}
                                    strokeWidth={2} strokeDasharray={(d) => d?.type === 'forecast' ? '5 5' : '0'} />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
                            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-sky-500 inline-block" /> Actual</span>
                            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-sky-500 inline-block border-dashed border-t-2 border-sky-500" /> Forecast</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Breakdown */}
                <Card data-testid="forecast-breakdown-chart">
                    <CardHeader>
                        <CardTitle className="text-base">Revenue Breakdown by Source</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={stackedData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip formatter={(v) => fmtAED(v)} />
                                <Legend />
                                <Bar dataKey="Enrollments" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Upgrades" stackId="a" fill="#8b5cf6" />
                                <Bar dataKey="Redeposits" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Forecast Table + Pipeline */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Forecast Projections */}
                <Card data-testid="forecast-projections">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-sky-500" /> Projected Revenue (Next 3 Months)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">Projected</TableHead>
                                    <TableHead className="text-right">Confidence</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {forecast.map((f, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{f.month}</TableCell>
                                        <TableCell className="text-right font-mono">{fmtAED(f.projected_total)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className={f.confidence >= 50 ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'}>
                                                {f.confidence}%
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pipeline Analysis */}
                <Card data-testid="forecast-pipeline">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4 text-violet-500" /> Sales Pipeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pipeline.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">No pipeline data</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Stage</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pipeline.map((p, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium capitalize">{(p._id || '').replace(/_/g, ' ')}</TableCell>
                                            <TableCell className="text-right">{p.count}</TableCell>
                                            <TableCell className="text-right font-mono">{fmtAED(p.potential_value)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Historical Table */}
            <Card data-testid="forecast-historical">
                <CardHeader>
                    <CardTitle className="text-base">Monthly Revenue History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead className="text-right">Enrollments</TableHead>
                                <TableHead className="text-right">Upgrades</TableHead>
                                <TableHead className="text-right">Redeposits</TableHead>
                                <TableHead className="text-right font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historical.map((h, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{h.month}</TableCell>
                                    <TableCell className="text-right font-mono">{fmtAED(h.enrollments)}</TableCell>
                                    <TableCell className="text-right font-mono">{fmtAED(h.upgrades)}</TableCell>
                                    <TableCell className="text-right font-mono">{fmtAED(h.redeposits)}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{fmtAED(h.total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

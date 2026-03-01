import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, DollarSign, Target, XCircle, CheckCircle2, ArrowRight } from 'lucide-react';

const STAGE_COLORS = {
    warm_lead: '#EAB308',      // Yellow
    hot_lead: '#F97316',       // Orange
    in_progress: '#06B6D4',    // Cyan
    enrolled: '#10B981',       // Green
    rejected: '#EF4444',       // Red
};

const STAGE_ICONS = {
    warm_lead: '🌡️',
    hot_lead: '🔥',
    in_progress: '⏳',
    enrolled: '✅',
    rejected: '❌',
};

export function PipelineRevenueWidget({ viewAs }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = viewAs ? { view_as: viewAs } : {};
            const res = await apiClient.get('/dashboard/pipeline-revenue', { params });
            setData(res.data);
        } catch (error) {
            console.error('Failed to fetch pipeline revenue:', error);
        } finally {
            setLoading(false);
        }
    }, [viewAs]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Pipeline Revenue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    const { stages, summary } = data;
    const maxValue = Math.max(...stages.map(s => s.total_value), 1);

    return (
        <Card data-testid="pipeline-revenue-widget">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Pipeline Revenue
                </CardTitle>
                <CardDescription>Track potential revenue at each stage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Active Pipeline</p>
                        <p className="text-xl font-bold text-primary">
                            AED {summary.active_pipeline_value?.toLocaleString() || 0}
                        </p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Won (Enrolled)</p>
                        <p className="text-xl font-bold text-green-500">
                            AED {summary.enrolled_value?.toLocaleString() || 0}
                        </p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Lost (Rejected)</p>
                        <p className="text-xl font-bold text-red-500">
                            AED {summary.rejected_value?.toLocaleString() || 0}
                        </p>
                    </div>
                </div>

                {/* Pipeline Funnel Visualization */}
                <div className="space-y-3">
                    {stages.filter(s => s.stage !== 'rejected').map((stage, index) => {
                        const widthPercent = maxValue > 0 ? Math.max(20, (stage.total_value / maxValue) * 100) : 20;
                        
                        return (
                            <div key={stage.stage} className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2">
                                        <span>{STAGE_ICONS[stage.stage]}</span>
                                        <span className="font-medium">{stage.stage_label}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {stage.count} leads
                                        </Badge>
                                    </span>
                                    <span className="font-bold" style={{ color: STAGE_COLORS[stage.stage] }}>
                                        AED {stage.total_value?.toLocaleString() || 0}
                                    </span>
                                </div>
                                <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                                    <div
                                        className="absolute top-0 left-0 h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                                        style={{
                                            width: `${widthPercent}%`,
                                            backgroundColor: STAGE_COLORS[stage.stage],
                                        }}
                                    >
                                        {stage.course_breakdown.length > 0 && (
                                            <span className="text-xs text-white font-medium truncate">
                                                {stage.course_breakdown[0]?.course_name}
                                                {stage.course_breakdown.length > 1 && ` +${stage.course_breakdown.length - 1}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Course breakdown */}
                                {stage.course_breakdown.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pl-6">
                                        {stage.course_breakdown.slice(0, 3).map((course) => (
                                            <Badge 
                                                key={course.course_id} 
                                                variant="outline" 
                                                className="text-xs"
                                            >
                                                {course.course_name}: {course.count} ({course.value?.toLocaleString()})
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                {index < stages.filter(s => s.stage !== 'rejected').length - 1 && (
                                    <div className="flex justify-center py-1">
                                        <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Rejected Section */}
                {stages.find(s => s.stage === 'rejected')?.count > 0 && (
                    <div className="pt-4 border-t">
                        <div className="flex justify-between items-center text-sm text-red-500">
                            <span className="flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                <span>Rejected</span>
                                <Badge variant="destructive" className="text-xs">
                                    {stages.find(s => s.stage === 'rejected')?.count || 0} leads
                                </Badge>
                            </span>
                            <span className="font-bold">
                                AED {stages.find(s => s.stage === 'rejected')?.total_value?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default PipelineRevenueWidget;

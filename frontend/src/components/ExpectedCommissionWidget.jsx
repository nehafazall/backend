import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
    DollarSign, 
    TrendingUp, 
    Wallet, 
    Target,
    CheckCircle2,
    Clock,
    ArrowRight,
    Flame,
    Zap
} from 'lucide-react';

const STAGE_CONFIG = {
    warm_lead: { icon: '🌡️', color: '#EAB308', bg: 'bg-yellow-500/10' },
    hot_lead: { icon: '🔥', color: '#F97316', bg: 'bg-orange-500/10' },
    in_progress: { icon: '⏳', color: '#06B6D4', bg: 'bg-cyan-500/10' },
};

export function ExpectedCommissionWidget({ viewAs }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = viewAs ? { view_as: viewAs } : {};
            const res = await api.get('/dashboard/expected-commission', { params });
            setData(res.data);
        } catch (error) {
            console.error('Failed to fetch expected commission:', error);
        } finally {
            setLoading(false);
        }
    }, [viewAs]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Expected Commission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    const { summary, stage_breakdown, pipeline_leads } = data;
    const totalReceivable = summary.expected_commission + summary.earned_this_month;

    return (
        <Card data-testid="expected-commission-widget">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-500" />
                    Expected Commission
                </CardTitle>
                <CardDescription>
                    Commission projections for {data.month}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-emerald-600" />
                            <p className="text-xs text-muted-foreground">Expected (Pipeline)</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">
                            {formatCurrency(summary.expected_commission)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            From {formatCurrency(summary.total_pipeline_value)} pipeline
                        </p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            <p className="text-xs text-muted-foreground">Earned This Month</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(summary.earned_this_month)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {summary.actual_pending > 0 ? `${formatCurrency(summary.actual_pending)} pending` : 'From closed deals'}
                        </p>
                    </div>
                </div>

                {/* Total Receivable Highlight */}
                <div className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Receivable</p>
                            <p className="text-3xl font-bold text-primary">
                                {formatCurrency(totalReceivable)}
                            </p>
                        </div>
                        <div className="p-3 rounded-full bg-primary/20">
                            <DollarSign className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    {summary.actual_paid > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Already paid: {formatCurrency(summary.actual_paid)}
                        </p>
                    )}
                </div>

                {/* Stage Breakdown */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Pipeline Breakdown</h4>
                    {stage_breakdown.map((stage) => {
                        const config = STAGE_CONFIG[stage.stage] || {};
                        const maxCommission = Math.max(...stage_breakdown.map(s => s.expected_commission), 1);
                        const widthPercent = maxCommission > 0 
                            ? Math.max(10, (stage.expected_commission / maxCommission) * 100) 
                            : 10;

                        return (
                            <div key={stage.stage} className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2">
                                        <span>{config.icon}</span>
                                        <span className="font-medium">{stage.label}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {stage.count} leads
                                        </Badge>
                                    </span>
                                    <div className="text-right">
                                        <span className="font-bold" style={{ color: config.color }}>
                                            {formatCurrency(stage.expected_commission)}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                            ({formatCurrency(stage.pipeline_value)})
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${widthPercent}%`,
                                            backgroundColor: config.color,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Top Pipeline Leads */}
                {pipeline_leads && pipeline_leads.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Top Expected Deals</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {pipeline_leads.slice(0, 5).map((lead) => (
                                <div 
                                    key={lead.id}
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{lead.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {lead.course || 'No course'} • {lead.stage.replace('_', ' ')}
                                        </p>
                                    </div>
                                    <div className="text-right ml-2">
                                        <p className="font-bold text-emerald-600">
                                            {formatCurrency(lead.expected_commission)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatCurrency(lead.value)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default ExpectedCommissionWidget;

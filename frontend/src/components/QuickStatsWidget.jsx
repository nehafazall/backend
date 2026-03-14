import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Users, Phone, TrendingUp, Bell, Calendar,
    DollarSign, CheckCircle, AlertTriangle, GraduationCap, Clock
} from 'lucide-react';

const QuickStatsWidget = ({ className = '' }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/quick-stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching quick stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
                {[1, 2, 3, 4].map(i => (
                    <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></CardContent></Card>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const fmt = (v) => {
        if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
        return v;
    };

    const items = [];

    // Sales stats
    if (stats.active_pipeline !== undefined) items.push({ label: 'Active Pipeline', value: fmt(stats.active_pipeline), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' });
    if (stats.new_leads_today !== undefined) items.push({ label: 'New Leads Today', value: stats.new_leads_today, icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-500/10' });
    if (stats.enrolled_mtd !== undefined) items.push({ label: 'Enrolled MTD', value: stats.enrolled_mtd, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' });
    if (stats.sla_breaches !== undefined && stats.sla_breaches > 0) items.push({ label: 'SLA Alerts', value: stats.sla_breaches, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' });

    // CS stats
    if (stats.total_students !== undefined) items.push({ label: 'Total Students', value: fmt(stats.total_students), icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-500/10' });
    if (stats.pending_activation !== undefined && stats.pending_activation > 0) items.push({ label: 'Pending Activation', value: stats.pending_activation, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' });

    // Mentor stats
    if (stats.mentor_students !== undefined) items.push({ label: 'Mentor Students', value: fmt(stats.mentor_students), icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' });
    if (stats.upgrade_opportunities !== undefined && stats.upgrade_opportunities > 0) items.push({ label: 'Upgrade Opps', value: stats.upgrade_opportunities, icon: TrendingUp, color: 'text-cyan-500', bg: 'bg-cyan-500/10' });

    // Finance stats
    if (stats.mtd_revenue !== undefined && stats.mtd_revenue > 0) items.push({ label: 'Revenue MTD', value: `${(stats.mtd_revenue / 1000).toFixed(0)}k`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' });
    if (stats.pending_payments !== undefined && stats.pending_payments > 0) items.push({ label: 'Pending Payments', value: stats.pending_payments, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' });

    // Common
    if (stats.pending_followups > 0) items.push({ label: 'Follow-ups Due', value: stats.pending_followups, icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-500/10' });
    if (stats.unread_notifications > 0) items.push({ label: 'Notifications', value: stats.unread_notifications, icon: Bell, color: 'text-rose-500', bg: 'bg-rose-500/10' });

    const display = items.slice(0, 6);

    if (display.length === 0) return null;

    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`} data-testid="quick-stats-widget">
            {display.map((s, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow border-border/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${s.bg}`}>
                                <s.icon className={`h-5 w-5 ${s.color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                <p className="text-xl font-bold">{s.value}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default QuickStatsWidget;

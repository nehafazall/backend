import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Users, Phone, Target, TrendingUp, Bell, Calendar,
    DollarSign, CheckCircle, AlertCircle, Briefcase
} from 'lucide-react';
import { formatCurrency } from '@/components/finance/utils';

const QuickStatsWidget = ({ className = '' }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        // Refresh every 5 minutes
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
                    <Card key={i}>
                        <CardContent className="p-4">
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const statItems = [];

    // Sales stats
    if (stats.total_leads !== undefined) {
        statItems.push({
            label: 'Total Leads',
            value: stats.total_leads,
            icon: Users,
            color: 'text-blue-500',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30'
        });
    }
    if (stats.new_leads_today !== undefined) {
        statItems.push({
            label: 'New Today',
            value: stats.new_leads_today,
            icon: Phone,
            color: 'text-green-500',
            bgColor: 'bg-green-100 dark:bg-green-900/30'
        });
    }
    if (stats.hot_leads !== undefined) {
        statItems.push({
            label: 'Hot Leads',
            value: stats.hot_leads,
            icon: Target,
            color: 'text-red-500',
            bgColor: 'bg-red-100 dark:bg-red-900/30'
        });
    }
    if (stats.enrolled_this_month !== undefined) {
        statItems.push({
            label: 'Enrolled MTD',
            value: stats.enrolled_this_month,
            icon: CheckCircle,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
        });
    }

    // CS stats
    if (stats.total_students !== undefined) {
        statItems.push({
            label: 'Students',
            value: stats.total_students,
            icon: Users,
            color: 'text-indigo-500',
            bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
        });
    }
    if (stats.pending_activation !== undefined) {
        statItems.push({
            label: 'Pending Activation',
            value: stats.pending_activation,
            icon: AlertCircle,
            color: 'text-amber-500',
            bgColor: 'bg-amber-100 dark:bg-amber-900/30'
        });
    }

    // Mentor stats
    if (stats.mentor_students !== undefined) {
        statItems.push({
            label: 'My Students',
            value: stats.mentor_students,
            icon: Briefcase,
            color: 'text-purple-500',
            bgColor: 'bg-purple-100 dark:bg-purple-900/30'
        });
    }
    if (stats.upgrade_opportunities !== undefined) {
        statItems.push({
            label: 'Upgrade Opps',
            value: stats.upgrade_opportunities,
            icon: TrendingUp,
            color: 'text-cyan-500',
            bgColor: 'bg-cyan-100 dark:bg-cyan-900/30'
        });
    }

    // Finance stats
    if (stats.mtd_revenue !== undefined) {
        statItems.push({
            label: 'MTD Revenue',
            value: formatCurrency(stats.mtd_revenue),
            icon: DollarSign,
            color: 'text-green-500',
            bgColor: 'bg-green-100 dark:bg-green-900/30',
            isFormatted: true
        });
    }

    // Common stats
    if (stats.pending_followups !== undefined && stats.pending_followups > 0) {
        statItems.push({
            label: 'Follow-ups Due',
            value: stats.pending_followups,
            icon: Calendar,
            color: 'text-orange-500',
            bgColor: 'bg-orange-100 dark:bg-orange-900/30'
        });
    }
    if (stats.unread_notifications !== undefined && stats.unread_notifications > 0) {
        statItems.push({
            label: 'Notifications',
            value: stats.unread_notifications,
            icon: Bell,
            color: 'text-rose-500',
            bgColor: 'bg-rose-100 dark:bg-rose-900/30'
        });
    }

    // Show top 4-6 stats based on role
    const displayStats = statItems.slice(0, 6);

    return (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`} data-testid="quick-stats-widget">
            {displayStats.map((stat, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className="text-xl font-bold">{stat.value}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default QuickStatsWidget;

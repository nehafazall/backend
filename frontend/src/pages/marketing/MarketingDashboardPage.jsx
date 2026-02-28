import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Eye,
    MousePointer,
    Target,
    RefreshCw,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Settings,
    Download,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Simple sparkline component
function Sparkline({ data, color = '#3b82f6', height = 40 }) {
    if (!data || data.length < 2) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');
    
    return (
        <svg width="100" height={height} className="inline-block">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// Metric card component
function MetricCard({ title, value, prefix = '', suffix = '', icon: Icon, trend, color = 'text-primary', loading }) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        {loading ? (
                            <div className="h-8 w-24 bg-muted animate-pulse rounded mt-1" />
                        ) : (
                            <p className={`text-2xl font-bold ${color}`}>
                                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
                            </p>
                        )}
                    </div>
                    <div className={`p-3 rounded-lg bg-muted`}>
                        <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                </div>
                {trend !== undefined && !loading && (
                    <div className="flex items-center gap-1 mt-2">
                        {trend > 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : trend < 0 ? (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                        ) : (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`text-sm ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {Math.abs(trend)}%
                        </span>
                        <span className="text-xs text-muted-foreground">vs prev period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function MarketingDashboardPage() {
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [datePreset, setDatePreset] = useState('last_30d');

    useEffect(() => {
        fetchDashboard();
    }, [selectedAccount, datePreset]);

    const fetchDashboard = async () => {
        try {
            const params = new URLSearchParams({ date_preset: datePreset });
            if (selectedAccount !== 'all') {
                params.append('account_id', selectedAccount);
            }
            
            const response = await api.get(`/marketing/dashboard?${params.toString()}`);
            setDashboard(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            if (error.response?.status !== 403) {
                toast.error('Failed to load dashboard data');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDashboard();
    };

    const getStatusBadge = (status) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
                return <Badge className="bg-green-500">Active</Badge>;
            case 'PAUSED':
                return <Badge variant="secondary">Paused</Badge>;
            case 'ARCHIVED':
                return <Badge variant="outline">Archived</Badge>;
            default:
                return <Badge variant="outline">{status || 'Unknown'}</Badge>;
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value || 0);
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('en-US').format(value || 0);
    };

    const summary = dashboard?.summary || {};
    const campaigns = dashboard?.campaigns || [];
    const accounts = dashboard?.accounts || [];

    // Sort campaigns by spend
    const sortedCampaigns = useMemo(() => {
        return [...campaigns].sort((a, b) => (b.spend || 0) - (a.spend || 0));
    }, [campaigns]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="marketing-dashboard-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Marketing Analytics</h1>
                    <p className="text-muted-foreground">Track your Meta Ads performance</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="w-[200px]" data-testid="account-filter">
                            <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={datePreset} onValueChange={setDatePreset}>
                        <SelectTrigger className="w-[150px]" data-testid="date-filter">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="last_7d">Last 7 days</SelectItem>
                            <SelectItem value="last_14d">Last 14 days</SelectItem>
                            <SelectItem value="last_30d">Last 30 days</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button 
                        variant="outline" 
                        onClick={handleRefresh}
                        disabled={refreshing}
                        data-testid="refresh-dashboard-btn"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    
                    <Button 
                        variant="outline"
                        onClick={() => navigate('/marketing/settings')}
                        data-testid="settings-btn"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* No Accounts Warning */}
            {accounts.length === 0 && (
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-yellow-500/10">
                                <Target className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">No Meta Accounts Connected</h3>
                                <p className="text-sm text-muted-foreground">
                                    Connect your Meta Ads accounts to start tracking campaign performance.
                                </p>
                            </div>
                            <Button onClick={() => navigate('/marketing/settings')}>
                                Connect Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard
                    title="Total Spend"
                    value={summary.total_spend || 0}
                    prefix="$"
                    icon={DollarSign}
                    color="text-red-500"
                    loading={refreshing}
                />
                <MetricCard
                    title="Total Leads"
                    value={summary.total_leads || 0}
                    icon={Users}
                    color="text-green-500"
                    loading={refreshing}
                />
                <MetricCard
                    title="Cost Per Lead"
                    value={summary.cpl || 0}
                    prefix="$"
                    icon={Target}
                    color="text-blue-500"
                    loading={refreshing}
                />
                <MetricCard
                    title="Impressions"
                    value={summary.total_impressions || 0}
                    icon={Eye}
                    color="text-purple-500"
                    loading={refreshing}
                />
                <MetricCard
                    title="Clicks"
                    value={summary.total_clicks || 0}
                    icon={MousePointer}
                    color="text-orange-500"
                    loading={refreshing}
                />
                <MetricCard
                    title="CTR"
                    value={summary.ctr || 0}
                    suffix="%"
                    icon={TrendingUp}
                    color="text-cyan-500"
                    loading={refreshing}
                />
            </div>

            {/* Additional Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">CPM</p>
                                <p className="text-xl font-bold">{formatCurrency(summary.cpm)}</p>
                            </div>
                            <Badge variant="outline">per 1K</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">CPC</p>
                                <p className="text-xl font-bold">{formatCurrency(summary.cpc)}</p>
                            </div>
                            <Badge variant="outline">per click</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Reach</p>
                                <p className="text-xl font-bold">{formatNumber(summary.total_reach)}</p>
                            </div>
                            <Badge variant="outline">unique</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Frequency</p>
                                <p className="text-xl font-bold">{(summary.frequency || 0).toFixed(2)}x</p>
                            </div>
                            <Badge variant="outline">avg</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Campaigns Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Campaign Performance
                        </CardTitle>
                        <CardDescription>
                            {sortedCampaigns.length} campaign{sortedCampaigns.length !== 1 ? 's' : ''} found
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {sortedCampaigns.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No campaigns found</p>
                            <p className="text-sm">Sync your accounts to see campaign data</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Campaign</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Spend</TableHead>
                                        <TableHead className="text-right">Leads</TableHead>
                                        <TableHead className="text-right">CPL</TableHead>
                                        <TableHead className="text-right">Impressions</TableHead>
                                        <TableHead className="text-right">Clicks</TableHead>
                                        <TableHead className="text-right">CTR</TableHead>
                                        <TableHead className="text-right">CPM</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedCampaigns.map((campaign) => (
                                        <TableRow key={campaign.id} data-testid={`campaign-row-${campaign.id}`}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{campaign.name}</p>
                                                    <p className="text-xs text-muted-foreground">{campaign.objective || 'N/A'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(campaign.spend)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-medium text-green-500">{campaign.leads || 0}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(campaign.cpl)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(campaign.impressions)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(campaign.clicks)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(campaign.ctr || 0).toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(campaign.cpm)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* DB Leads Info */}
            {summary.db_leads > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <Download className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-medium">Leads in Database</p>
                                    <p className="text-sm text-muted-foreground">
                                        {summary.db_leads} leads received via webhook
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={() => navigate('/marketing/leads')}>
                                View Leads
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Calendar,
    Clock,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Briefcase,
    TrendingUp,
    CalendarDays,
    Timer,
    Coffee,
} from 'lucide-react';

// Leave Balance Widget
export const LeaveBalanceWidget = ({ leaveBalance, loading }) => {
    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Leave Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    // Separate limited and unlimited leaves
    const limitedLeaves = leaveBalance.filter(l => !l.is_unlimited);
    const unlimitedLeaves = leaveBalance.filter(l => l.is_unlimited);

    return (
        <Card data-testid="leave-balance-widget">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Leave Balance
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Limited leaves with balance display */}
                <div className="space-y-3">
                    {limitedLeaves.map((leave) => {
                        const total = leave.total_days || 0;
                        const remaining = leave.remaining_days || 0;
                        const percentage = total > 0 ? (remaining / total) * 100 : 0;
                        
                        return (
                            <div key={leave.leave_type} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>{leave.leave_type_name}</span>
                                    <span className="font-semibold text-primary">
                                        {remaining} days
                                    </span>
                                </div>
                                <Progress 
                                    value={percentage} 
                                    className="h-2"
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Unlimited leaves - show taken this month */}
                {unlimitedLeaves.length > 0 && (
                    <div className="pt-2 border-t space-y-2">
                        <p className="text-xs text-muted-foreground">This Month</p>
                        <div className="grid grid-cols-2 gap-3">
                            {unlimitedLeaves.map((leave) => (
                                <div 
                                    key={leave.leave_type} 
                                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                                >
                                    <span className="text-sm">{leave.leave_type_name}</span>
                                    <Badge variant="secondary">
                                        {leave.taken_this_month || 0}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Weekly Attendance Widget
export const WeeklyAttendanceWidget = ({ attendance, loading }) => {
    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        );
    }

    const summary = attendance?.weekly_summary || { present: 0, absent: 0, late: 0, total_hours: 0 };
    const today = attendance?.today;

    return (
        <Card data-testid="weekly-attendance-widget">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    This Week's Attendance
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Today's Status */}
                {today && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Today</span>
                            <Badge variant={today.status === 'present' ? 'default' : 'destructive'}>
                                {today.status || 'Not Marked'}
                            </Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>In: {today.biometric_in || '--:--'}</span>
                            <span>Out: {today.biometric_out || '--:--'}</span>
                            {today.worked_hours > 0 && (
                                <span>{today.worked_hours.toFixed(1)} hrs</span>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Weekly Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <div className="text-xl font-bold text-emerald-600">{summary.present}</div>
                        <div className="text-xs text-muted-foreground">Present</div>
                    </div>
                    <div className="p-2 rounded-lg bg-red-500/10">
                        <div className="text-xl font-bold text-red-600">{summary.absent}</div>
                        <div className="text-xs text-muted-foreground">Absent</div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10">
                        <div className="text-xl font-bold text-amber-600">{summary.late}</div>
                        <div className="text-xs text-muted-foreground">Late</div>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <div className="text-xl font-bold text-blue-600">{summary.total_hours}</div>
                        <div className="text-xs text-muted-foreground">Hours</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Pending Requests Widget
export const PendingRequestsWidget = ({ pendingRequests, loading, onViewAll }) => {
    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Pending Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
        );
    }

    const { leave = 0, regularization = 0 } = pendingRequests || {};
    const total = leave + regularization;

    return (
        <Card data-testid="pending-requests-widget">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    My Pending Requests
                </CardTitle>
            </CardHeader>
            <CardContent>
                {total === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                        <p className="text-sm">No pending requests</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {leave > 0 && (
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm">Leave Requests</span>
                                </div>
                                <Badge variant="secondary">{leave} pending</Badge>
                            </div>
                        )}
                        {regularization > 0 && (
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm">Regularization</span>
                                </div>
                                <Badge variant="secondary">{regularization} pending</Badge>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Assets Widget
export const AssetsWidget = ({ assets, loading }) => {
    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">My Assets</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card data-testid="assets-widget">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    My Assets
                </CardTitle>
            </CardHeader>
            <CardContent>
                {assets?.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No assets assigned</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assets?.slice(0, 5).map((asset) => (
                            <div key={asset.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium">{asset.name}</p>
                                    <p className="text-xs text-muted-foreground">{asset.asset_type}</p>
                                </div>
                                <Badge variant="outline">{asset.asset_id}</Badge>
                            </div>
                        ))}
                        {assets?.length > 5 && (
                            <p className="text-xs text-center text-muted-foreground">
                                +{assets.length - 5} more
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Request History Widget
export const RequestHistoryWidget = ({ history, loading }) => {
    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Recent Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        );
    }

    const allRequests = [
        ...(history?.leave || []).map(r => ({ ...r, type: 'leave' })),
        ...(history?.regularization || []).map(r => ({ ...r, type: 'regularization' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

    const getStatusBadge = (status) => {
        if (status === 'approved') return <Badge className="bg-emerald-500">Approved</Badge>;
        if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
        return <Badge variant="secondary">Pending</Badge>;
    };

    return (
        <Card data-testid="request-history-widget">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Recent Requests
                </CardTitle>
            </CardHeader>
            <CardContent>
                {allRequests.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recent requests</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {allRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium">
                                        {req.type === 'leave' ? req.leave_type_name : 'Attendance Regularization'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {req.type === 'leave' 
                                            ? `${req.start_date} - ${req.end_date}`
                                            : req.date
                                        }
                                    </p>
                                </div>
                                {getStatusBadge(req.status)}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default {
    LeaveBalanceWidget,
    WeeklyAttendanceWidget,
    PendingRequestsWidget,
    AssetsWidget,
    RequestHistoryWidget
};

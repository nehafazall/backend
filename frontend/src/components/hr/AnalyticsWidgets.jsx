import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingDown, DollarSign, Clock, Users, TrendingUp } from 'lucide-react';

export const AttritionCard = ({ data }) => (
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
                    <p className="text-4xl font-bold">{data?.attrition_rate || 0}%</p>
                    <p className="text-muted-foreground">Attrition Rate YTD</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-semibold text-red-500">{data?.resigned_ytd || 0}</p>
                    <p className="text-sm text-muted-foreground">Employees Left</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

export const DeptCostsCard = ({ costs, formatCurrency }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Department Costs (Current Month)
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                {costs && Object.entries(costs).slice(0, 5).map(([dept, cost]) => (
                    <div key={dept} className="flex items-center justify-between">
                        <span className="text-sm">{dept}</span>
                        <span className="font-medium">{formatCurrency(cost)}</span>
                    </div>
                ))}
                {(!costs || Object.keys(costs).length === 0) && (
                    <p className="text-muted-foreground text-sm">No payroll data for current month</p>
                )}
            </div>
        </CardContent>
    </Card>
);

export const TenureCard = ({ data }) => {
    const getPercentage = (value) => {
        if (!data) return 0;
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        return total > 0 ? Math.round((value / total) * 100) : 0;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Tenure Distribution
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {data && Object.entries(data).map(([range, count]) => (
                    <div key={range} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>{range}</span>
                            <span className="font-medium">{count} ({getPercentage(count)}%)</span>
                        </div>
                        <Progress value={getPercentage(count)} className="h-2" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export const AgeCard = ({ data }) => {
    const getPercentage = (value) => {
        if (!data) return 0;
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        return total > 0 ? Math.round((value / total) * 100) : 0;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Age Distribution
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {data && Object.entries(data).map(([range, count]) => (
                    <div key={range} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>{range}</span>
                            <span className="font-medium">{count} ({getPercentage(count)}%)</span>
                        </div>
                        <Progress value={getPercentage(count)} className="h-2" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export const HeadcountTrendCard = ({ trends }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Headcount Trend (Last 12 Months)
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-end gap-2 h-40">
                {trends && trends.map((item, i) => {
                    const maxCount = Math.max(...trends.map(h => h.count || 1));
                    const height = Math.max((item.count / maxCount) * 100, 5);
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div 
                                className="w-full bg-blue-500 rounded-t transition-all"
                                style={{ height: `${height}%` }}
                            />
                            <span className="text-xs text-muted-foreground rotate-45 origin-left">
                                {item.month?.slice(5)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </CardContent>
    </Card>
);

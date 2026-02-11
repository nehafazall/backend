import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Wallet, Banknote, CreditCard, DollarSign, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { formatCurrency } from './utils';

// Balance Card Component
export const BalanceCard = ({ account }) => {
    const getIcon = () => {
        switch (account.subtype) {
            case 'Bank': return <Building2 className="h-5 w-5" />;
            case 'Wallet': return <Wallet className="h-5 w-5" />;
            case 'Cash': return <Banknote className="h-5 w-5" />;
            case 'Receivable': return <CreditCard className="h-5 w-5" />;
            default: return <DollarSign className="h-5 w-5" />;
        }
    };

    const isPositive = account.balance >= 0;

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {getIcon()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{account.name}</p>
                            <p className="text-xs text-muted-foreground">{account.code}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(account.balance, account.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">{account.currency}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// KPI Card Component
export const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    };

    return (
        <Card>
            <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${colors[color]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    {trend && (
                        <Badge variant={trend > 0 ? 'default' : 'destructive'} className="text-xs">
                            {trend > 0 ? '+' : ''}{trend}%
                        </Badge>
                    )}
                </div>
                <div className="mt-3">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                </div>
            </CardContent>
        </Card>
    );
};

// Alert Card Component
export const AlertCard = ({ alert }) => {
    const severityColors = {
        high: 'border-red-500 bg-red-50 dark:bg-red-900/20',
        medium: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
        low: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    };

    const severityIcons = {
        high: <AlertTriangle className="h-4 w-4 text-red-500" />,
        medium: <AlertCircle className="h-4 w-4 text-amber-500" />,
        low: <Clock className="h-4 w-4 text-blue-500" />,
    };

    return (
        <div className={`p-3 rounded-lg border-l-4 ${severityColors[alert.severity]}`}>
            <div className="flex items-start gap-2">
                {severityIcons[alert.severity]}
                <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    {alert.amount && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Amount: {formatCurrency(alert.amount)}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Building2, CreditCard, Wallet, BarChart3, Calendar } from 'lucide-react';
import { BalanceCard, KPICard, AlertCard } from './FinanceCards';
import { formatCurrency } from './utils';

export const DashboardContent = ({ data }) => {
    if (!data) return null;
    
    const banksAndWallets = data.account_balances?.banks_and_wallets || [];
    const receivables = data.account_balances?.receivables || [];
    const alerts = data.alerts || [];
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <KPICard 
                    title="Total Cash Position" 
                    value={formatCurrency(data.account_balances?.total_cash_position || 0)} 
                    icon={Wallet} 
                    color="green" 
                />
                <KPICard 
                    title="Pending Receivables" 
                    value={formatCurrency(data.account_balances?.total_pending_receivables || 0)} 
                    icon={CreditCard} 
                    color="amber" 
                />
                <KPICard 
                    title="Today's Revenue" 
                    value={formatCurrency(data.kpis?.today?.revenue || 0)} 
                    icon={TrendingUp} 
                    color="blue" 
                />
                <KPICard 
                    title="MTD Revenue" 
                    value={formatCurrency(data.kpis?.mtd?.gross_revenue || 0)} 
                    icon={BarChart3} 
                    color="purple" 
                />
                <KPICard 
                    title="MTD Provider Fees" 
                    value={formatCurrency(data.kpis?.mtd?.provider_fees || 0)} 
                    icon={TrendingDown} 
                    color="red" 
                />
                <KPICard 
                    title="7-Day Forecast" 
                    value={formatCurrency(data.settlements?.next_7_days_forecast || 0)} 
                    subtitle={`${data.settlements?.upcoming_count || 0} settlements`} 
                    icon={Calendar} 
                    color="blue" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <BanksCard accounts={banksAndWallets} />
                <AlertsCard alerts={alerts} />
            </div>

            <ReceivablesCard accounts={receivables} />
        </div>
    );
};

const BanksCard = ({ accounts }) => (
    <Card className="lg:col-span-2">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Where Money Lies
            </CardTitle>
            <CardDescription>Live account balances</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map((account) => (
                    <BalanceCard key={account.id} account={account} />
                ))}
            </div>
        </CardContent>
    </Card>
);

const AlertsCard = ({ alerts }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alerts
            </CardTitle>
            <CardDescription>{alerts.length} active alerts</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                    {alerts.length > 0 ? (
                        alerts.map((alert, i) => <AlertCard key={i} alert={alert} />)
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            No active alerts
                        </div>
                    )}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
);

const ReceivablesCard = ({ accounts }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Provider Receivables
            </CardTitle>
            <CardDescription>Pending settlements from payment providers</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {accounts.map((account) => (
                    <BalanceCard key={account.id} account={account} />
                ))}
            </div>
        </CardContent>
    </Card>
);

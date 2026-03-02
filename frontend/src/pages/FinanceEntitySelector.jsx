import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Wallet, PieChart, PiggyBank, Database, Settings } from 'lucide-react';

const FinanceEntitySelector = () => {
    const navigate = useNavigate();

    const entities = [
        {
            id: 'clt',
            name: 'CLT Academy',
            description: 'Payables, Receivables & CLT Financials',
            icon: Building2,
            status: 'active',
            route: '/finance/clt/dashboard',
            color: 'bg-red-500/10 text-red-500'
        },
        {
            id: 'treasury',
            name: 'Treasury',
            description: 'Account Balances & Cash Flow',
            icon: Wallet,
            status: 'active',
            route: '/finance/treasury/dashboard',
            color: 'bg-emerald-500/10 text-emerald-500'
        },
        {
            id: 'budgeting',
            name: 'Budgeting',
            description: 'Budget Planning & Tracking',
            icon: PiggyBank,
            status: 'active',
            route: '/finance/budgeting/sheet',
            color: 'bg-purple-500/10 text-purple-500'
        },
        {
            id: 'pnl',
            name: 'Overall PNL',
            description: 'Consolidated Financial Overview',
            icon: PieChart,
            status: 'active',
            route: '/finance/pnl/dashboard',
            color: 'bg-amber-500/10 text-amber-500'
        },
        {
            id: 'data',
            name: 'Data Management',
            description: 'Import & Export Financial Data',
            icon: Database,
            status: 'active',
            route: '/finance/data/management',
            color: 'bg-slate-500/10 text-slate-500'
        },
        {
            id: 'settings',
            name: 'Finance Settings',
            description: 'Chart of Accounts, Cost Centers, Payment Gateways',
            icon: TrendingUp,
            status: 'active',
            route: '/finance/settings/chart-of-accounts',
            color: 'bg-gray-500/10 text-gray-500'
        }
    ];

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center" data-testid="finance-entity-selector">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight mb-3">CLT Finance Suite</h1>
                <p className="text-lg text-muted-foreground">Select a module to manage</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl px-4">
                {entities.map((entity) => {
                    const Icon = entity.icon;
                    const isActive = entity.status === 'active';

                    return (
                        <Card
                            key={entity.id}
                            className={`relative cursor-pointer transition-all duration-300 hover:shadow-xl ${
                                isActive 
                                    ? 'hover:scale-105 hover:border-primary' 
                                    : 'opacity-70 cursor-not-allowed'
                            }`}
                            onClick={() => isActive && navigate(entity.route)}
                            data-testid={`entity-${entity.id}`}
                        >
                            <CardContent className="p-6 flex flex-col items-center text-center">
                                <div className={`p-5 rounded-2xl mb-4 ${entity.color || 'bg-primary/10 text-primary'}`}>
                                    <Icon className="h-12 w-12" />
                                </div>
                                <h2 className="text-xl font-bold mb-2">{entity.name}</h2>
                                <p className="text-sm text-muted-foreground">{entity.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default FinanceEntitySelector;

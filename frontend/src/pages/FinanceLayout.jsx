import React from 'react';
import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';
import { 
    LayoutDashboard, FileText, CreditCard, Receipt, ArrowRightLeft, 
    Building2, Calculator, Coins, ChevronLeft, FileSpreadsheet,
    PlusCircle, MinusCircle, Target, Wallet, PiggyBank, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Navigation items defined outside component
const NavItem = ({ path, label, icon: Icon, entity }) => (
    <NavLink
        to={`/finance/${entity}/${path}`}
        className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`
        }
        data-testid={`nav-${path}`}
    >
        <Icon className="h-4 w-4" />
        {label}
    </NavLink>
);

// Entity-specific navigation configurations
const entityNavConfig = {
    clt: {
        title: 'CLT Academy',
        subtitle: 'Financial Management',
        color: 'text-red-500',
        sections: [
            {
                title: 'Overview',
                items: [
                    { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
                ]
            },
            {
                title: 'Transactions',
                items: [
                    { path: 'payables', label: 'Payables', icon: ArrowRightLeft },
                    { path: 'receivables', label: 'Receivables', icon: Receipt },
                    { path: 'verifications', label: 'Payment Verifications', icon: FileSpreadsheet },
                    { path: 'pending-settlements', label: 'Pending Settlements', icon: Wallet }
                ]
            },
            {
                title: 'Accounting',
                items: [
                    { path: 'journal', label: 'Journal Entries', icon: FileText },
                    { path: 'settlements', label: 'Settlements', icon: CreditCard },
                    { path: 'expenses', label: 'Expenses', icon: Receipt },
                    { path: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
                    { path: 'accounts', label: 'Chart of Accounts', icon: Building2 },
                    { path: 'reconciliation', label: 'Bank Reconciliation', icon: FileSpreadsheet }
                ]
            },
            {
                title: 'Commissions',
                items: [
                    { path: 'commission-engine', label: 'Commission Engine', icon: Calculator },
                    { path: 'commission-settlements', label: 'Commission Settlements', icon: Coins }
                ]
            }
        ]
    },
    miles: {
        title: 'Miles Capitals',
        subtitle: 'Investment Management',
        color: 'text-blue-500',
        sections: [
            {
                title: 'Overview',
                items: [
                    { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
                ]
            },
            {
                title: 'Capital Flow',
                items: [
                    { path: 'deposits', label: 'Deposits', icon: PlusCircle },
                    { path: 'withdrawals', label: 'Withdrawals', icon: MinusCircle }
                ]
            },
            {
                title: 'Operations',
                items: [
                    { path: 'expense', label: 'Expenses', icon: Receipt },
                    { path: 'profit', label: 'Operating Profit', icon: Target }
                ]
            }
        ]
    },
    treasury: {
        title: 'Treasury',
        subtitle: 'Cash Management',
        color: 'text-emerald-500',
        sections: [
            {
                title: 'Overview',
                items: [
                    { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
                ]
            },
            {
                title: 'Accounts',
                items: [
                    { path: 'balances', label: 'Opening Balances', icon: Wallet },
                    { path: 'settlements', label: 'Pending Settlements', icon: CreditCard }
                ]
            }
        ]
    },
    budgeting: {
        title: 'Budgeting',
        subtitle: 'Budget Management',
        color: 'text-purple-500',
        sections: [
            {
                title: 'Budget',
                items: [
                    { path: 'sheet', label: 'Budget Sheet', icon: FileText },
                    { path: 'dashboard', label: 'Budget Dashboard', icon: BarChart3 }
                ]
            }
        ]
    },
    pnl: {
        title: 'Overall PNL',
        subtitle: 'Financial Overview',
        color: 'text-amber-500',
        sections: [
            {
                title: 'Reports',
                items: [
                    { path: 'dashboard', label: 'PNL Dashboard', icon: LayoutDashboard }
                ]
            }
        ]
    },
    data: {
        title: 'Data Management',
        subtitle: 'Import & Export',
        color: 'text-slate-500',
        sections: [
            {
                title: 'Data',
                items: [
                    { path: 'management', label: 'Data Management', icon: FileSpreadsheet }
                ]
            }
        ]
    }
};

const FinanceLayout = () => {
    const { entity } = useParams();

    const config = entityNavConfig[entity];
    
    if (!config) {
        return <Navigate to="/finance" replace />;
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]" data-testid="finance-layout">
            <aside className="w-64 border-r bg-muted/30 flex flex-col">
                <div className="p-4 border-b">
                    <NavLink to="/finance">
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back to Finance Suite
                        </Button>
                    </NavLink>
                    <div className="mt-3 px-2">
                        <h2 className={`font-bold text-lg ${config.color}`}>{config.title}</h2>
                        <p className="text-xs text-muted-foreground">{config.subtitle}</p>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <nav className="space-y-6">
                        {config.sections.map((section, idx) => (
                            <div key={idx}>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                                    {section.title}
                                </h3>
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <NavItem 
                                            key={item.path} 
                                            path={item.path} 
                                            label={item.label} 
                                            icon={item.icon} 
                                            entity={entity} 
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </ScrollArea>
            </aside>

            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default FinanceLayout;

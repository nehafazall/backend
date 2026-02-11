import React from 'react';
import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';
import { 
    LayoutDashboard, FileText, CreditCard, Receipt, ArrowRightLeft, 
    Building2, Calculator, Coins, ChevronLeft 
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

const FinanceLayout = () => {
    const { entity } = useParams();

    if (entity !== 'clt') {
        return <Navigate to="/finance" replace />;
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]" data-testid="finance-layout">
            <aside className="w-64 border-r bg-muted/30 flex flex-col">
                <div className="p-4 border-b">
                    <NavLink to="/finance">
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back to Entities
                        </Button>
                    </NavLink>
                    <div className="mt-3 px-2">
                        <h2 className="font-bold text-lg">CLT Academy</h2>
                        <p className="text-xs text-muted-foreground">Finance Module</p>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <nav className="space-y-6">
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                                Overview
                            </h3>
                            <div className="space-y-1">
                                <NavItem path="dashboard" label="Dashboard" icon={LayoutDashboard} entity={entity} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                                Accounting
                            </h3>
                            <div className="space-y-1">
                                <NavItem path="journal" label="Journal Entries" icon={FileText} entity={entity} />
                                <NavItem path="settlements" label="Settlements" icon={CreditCard} entity={entity} />
                                <NavItem path="expenses" label="Expenses" icon={Receipt} entity={entity} />
                                <NavItem path="transfers" label="Transfers" icon={ArrowRightLeft} entity={entity} />
                                <NavItem path="accounts" label="Chart of Accounts" icon={Building2} entity={entity} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                                Commissions
                            </h3>
                            <div className="space-y-1">
                                <NavItem path="commission-engine" label="Commission Engine" icon={Calculator} entity={entity} />
                                <NavItem path="commission-settlements" label="Commission Settlements" icon={Coins} entity={entity} />
                            </div>
                        </div>
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

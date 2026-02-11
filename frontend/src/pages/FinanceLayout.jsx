import React from 'react';
import { NavLink, Outlet, useParams, Navigate } from 'react-router-dom';
import { 
    LayoutDashboard, FileText, CreditCard, Receipt, ArrowRightLeft, 
    Building2, Calculator, Coins, ChevronLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navItems = [
    { 
        section: 'Overview',
        items: [
            { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
        ]
    },
    {
        section: 'Accounting',
        items: [
            { path: 'journal', label: 'Journal Entries', icon: FileText },
            { path: 'settlements', label: 'Settlements', icon: CreditCard },
            { path: 'expenses', label: 'Expenses', icon: Receipt },
            { path: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
            { path: 'accounts', label: 'Chart of Accounts', icon: Building2 }
        ]
    },
    {
        section: 'Commissions',
        items: [
            { path: 'commission-engine', label: 'Commission Engine', icon: Calculator },
            { path: 'commission-settlements', label: 'Commission Settlements', icon: Coins }
        ]
    }
];

const FinanceLayout = () => {
    const { entity } = useParams();

    // Redirect if not a valid entity
    if (entity !== 'clt') {
        return <Navigate to="/finance" replace />;
    }

    const entityName = entity === 'clt' ? 'CLT Academy' : 'MILES';

    return (
        <div className="flex h-[calc(100vh-4rem)]" data-testid="finance-layout">
            {/* Left Sidebar */}
            <aside className="w-64 border-r bg-muted/30 flex flex-col">
                <div className="p-4 border-b">
                    <NavLink to="/finance">
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back to Entities
                        </Button>
                    </NavLink>
                    <div className="mt-3 px-2">
                        <h2 className="font-bold text-lg">{entityName}</h2>
                        <p className="text-xs text-muted-foreground">Finance Module</p>
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <nav className="space-y-6">
                        {navItems.map((section) => (
                            <div key={section.section}>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                                    {section.section}
                                </h3>
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <NavLink
                                                key={item.path}
                                                to={`/finance/${entity}/${item.path}`}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                                        isActive
                                                            ? 'bg-primary text-primary-foreground font-medium'
                                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                    }`
                                                }
                                                data-testid={`nav-${item.path}`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.label}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </ScrollArea>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default FinanceLayout;

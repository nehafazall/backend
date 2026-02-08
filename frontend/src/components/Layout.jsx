import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useTheme, notificationApi } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import EnvironmentSwitcher from '@/components/EnvironmentSwitcher';
import {
    LayoutDashboard,
    Users,
    UserCircle,
    Phone,
    GraduationCap,
    DollarSign,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Bell,
    Moon,
    Sun,
    Menu,
    X,
    Building2,
    BookOpen,
    Calculator,
    TrendingUp,
    Headphones,
    Shield,
    Inbox,
    UserCheck,
    Briefcase,
    Lock,
} from 'lucide-react';

function SectionHeader({ title, icon: Icon, isOpen, onClick, isActive }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-4 py-2 text-xs font-semibold tracking-wider transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{title}</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
        </button>
    );
}

function NavItem({ title, icon: Icon, path, isActive, onClick, collapsed }) {
    if (collapsed) {
        return (
            <button onClick={onClick} className={`sidebar-item w-full justify-center ${isActive ? 'active' : ''}`} title={title}>
                <Icon className="h-5 w-5" />
            </button>
        );
    }
    return (
        <button onClick={onClick} className={`sidebar-item w-full pl-10 ${isActive ? 'active' : ''}`} data-testid={`nav-${title.toLowerCase().replace(/['\s]/g, '-')}`}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm">{title}</span>
        </button>
    );
}

function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [openSections, setOpenSections] = useState({
        sales: true, cs: true, academics: true, operations: true, security: true, finance: true
    });
    
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;
    const userRole = user?.role || '';

    useEffect(() => {
        async function fetchNotifications() {
            try {
                const response = await notificationApi.getAll();
                setNotifications(response.data);
                setUnreadCount(response.data.filter(n => !n.read).length);
            } catch (err) { /* ignore */ }
        }
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    function handleLogout() {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    }

    function goTo(path) {
        navigate(path);
        setMobileMenuOpen(false);
    }

    function toggleSection(id) {
        setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
    }

    function hasRole(roles) {
        return roles.includes(userRole);
    }

    function getRoleBadgeColor(r) {
        const map = { super_admin: 'bg-purple-500', admin: 'bg-blue-500', sales_manager: 'bg-green-500', team_leader: 'bg-cyan-500', sales_executive: 'bg-yellow-500', cs_head: 'bg-pink-500', cs_agent: 'bg-indigo-500', mentor: 'bg-orange-500', finance: 'bg-emerald-500', hr: 'bg-rose-500' };
        return map[r] || 'bg-slate-500';
    }

    const salesRoles = ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'];
    const csRoles = ['super_admin', 'admin', 'cs_head', 'cs_agent'];
    const academicRoles = ['super_admin', 'admin', 'mentor', 'academic_master'];
    const opsRoles = ['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance', 'hr', 'operations', 'team_leader', 'sales_executive', 'cs_agent', 'mentor', 'academic_master', 'marketing', 'quality_control'];
    const securityRoles = ['super_admin', 'admin', 'hr'];
    const financeRoles = ['super_admin', 'admin', 'finance'];

    return (
        <div className="min-h-screen bg-background">
            <button className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-16 flex items-center justify-center border-b border-slate-800 px-4">
                    {!sidebarCollapsed ? (
                        <img src="https://customer-assets.emergentagent.com/job_37b7a798-83f6-40f1-8986-24840490698e/artifacts/kld5ow33_2.svg" alt="CLT Academy" className="h-10 w-auto" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">C</div>
                    )}
                </div>

                <ScrollArea className="flex-1 py-4">
                    <nav>
                        {/* SALES */}
                        {hasRole(salesRoles) && (
                            <div className="mb-2">
                                {!sidebarCollapsed && <SectionHeader title="SALES" icon={Phone} isOpen={openSections.sales} onClick={() => toggleSection('sales')} isActive={currentPath.startsWith('/sales') || currentPath === '/followups'} />}
                                {(sidebarCollapsed || openSections.sales) && (
                                    <div className="mt-1 space-y-1">
                                        <NavItem title="Sales CRM" icon={Phone} path="/sales" isActive={currentPath === '/sales'} onClick={() => goTo('/sales')} collapsed={sidebarCollapsed} />
                                        <NavItem title="Sales Dashboard" icon={TrendingUp} path="/sales/dashboard" isActive={currentPath === '/sales/dashboard'} onClick={() => goTo('/sales/dashboard')} collapsed={sidebarCollapsed} />
                                        <NavItem title="Today's Follow-ups" icon={Bell} path="/followups" isActive={currentPath === '/followups'} onClick={() => goTo('/followups')} collapsed={sidebarCollapsed} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CUSTOMER SERVICE */}
                        {hasRole(csRoles) && (
                            <div className="mb-2">
                                {!sidebarCollapsed && <SectionHeader title="CUSTOMER SERVICE" icon={Headphones} isOpen={openSections.cs} onClick={() => toggleSection('cs')} isActive={currentPath.startsWith('/cs')} />}
                                {(sidebarCollapsed || openSections.cs) && (
                                    <div className="mt-1 space-y-1">
                                        <NavItem title="CS Dashboard" icon={Headphones} path="/cs/dashboard" isActive={currentPath === '/cs/dashboard'} onClick={() => goTo('/cs/dashboard')} collapsed={sidebarCollapsed} />
                                        <NavItem title="Customer Service" icon={Users} path="/cs" isActive={currentPath === '/cs'} onClick={() => goTo('/cs')} collapsed={sidebarCollapsed} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ACADEMICS */}
                        {hasRole(academicRoles) && (
                            <div className="mb-2">
                                {!sidebarCollapsed && <SectionHeader title="ACADEMICS" icon={GraduationCap} isOpen={openSections.academics} onClick={() => toggleSection('academics')} isActive={currentPath.startsWith('/mentor')} />}
                                {(sidebarCollapsed || openSections.academics) && (
                                    <div className="mt-1 space-y-1">
                                        <NavItem title="Mentor CRM" icon={GraduationCap} path="/mentor" isActive={currentPath === '/mentor'} onClick={() => goTo('/mentor')} collapsed={sidebarCollapsed} />
                                        <NavItem title="Mentor Dashboard" icon={TrendingUp} path="/mentor/dashboard" isActive={currentPath === '/mentor/dashboard'} onClick={() => goTo('/mentor/dashboard')} collapsed={sidebarCollapsed} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* OPERATIONS */}
                        {hasRole(opsRoles) && (
                            <div className="mb-2">
                                {!sidebarCollapsed && <SectionHeader title="OPERATIONS" icon={Briefcase} isOpen={openSections.operations} onClick={() => toggleSection('operations')} isActive={currentPath === '/dashboard' || currentPath.startsWith('/leads') || currentPath === '/customers' || currentPath === '/departments' || currentPath === '/courses'} />}
                                {(sidebarCollapsed || openSections.operations) && (
                                    <div className="mt-1 space-y-1">
                                        <NavItem title="Dashboard" icon={LayoutDashboard} path="/dashboard" isActive={currentPath === '/dashboard'} onClick={() => goTo('/dashboard')} collapsed={sidebarCollapsed} />
                                        {hasRole(['super_admin', 'admin', 'sales_manager', 'team_leader']) && <NavItem title="Leads Pool" icon={Inbox} path="/leads/pool" isActive={currentPath === '/leads/pool'} onClick={() => goTo('/leads/pool')} collapsed={sidebarCollapsed} />}
                                        {hasRole(['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance']) && <NavItem title="Customer Master" icon={UserCheck} path="/customers" isActive={currentPath === '/customers'} onClick={() => goTo('/customers')} collapsed={sidebarCollapsed} />}
                                        {hasRole(['super_admin', 'admin', 'hr']) && <NavItem title="Departments" icon={Building2} path="/departments" isActive={currentPath === '/departments'} onClick={() => goTo('/departments')} collapsed={sidebarCollapsed} />}
                                        {hasRole(['super_admin', 'admin']) && <NavItem title="Courses" icon={BookOpen} path="/courses" isActive={currentPath === '/courses'} onClick={() => goTo('/courses')} collapsed={sidebarCollapsed} />}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECURITY */}
                        {hasRole(securityRoles) && (
                            <div className="mb-2">
                                {!sidebarCollapsed && <SectionHeader title="SECURITY" icon={Lock} isOpen={openSections.security} onClick={() => toggleSection('security')} isActive={currentPath === '/access-control' || currentPath === '/users'} />}
                                {(sidebarCollapsed || openSections.security) && (
                                    <div className="mt-1 space-y-1">
                                        {hasRole(['super_admin']) && <NavItem title="Access Control" icon={Shield} path="/access-control" isActive={currentPath === '/access-control'} onClick={() => goTo('/access-control')} collapsed={sidebarCollapsed} />}
                                        <NavItem title="User Management" icon={UserCircle} path="/users" isActive={currentPath === '/users'} onClick={() => goTo('/users')} collapsed={sidebarCollapsed} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FINANCE */}
                        {hasRole(financeRoles) && (
                            <div className="mb-2">
                                {!sidebarCollapsed && <SectionHeader title="FINANCE" icon={DollarSign} isOpen={openSections.finance} onClick={() => toggleSection('finance')} isActive={currentPath === '/finance' || currentPath === '/commissions'} />}
                                {(sidebarCollapsed || openSections.finance) && (
                                    <div className="mt-1 space-y-1">
                                        <NavItem title="Finance" icon={DollarSign} path="/finance" isActive={currentPath === '/finance'} onClick={() => goTo('/finance')} collapsed={sidebarCollapsed} />
                                        <NavItem title="Commission Engine" icon={Calculator} path="/commissions" isActive={currentPath === '/commissions'} onClick={() => goTo('/commissions')} collapsed={sidebarCollapsed} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Settings */}
                        <div className="border-t border-slate-800 mt-4 pt-4 px-2">
                            <button onClick={() => goTo('/settings')} className={`sidebar-item w-full ${currentPath === '/settings' ? 'active' : ''}`}>
                                <Settings className="h-5 w-5 flex-shrink-0" />
                                {!sidebarCollapsed && <span className="truncate">Settings</span>}
                            </button>
                        </div>
                    </nav>
                </ScrollArea>

                <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors">
                    {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>

                <div className="border-t border-slate-800 p-4">
                    {!sidebarCollapsed ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">{user?.full_name?.charAt(0) || 'U'}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                                <Badge className={`${getRoleBadgeColor(userRole)} text-white text-xs mt-1`}>{userRole?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User'}</Badge>
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium mx-auto">{user?.full_name?.charAt(0) || 'U'}</div>
                    )}
                </div>
            </aside>

            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
                <header className="h-16 bg-card border-b border-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
                    <div className="lg:hidden w-8" />
                    <h1 className="text-lg font-semibold text-foreground hidden lg:block">CLT Academy ERP</h1>
                    <div className="flex items-center gap-2">
                        <EnvironmentSwitcher />
                        <Button variant="ghost" size="icon" onClick={toggleTheme}>{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative">
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-64">{notifications.length === 0 ? <div className="p-4 text-center text-muted-foreground text-sm">No notifications</div> : notifications.slice(0, 10).map(n => <DropdownMenuItem key={n.id} className={`flex flex-col items-start p-3 ${!n.read ? 'bg-muted/50' : ''}`}><span className="font-medium text-sm">{n.title}</span><span className="text-xs text-muted-foreground mt-1">{n.message}</span></DropdownMenuItem>)}</ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">{user?.full_name?.charAt(0) || 'U'}</div></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel><div><p className="font-medium">{user?.full_name}</p><p className="text-xs text-muted-foreground">{user?.email}</p></div></DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/settings')}><Settings className="h-4 w-4 mr-2" />Settings</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout} className="text-red-500"><LogOut className="h-4 w-4 mr-2" />Logout</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                <div className="p-4 lg:p-6"><Outlet /></div>
            </main>

            {mobileMenuOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileMenuOpen(false)} />}
        </div>
    );
}

export default Layout;

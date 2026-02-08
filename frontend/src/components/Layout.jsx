import React, { useState } from 'react';
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

const NAV_SECTIONS = [
    {
        id: 'sales',
        title: 'SALES',
        icon: Phone,
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'],
        items: [
            { title: 'Sales CRM', icon: Phone, path: '/sales', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'] },
            { title: 'Sales Dashboard', icon: TrendingUp, path: '/sales/dashboard', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'] },
            { title: "Today's Follow-ups", icon: Bell, path: '/followups', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'] },
        ],
    },
    {
        id: 'customer_service',
        title: 'CUSTOMER SERVICE',
        icon: Headphones,
        roles: ['super_admin', 'admin', 'cs_head', 'cs_agent'],
        items: [
            { title: 'CS Dashboard', icon: Headphones, path: '/cs/dashboard', roles: ['super_admin', 'admin', 'cs_head', 'cs_agent'] },
            { title: 'Customer Service', icon: Users, path: '/cs', roles: ['super_admin', 'admin', 'cs_head', 'cs_agent'] },
        ],
    },
    {
        id: 'academics',
        title: 'ACADEMICS',
        icon: GraduationCap,
        roles: ['super_admin', 'admin', 'mentor', 'academic_master'],
        items: [
            { title: 'Mentor CRM', icon: GraduationCap, path: '/mentor', roles: ['super_admin', 'admin', 'mentor', 'academic_master'] },
            { title: 'Mentor Dashboard', icon: TrendingUp, path: '/mentor/dashboard', roles: ['super_admin', 'admin', 'mentor', 'academic_master'] },
        ],
    },
    {
        id: 'operations',
        title: 'OPERATIONS',
        icon: Briefcase,
        roles: ['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance', 'hr', 'operations'],
        items: [
            { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive', 'cs_head', 'cs_agent', 'mentor', 'academic_master', 'finance', 'hr', 'marketing', 'operations', 'quality_control'] },
            { title: 'Leads Pool', icon: Inbox, path: '/leads/pool', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader'] },
            { title: 'Customer Master', icon: UserCheck, path: '/customers', roles: ['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance'] },
            { title: 'Departments', icon: Building2, path: '/departments', roles: ['super_admin', 'admin', 'hr'] },
            { title: 'Courses', icon: BookOpen, path: '/courses', roles: ['super_admin', 'admin'] },
        ],
    },
    {
        id: 'security',
        title: 'SECURITY',
        icon: Lock,
        roles: ['super_admin', 'admin', 'hr'],
        items: [
            { title: 'Access Control', icon: Shield, path: '/access-control', roles: ['super_admin'] },
            { title: 'User Management', icon: UserCircle, path: '/users', roles: ['super_admin', 'admin', 'hr'] },
        ],
    },
    {
        id: 'finance',
        title: 'FINANCE',
        icon: DollarSign,
        roles: ['super_admin', 'admin', 'finance'],
        items: [
            { title: 'Finance', icon: DollarSign, path: '/finance', roles: ['super_admin', 'admin', 'finance'] },
            { title: 'Commission Engine', icon: Calculator, path: '/commissions', roles: ['super_admin', 'admin', 'finance'] },
        ],
    },
];

function NavSection({ section, isCollapsed, userRole, currentPath, onNavigate }) {
    const [isOpen, setIsOpen] = useState(true);
    
    if (!section.roles.includes(userRole)) return null;
    
    const visibleItems = section.items.filter(function(item) {
        return item.roles.includes(userRole);
    });
    
    if (visibleItems.length === 0) return null;

    const SectionIcon = section.icon;
    
    let hasActiveItem = false;
    for (let i = 0; i < visibleItems.length; i++) {
        if (currentPath.startsWith(visibleItems[i].path)) {
            hasActiveItem = true;
            break;
        }
    }

    if (isCollapsed) {
        const collapsedItems = [];
        for (let i = 0; i < visibleItems.length; i++) {
            const item = visibleItems[i];
            const isActive = currentPath.startsWith(item.path);
            const ItemIcon = item.icon;
            collapsedItems.push(
                <button
                    key={item.path}
                    onClick={function() { onNavigate(item.path); }}
                    className={'sidebar-item w-full justify-center ' + (isActive ? 'active' : '')}
                    title={item.title}
                >
                    <ItemIcon className="h-5 w-5" />
                </button>
            );
        }
        return <div className="mb-2">{collapsedItems}</div>;
    }

    const expandedItems = [];
    for (let i = 0; i < visibleItems.length; i++) {
        const item = visibleItems[i];
        const isActive = currentPath.startsWith(item.path);
        const ItemIcon = item.icon;
        expandedItems.push(
            <button
                key={item.path}
                onClick={function() { onNavigate(item.path); }}
                className={'sidebar-item w-full pl-10 ' + (isActive ? 'active' : '')}
                data-testid={'nav-' + item.title.toLowerCase().replace(/\s/g, '-').replace(/'/g, '')}
            >
                <ItemIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate text-sm">{item.title}</span>
            </button>
        );
    }

    return (
        <div className="mb-2">
            <button
                onClick={function() { setIsOpen(!isOpen); }}
                className={'w-full flex items-center justify-between px-4 py-2 text-xs font-semibold tracking-wider transition-colors ' + (hasActiveItem ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200')}
            >
                <div className="flex items-center gap-2">
                    <SectionIcon className="h-4 w-4" />
                    <span>{section.title}</span>
                </div>
                <ChevronDown className={'h-4 w-4 transition-transform ' + (isOpen ? '' : '-rotate-90')} />
            </button>
            {isOpen && <div className="mt-1 space-y-1">{expandedItems}</div>}
        </div>
    );
}

function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    React.useEffect(function() {
        async function fetchNotifications() {
            try {
                const response = await notificationApi.getAll();
                setNotifications(response.data);
                const unread = response.data.filter(function(n) { return !n.read; });
                setUnreadCount(unread.length);
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        }
        
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return function() { clearInterval(interval); };
    }, []);

    function handleLogout() {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    }

    async function handleMarkAllRead() {
        try {
            await notificationApi.markAllRead();
            const updated = notifications.map(function(n) { return { ...n, read: true }; });
            setNotifications(updated);
            setUnreadCount(0);
        } catch (error) {
            toast.error('Failed to mark notifications as read');
        }
    }

    function handleNavigate(path) {
        navigate(path);
        setMobileMenuOpen(false);
    }

    function getRoleBadgeColor(role) {
        if (role === 'super_admin') return 'bg-purple-500';
        if (role === 'admin') return 'bg-blue-500';
        if (role === 'sales_manager') return 'bg-green-500';
        if (role === 'team_leader') return 'bg-cyan-500';
        if (role === 'sales_executive') return 'bg-yellow-500';
        if (role === 'cs_head') return 'bg-pink-500';
        if (role === 'cs_agent') return 'bg-indigo-500';
        if (role === 'mentor') return 'bg-orange-500';
        if (role === 'finance') return 'bg-emerald-500';
        if (role === 'hr') return 'bg-rose-500';
        return 'bg-slate-500';
    }

    function formatRole(role) {
        if (!role) return 'User';
        return role.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    }

    const navSectionElements = [];
    for (let i = 0; i < NAV_SECTIONS.length; i++) {
        navSectionElements.push(
            <NavSection
                key={NAV_SECTIONS[i].id}
                section={NAV_SECTIONS[i]}
                isCollapsed={sidebarCollapsed}
                userRole={user?.role}
                currentPath={location.pathname}
                onNavigate={handleNavigate}
            />
        );
    }

    const notificationItems = [];
    const notifSlice = notifications.slice(0, 10);
    for (let i = 0; i < notifSlice.length; i++) {
        const notif = notifSlice[i];
        notificationItems.push(
            <DropdownMenuItem 
                key={notif.id}
                className={'flex flex-col items-start p-3 cursor-pointer ' + (!notif.read ? 'bg-muted/50' : '')}
                onClick={function() { if (notif.link) navigate(notif.link); }}
            >
                <span className="font-medium text-sm">{notif.title}</span>
                <span className="text-xs text-muted-foreground mt-1">{notif.message}</span>
            </DropdownMenuItem>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white"
                onClick={function() { setMobileMenuOpen(!mobileMenuOpen); }}
                data-testid="mobile-menu-toggle"
            >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <aside 
                className={'sidebar ' + (sidebarCollapsed ? 'collapsed' : 'expanded') + ' ' + (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}
                data-testid="sidebar"
            >
                <div className="h-16 flex items-center justify-center border-b border-slate-800 px-4">
                    {!sidebarCollapsed ? (
                        <img 
                            src="https://customer-assets.emergentagent.com/job_37b7a798-83f6-40f1-8986-24840490698e/artifacts/kld5ow33_2.svg"
                            alt="CLT Academy"
                            className="h-10 w-auto"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">C</div>
                    )}
                </div>

                <ScrollArea className="flex-1 py-4">
                    <nav>
                        {navSectionElements}
                        <div className="border-t border-slate-800 mt-4 pt-4 px-2">
                            <button
                                onClick={function() { handleNavigate('/settings'); }}
                                className={'sidebar-item w-full ' + (location.pathname === '/settings' ? 'active' : '')}
                                data-testid="nav-settings"
                            >
                                <Settings className="h-5 w-5 flex-shrink-0" />
                                {!sidebarCollapsed && <span className="truncate">Settings</span>}
                            </button>
                        </div>
                    </nav>
                </ScrollArea>

                <button
                    onClick={function() { setSidebarCollapsed(!sidebarCollapsed); }}
                    className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                    data-testid="sidebar-toggle"
                >
                    {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>

                <div className="border-t border-slate-800 p-4">
                    {!sidebarCollapsed ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                {user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                                <Badge className={getRoleBadgeColor(user?.role) + ' text-white text-xs mt-1'}>
                                    {formatRole(user?.role)}
                                </Badge>
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium mx-auto">
                            {user?.full_name?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>
            </aside>

            <main className={'transition-all duration-300 ' + (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')}>
                <header className="h-16 bg-card border-b border-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
                    <div className="lg:hidden w-8" />
                    <h1 className="text-lg font-semibold text-foreground hidden lg:block">CLT Academy ERP</h1>

                    <div className="flex items-center gap-2">
                        <EnvironmentSwitcher />
                        
                        <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle">
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                                <DropdownMenuLabel className="flex items-center justify-between">
                                    <span>Notifications</span>
                                    {unreadCount > 0 && (
                                        <button onClick={handleMarkAllRead} className="text-xs text-blue-500 hover:underline">Mark all read</button>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-64">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground text-sm">No notifications</div>
                                    ) : notificationItems}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid="user-menu-btn">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                        {user?.full_name?.charAt(0) || 'U'}
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    <div>
                                        <p className="font-medium">{user?.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={function() { navigate('/settings'); }}>
                                    <Settings className="h-4 w-4 mr-2" />Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                                    <LogOut className="h-4 w-4 mr-2" />Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <div className="p-4 lg:p-6">
                    <Outlet />
                </div>
            </main>

            {mobileMenuOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={function() { setMobileMenuOpen(false); }}
                />
            )}
        </div>
    );
}

export default Layout;

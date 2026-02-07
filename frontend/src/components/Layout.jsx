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
    Bell,
} from 'lucide-react';

const menuItems = [
    {
        title: 'Dashboard',
        icon: LayoutDashboard,
        path: '/dashboard',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive', 'cs_head', 'cs_agent', 'mentor', 'academic_master', 'finance', 'hr', 'marketing', 'operations', 'quality_control'],
    },
    {
        title: "Today's Follow-ups",
        icon: Bell,
        path: '/followups',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive', 'cs_head', 'cs_agent', 'mentor', 'academic_master'],
    },
    {
        title: 'Sales CRM',
        icon: Phone,
        path: '/sales',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'],
    },
    {
        title: 'My Sales Dashboard',
        icon: TrendingUp,
        path: '/sales/dashboard',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'],
    },
    {
        title: 'Leads Pool',
        icon: Inbox,
        path: '/leads/pool',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader'],
    },
    {
        title: 'Customer Master',
        icon: UserCheck,
        path: '/customers',
        roles: ['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance'],
    },
    {
        title: 'Customer Service',
        icon: Users,
        path: '/cs',
        roles: ['super_admin', 'admin', 'cs_head', 'cs_agent'],
    },
    {
        title: 'CS Dashboard',
        icon: Headphones,
        path: '/cs/dashboard',
        roles: ['super_admin', 'admin', 'cs_head', 'cs_agent'],
    },
    {
        title: 'Mentor CRM',
        icon: GraduationCap,
        path: '/mentor',
        roles: ['super_admin', 'admin', 'mentor', 'academic_master'],
    },
    {
        title: 'Finance',
        icon: DollarSign,
        path: '/finance',
        roles: ['super_admin', 'admin', 'finance'],
    },
    {
        title: 'User Management',
        icon: UserCircle,
        path: '/users',
        roles: ['super_admin', 'admin', 'hr'],
    },
    {
        title: 'Departments',
        icon: Building2,
        path: '/departments',
        roles: ['super_admin', 'admin', 'hr'],
    },
    {
        title: 'Courses',
        icon: BookOpen,
        path: '/courses',
        roles: ['super_admin', 'admin'],
    },
    {
        title: 'Commission Engine',
        icon: Calculator,
        path: '/commissions',
        roles: ['super_admin', 'admin', 'finance'],
    },
    {
        title: 'Access Control',
        icon: Shield,
        path: '/access-control',
        roles: ['super_admin'],
    },
    {
        title: 'Settings',
        icon: Settings,
        path: '/settings',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive', 'cs_head', 'cs_agent', 'mentor', 'academic_master', 'finance', 'hr', 'marketing', 'operations', 'quality_control'],
    },
];

const Layout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch notifications
    React.useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await notificationApi.getAll();
                setNotifications(response.data);
                setUnreadCount(response.data.filter(n => !n.read).length);
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        };
        
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
        
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationApi.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            toast.error('Failed to mark notifications as read');
        }
    };

    const filteredMenuItems = menuItems.filter(item => 
        item.roles.includes(user?.role)
    );

    const getRoleBadgeColor = (role) => {
        const colors = {
            super_admin: 'bg-purple-500',
            admin: 'bg-blue-500',
            sales_manager: 'bg-green-500',
            team_leader: 'bg-cyan-500',
            sales_executive: 'bg-yellow-500',
            cs_head: 'bg-pink-500',
            cs_agent: 'bg-indigo-500',
            mentor: 'bg-orange-500',
            finance: 'bg-emerald-500',
            hr: 'bg-rose-500',
        };
        return colors[role] || 'bg-slate-500';
    };

    const formatRole = (role) => {
        return role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User';
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Menu Button */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-toggle"
            >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Sidebar */}
            <aside 
                className={`sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'} 
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
                data-testid="sidebar"
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-center border-b border-slate-800 px-4">
                    {!sidebarCollapsed ? (
                        <img 
                            src="https://customer-assets.emergentagent.com/job_37b7a798-83f6-40f1-8986-24840490698e/artifacts/kld5ow33_2.svg"
                            alt="CLT Academy"
                            className="h-10 w-auto"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                            C
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1 py-4">
                    <nav className="space-y-1">
                        {filteredMenuItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
                                    data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {!sidebarCollapsed && (
                                        <span className="truncate">{item.title}</span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </ScrollArea>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                    data-testid="sidebar-toggle"
                >
                    {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>

                {/* User Info */}
                <div className="border-t border-slate-800 p-4">
                    {!sidebarCollapsed ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                                {user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                                <Badge className={`${getRoleBadgeColor(user?.role)} text-white text-xs mt-1`}>
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

            {/* Main Content */}
            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
                {/* Top Bar */}
                <header className="h-16 bg-card border-b border-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
                    <div className="lg:hidden w-8" /> {/* Spacer for mobile */}
                    
                    <h1 className="text-lg font-semibold text-foreground hidden lg:block">
                        CLT Academy ERP
                    </h1>

                    <div className="flex items-center gap-2">
                        {/* Environment Switcher */}
                        <EnvironmentSwitcher />
                        
                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            data-testid="theme-toggle"
                        >
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>

                        {/* Notifications */}
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
                                        <button 
                                            onClick={handleMarkAllRead}
                                            className="text-xs text-blue-500 hover:underline"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-64">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground text-sm">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.slice(0, 10).map((notif) => (
                                            <DropdownMenuItem 
                                                key={notif.id}
                                                className={`flex flex-col items-start p-3 cursor-pointer ${!notif.read ? 'bg-muted/50' : ''}`}
                                                onClick={() => notif.link && navigate(notif.link)}
                                            >
                                                <span className="font-medium text-sm">{notif.title}</span>
                                                <span className="text-xs text-muted-foreground mt-1">{notif.message}</span>
                                            </DropdownMenuItem>
                                        ))
                                    )}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* User Menu */}
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
                                <DropdownMenuItem onClick={() => navigate('/settings')}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 lg:p-6">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default Layout;

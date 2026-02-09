import React, { useState, useEffect, useRef } from 'react';
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
    FileText,
    Key,
    Home,
} from 'lucide-react';
import CLTLogo from '@/components/CLTLogo';

const SECTIONS = {
    sales: {
        id: 'sales',
        title: 'Sales',
        icon: Phone,
        color: 'bg-blue-500',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'],
        items: [
            { title: 'Sales CRM', icon: Phone, path: '/sales' },
            { title: 'Sales Dashboard', icon: TrendingUp, path: '/sales/dashboard' },
            { title: "Today's Follow-ups", icon: Bell, path: '/followups' },
        ],
    },
    cs: {
        id: 'cs',
        title: 'Customer Service',
        icon: Headphones,
        color: 'bg-emerald-500',
        roles: ['super_admin', 'admin', 'cs_head', 'cs_agent'],
        items: [
            { title: 'CS Dashboard', icon: Headphones, path: '/cs/dashboard' },
            { title: 'Customer Service', icon: Users, path: '/cs' },
        ],
    },
    academics: {
        id: 'academics',
        title: 'Academics',
        icon: GraduationCap,
        color: 'bg-orange-500',
        roles: ['super_admin', 'admin', 'mentor', 'academic_master'],
        items: [
            { title: 'Mentor CRM', icon: GraduationCap, path: '/mentor' },
            { title: 'Mentor Dashboard', icon: TrendingUp, path: '/mentor/dashboard' },
        ],
    },
    operations: {
        id: 'operations',
        title: 'Operations',
        icon: Briefcase,
        color: 'bg-purple-500',
        roles: ['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance', 'hr', 'operations', 'team_leader', 'sales_executive', 'cs_agent', 'mentor', 'academic_master', 'marketing', 'quality_control'],
        items: [
            { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
            { title: 'QC Dashboard', icon: Headphones, path: '/qc-dashboard', roles: ['super_admin', 'admin', 'cs_head', 'sales_manager'] },
            { title: 'Leads Pool', icon: Inbox, path: '/leads/pool', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader'] },
            { title: 'Customer Master', icon: UserCheck, path: '/customers', roles: ['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance'] },
            { title: 'Departments', icon: Building2, path: '/departments', roles: ['super_admin', 'admin', 'hr'] },
            { title: 'Courses', icon: BookOpen, path: '/courses', roles: ['super_admin', 'admin'] },
        ],
    },
    security: {
        id: 'security',
        title: 'Security',
        icon: Lock,
        color: 'bg-red-500',
        roles: ['super_admin', 'admin', 'hr'],
        items: [
            { title: 'Access Control', icon: Shield, path: '/access-control', roles: ['super_admin'] },
            { title: 'Password Resets', icon: Key, path: '/password-resets', roles: ['super_admin'] },
            { title: 'Audit Log', icon: FileText, path: '/audit-log', roles: ['super_admin', 'admin'] },
            { title: 'User Management', icon: UserCircle, path: '/users' },
        ],
    },
    finance: {
        id: 'finance',
        title: 'Finance',
        icon: DollarSign,
        color: 'bg-cyan-500',
        roles: ['super_admin', 'admin', 'finance'],
        items: [
            { title: 'Finance', icon: DollarSign, path: '/finance' },
            { title: 'Commission Engine', icon: Calculator, path: '/commissions' },
        ],
    },
};

function SectionIcon({ section, onClick }) {
    const Icon = section.icon;
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 group"
            data-testid={`section-icon-${section.id}`}
        >
            <div className={`w-16 h-16 rounded-2xl ${section.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="h-8 w-8" />
            </div>
            <span className="font-medium text-sm">{section.title}</span>
        </button>
    );
}

function SidebarNavItem({ item, isActive, onClick }) {
    const Icon = item.icon;
    return (
        <button
            onClick={onClick}
            className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
            data-testid={`nav-${item.title.toLowerCase().replace(/['\s]/g, '-')}`}
        >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{item.title}</span>
        </button>
    );
}

function Layout() {
    const [activeSection, setActiveSection] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    
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

    useEffect(() => {
        if (currentPath === '/home' || currentPath === '/') {
            setActiveSection(null);
            return;
        }
        
        const sectionKeys = Object.keys(SECTIONS);
        for (let i = 0; i < sectionKeys.length; i++) {
            const key = sectionKeys[i];
            const section = SECTIONS[key];
            for (let j = 0; j < section.items.length; j++) {
                if (currentPath === section.items[j].path || currentPath.startsWith(section.items[j].path + '/')) {
                    setActiveSection(key);
                    return;
                }
            }
        }
    }, [currentPath]);

    function handleLogout() {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    }

    function goTo(path) {
        navigate(path);
        setMobileMenuOpen(false);
    }

    function goHome() {
        setActiveSection(null);
        navigate('/home');
    }

    function selectSection(sectionId) {
        setActiveSection(sectionId);
        const section = SECTIONS[sectionId];
        if (section && section.items.length > 0) {
            const firstItem = section.items.find(item => !item.roles || item.roles.includes(userRole));
            if (firstItem) {
                navigate(firstItem.path);
            }
        }
    }

    function hasRole(roles) {
        if (!roles) return true;
        return roles.includes(userRole);
    }

    function getRoleBadgeColor(r) {
        const map = { super_admin: 'bg-purple-500', admin: 'bg-blue-500', sales_manager: 'bg-green-500', team_leader: 'bg-cyan-500', sales_executive: 'bg-yellow-500', cs_head: 'bg-pink-500', cs_agent: 'bg-indigo-500', mentor: 'bg-orange-500', finance: 'bg-emerald-500', hr: 'bg-rose-500' };
        return map[r] || 'bg-slate-500';
    }

    const currentSection = activeSection ? SECTIONS[activeSection] : null;
    const isHomePage = !activeSection || currentPath === '/home';

    const visibleSections = [];
    const sectionKeys = Object.keys(SECTIONS);
    for (let i = 0; i < sectionKeys.length; i++) {
        const key = sectionKeys[i];
        const section = SECTIONS[key];
        if (section.roles.includes(userRole)) {
            visibleSections.push(section);
        }
    }

    const sidebarItems = [];
    if (currentSection) {
        for (let i = 0; i < currentSection.items.length; i++) {
            const item = currentSection.items[i];
            if (hasRole(item.roles)) {
                sidebarItems.push(item);
            }
        }
    }

    const notificationItems = [];
    const notifSlice = notifications.slice(0, 10);
    for (let i = 0; i < notifSlice.length; i++) {
        const n = notifSlice[i];
        notificationItems.push(
            <DropdownMenuItem key={n.id} className={`flex flex-col items-start p-3 ${!n.read ? 'bg-muted/50' : ''}`}>
                <span className="font-medium text-sm">{n.title}</span>
                <span className="text-xs text-muted-foreground mt-1">{n.message}</span>
            </DropdownMenuItem>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile menu toggle */}
            {!isHomePage && (
                <button className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            )}

            {/* Sidebar - only show when a section is selected */}
            {!isHomePage && currentSection && (
                <aside className={`sidebar expanded ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                    <div className="h-24 flex items-center justify-center border-b border-slate-800 px-4">
                        <CLTLogo className="h-24 w-auto" isDark={true} />
                    </div>

                    <ScrollArea className="flex-1 py-4">
                        <nav className="px-2 space-y-1">
                            {/* Home button */}
                            <button onClick={goHome} className="sidebar-item w-full mb-4 bg-slate-800/50" data-testid="nav-home">
                                <Home className="h-5 w-5 flex-shrink-0" />
                                <span className="truncate">Home</span>
                            </button>

                            {/* Section header */}
                            <div className="px-3 py-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg ${currentSection.color} flex items-center justify-center text-white`}>
                                        <currentSection.icon className="h-4 w-4" />
                                    </div>
                                    <span className="font-semibold text-sm">{currentSection.title}</span>
                                </div>
                            </div>

                            {/* Section items */}
                            {sidebarItems.map(item => (
                                <SidebarNavItem
                                    key={item.path}
                                    item={item}
                                    isActive={currentPath === item.path}
                                    onClick={() => goTo(item.path)}
                                />
                            ))}

                            {/* Settings at bottom */}
                            <div className="border-t border-slate-800 mt-4 pt-4">
                                <button onClick={() => goTo('/settings')} className={`sidebar-item w-full ${currentPath === '/settings' ? 'active' : ''}`}>
                                    <Settings className="h-5 w-5 flex-shrink-0" />
                                    <span className="truncate">Settings</span>
                                </button>
                            </div>
                        </nav>
                    </ScrollArea>

                    {/* User info */}
                    <div className="border-t border-slate-800 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">{user?.full_name?.charAt(0) || 'U'}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                                <Badge className={`${getRoleBadgeColor(userRole)} text-white text-xs mt-1`}>{userRole?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User'}</Badge>
                            </div>
                        </div>
                    </div>
                </aside>
            )}

            {/* Main content */}
            <main className={!isHomePage && currentSection ? 'lg:ml-64' : ''}>
                {/* Header */}
                <header className="h-16 bg-card border-b border-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        {!isHomePage && <div className="lg:hidden w-8" />}
                        <h1 className="text-lg font-semibold text-foreground">CLT Synapse</h1>
                    </div>
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
                                <ScrollArea className="h-64">
                                    {notifications.length === 0 ? <div className="p-4 text-center text-muted-foreground text-sm">No notifications</div> : notificationItems}
                                </ScrollArea>
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

                {/* Page content */}
                <div className={isHomePage ? '' : 'p-4 lg:p-6'}>
                    {isHomePage ? (
                        <HomePageContent user={user} visibleSections={visibleSections} selectSection={selectSection} />
                    ) : (
                        <Outlet />
                    )}
                </div>
            </main>

            {/* Mobile overlay */}
            {mobileMenuOpen && !isHomePage && <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileMenuOpen(false)} />}
        </div>
    );
}

function TradingChartBackground() {
    return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="homeChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <g stroke="#334155" strokeWidth="0.5" opacity="0.15">
                <line x1="0" y1="100" x2="1000" y2="100" />
                <line x1="0" y1="200" x2="1000" y2="200" />
                <line x1="0" y1="300" x2="1000" y2="300" />
                <line x1="0" y1="400" x2="1000" y2="400" />
                <line x1="0" y1="500" x2="1000" y2="500" />
                <line x1="200" y1="0" x2="200" y2="600" />
                <line x1="400" y1="0" x2="400" y2="600" />
                <line x1="600" y1="0" x2="600" y2="600" />
                <line x1="800" y1="0" x2="800" y2="600" />
            </g>
            <path d="M50,350 L100,320 L150,280 L200,300 L250,250 L300,220 L350,260 L400,200 L450,180 L500,220 L550,150 L600,180 L650,140 L700,160 L750,120 L800,150 L850,100 L900,130 L950,80" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.2" />
            <path d="M50,350 L100,320 L150,280 L200,300 L250,250 L300,220 L350,260 L400,200 L450,180 L500,220 L550,150 L600,180 L650,140 L700,160 L750,120 L800,150 L850,100 L900,130 L950,80 L950,600 L50,600 Z" fill="url(#homeChartGradient)" />
            <path d="M50,400 L100,380 L150,420 L200,390 L250,350 L300,380 L350,320 L400,350 L450,280 L500,310 L550,260 L600,290 L650,240 L700,270 L750,220 L800,250 L850,200 L900,230 L950,180" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.15" />
        </svg>
    );
}

function HomePageContent({ user, visibleSections, selectSection }) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    return (
        <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden" data-testid="home-launcher">
            {/* Trading chart background with 15-20% opacity */}
            <div className="absolute inset-0 opacity-20">
                <TradingChartBackground />
            </div>
            
            {/* Content */}
            <div className="relative z-10 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6">
                {/* CLT Logo in center - LARGE */}
                <div className="mb-12">
                    <CLTLogo 
                        className="h-40 md:h-48 lg:h-56 w-auto mx-auto"
                        isDark={isDark}
                        data-testid="home-logo"
                    />
                </div>
                
                {/* Welcome message */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-2">Welcome, {user?.full_name?.split(' ')[0]}!</h2>
                    <p className="text-muted-foreground">Select a module to get started</p>
                </div>
                
                {/* Section icons grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl">
                    {visibleSections.map(section => (
                        <SectionIcon key={section.id} section={section} onClick={() => selectSection(section.id)} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Layout;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useTheme, usePermissions, notificationApi } from '@/lib/api';
import api from '@/lib/api';
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
import ClaretChatWidget from '@/components/ClaretChatWidget';
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
    Monitor,
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
    Volume2,
    VolumeX,
    Clock,
    Calendar,
    BarChart3,
    Fingerprint,
    CheckSquare,
    ClipboardCheck,
    FolderOpen,
    UserCog,
    Receipt,
    Megaphone,
    FileCheck,
    ArrowRightLeft,
    Shuffle,
    Timer,
    ArrowDownRight,
    Upload,
    GitMerge,
    Server,
    Database,
    MessageSquare,
    Zap,
    Network,
    ListTodo,
    Sparkles,
    Brain,
    Target,
} from 'lucide-react';
import CLTLogo from '@/components/CLTLogo';
import { NotificationCenter } from '@/components/NotificationCenter';

// Notification sound URLs (base64 encoded short alert tones)
const NOTIFICATION_SOUNDS = {
    // Standard notification sound - soft chime
    notification: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1cXWBhZ3F7hY2VnKGlo6GdlpCLhoOBf35+f4GDh4uQlZqeoKCfnZqXk5CLiIaDgYB/f4CBg4aJjZGVmZudn56cmpiVkY6LiIaDgYB/f4CBgoWIi4+SlZiampubnJuamJaUkY6LiYeEgoGAgICBgoSGiYuOkJKUlZaXl5eXlpWUkpCOjImHhYOCgYGBgYKDhYeJi42PkJGSk5OTk5OSkZCPjYuJh4WEgoKBgYGCg4SFh4iKi4yNjo6Ojo6NjYyLioiHhoWEg4KCgoKCg4OEhYaHiImKioqLi4uKiomJiIeGhYWEg4ODg4ODg4OEhIWFhoaGh4eHh4eHhoaFhYWEhISEhISEhISEhIWFhYWFhYWFhYWFhYWFhYSEhISEhISEhISEhISEhIWFhYWFhYWFhYWFhQ==',
    // Lead alert sound - more urgent double beep
    lead: 'data:audio/wav;base64,UklGRl9JAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YTtJAAD//wIA/f8EAPz/BgD7/wgA+v8KAPn/DAD4/w4A9/8QAPX/EgD0/xQA8/8WAPD/GADv/xoA7f8cAOz/HgDq/yAA6P8iAOb/JADk/yYA4v8oAOD/KgDd/ywA2/8uANn/MADWyzIA1P80ANH/NgDO/zgAy/86AMj/PADG/z4Aw/9AAMD/QgC9/0QAuv9GALf/SAC0/0oAsP9MAK3/TgCq/1AAp/9SAKT/VACV/1YAlv9YAI3/WgCK/1wAgf9eAH7/YAB7/2IAeP9kAHP/ZgBw/2gAav9qAGX/bABi/24AX/9wAFn/cgBW/3QAU/92AFD/eABM/3oASP98AEX/fgBC/4AAPv+CADv/hAA3/4YAMP+IACz/igAp/4wAJv+OACL/kAAf/5IAHP+UABj/lgAV/5gAEv+aAA7/nAAL/54AB/+gAAT/ogAA/6QA/f6mAPn+qAD2/qoA8v6sAO/+rgDr/rAA6P6yAOT+tADh/rYA3f64ANr+ugDW/rwA0/6+AM/+wADM/sIAyP7EAMP+xgC//sgAu/7KALj+zAC0/s4AsP7QALL+kgCr/tQAp/7WAKr/2ACg/9oAnf/cAJn/3gCW/+AAs/+6AJD/5ACN/+YAif/oAIX/6gCA/+wAfP/uAHr/8ABw//IAaf/0AGf/9gBk//gAYP/6AF3//ABa/wABWf8CAVb/BAFUzwYBUv8IAVD/CgFM/wwBS/8OAUL/EAFA/xIBPv8UAT3/FgE7/xgBOP8aATf/HAE0/x4BM/8gATD/IgEv/yQBLv8mASz/KAEs/yoBLP8sASv/LgEr/zABLP8yAS3/NAEu/zYBLv84ATD/OgEw/zwBMf8+ATL/QAE0/0IBNf9EATX/RgE2/0gBN/9KATj/TAE4/04BOf9QATr/UgE6/1QBO/9WATz/WAE8/1oBPf9cAT7/XgE+/2ABQf9iAUH/ZAFEz2YBRf9oAUf/agFI/2wBSv9uAUv/cAFN/3IBUP90AVH/dgFT/3gBVf96AVj/fAFa/34BXf+AAWD/ggFi/4QBZf+GAWj/iAFq/4oBbv+MAW//jgFy/5ABdf+SAXP/lAF6/5YBff+YAX7/mgGA/5wBhP+eAYf/oAGK/6IBjP+kAZD/pgGS/6gBlf+qAZj/rAGa/64Bnf+wAZ//sgGj/7QBpv+2Aan/uAGr/7oBr/+8AbH/vgG0/8ABt//CAbv/xAG9/8YBwf/IAcP/ygHG/8wByP/OAcv/0AHO/9IB0f/UAdP/1gHV/9gB2P/aAdr/3AHd/94B4P/gAeL/4gHl/+QB6P/mAev/6AHt/+oB8P/sAfP/7gH1//AB+P/yAfr/9AH9//YB///4AQIA+gEFAPwBBwD+AQoAAAENAAIBEAAEARIABgEVAAgBFwAKARoADAEcAA4BHwAQASEAEgEkABQBJgAWASkAGAErABoBLgAbATAAHQEzAB8BNQAhATgAIwE6ACQBPQA='
};

// Helper to get notification type from notification data
function getNotificationType(notification) {
    if (!notification) return 'notification';
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();
    const entityType = notification.entity_type || '';
    
    // Check if it's a lead-related notification
    if (entityType === 'lead' || title.includes('lead') || message.includes('lead') || message.includes('new lead')) {
        return 'lead';
    }
    return 'notification';
}

const SECTIONS = {
    sshr: {
        id: 'sshr',
        title: 'My Self-Service',
        icon: UserCog,
        color: 'bg-teal-500',
        roles: ['super_admin', 'coo', 'admin', 'sales_manager', 'team_leader', 'sales_executive', 'cs_head', 'cs_agent', 'mentor', 'academic_master', 'master_of_academics', 'master_of_academics_', 'hr', 'finance', 'finance_manager', 'operations', 'marketing', 'quality_control', 'business_development', 'business_development_manager_', 'business_development_manager', 'staff'],
        items: [
            { title: 'SSHR Dashboard', icon: UserCog, path: '/sshr' },
            { title: 'Task Manager', icon: ListTodo, path: '/hr/tasks' },
            { title: 'My Payslips', icon: Receipt, path: '/sshr/payslips' },
            { title: 'Announcements', icon: Megaphone, path: '/sshr/announcements' },
        ],
    },
    sales: {
        id: 'sales',
        title: 'Sales',
        icon: Phone,
        color: 'bg-blue-500',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive'],
        items: [
            { title: 'Sales CRM', icon: Phone, path: '/sales' },
            { title: 'Sales Dashboard', icon: TrendingUp, path: '/sales/dashboard' },
            { title: 'Sales Directory', icon: Users, path: '/sales/directory', roles: ['super_admin', 'admin', 'sales_manager'] },
            { title: 'My Commissions', icon: DollarSign, path: '/commission-dashboard' },
            { title: "Today's Follow-ups", icon: Bell, path: '/followups' },
            { title: 'Historical Import', icon: Upload, path: '/sales/historical-import', roles: ['super_admin'] },
        ],
    },
    cs: {
        id: 'cs',
        title: 'Customer Service',
        icon: Headphones,
        color: 'bg-emerald-500',
        roles: ['super_admin', 'admin', 'cs_head', 'cs_agent', 'mentor', 'academic_master', 'master_of_academics', 'master_of_academics_'],
        items: [
            { title: 'CS Dashboard', icon: Headphones, path: '/cs/dashboard' },
            { title: 'My Commissions', icon: DollarSign, path: '/commission-dashboard', roles: ['super_admin', 'admin', 'cs_head', 'cs_agent'] },
            { title: 'Merge Approvals', icon: GitMerge, path: '/cs/merge-approvals', roles: ['super_admin', 'admin', 'cs_head'] },
            { title: 'Customer Service', icon: Users, path: '/cs' },
            { title: 'Student Directory', icon: Database, path: '/cs/directory', roles: ['super_admin', 'admin', 'cs_head'] },
            { title: 'Student Portal', icon: GraduationCap, path: '/cs/student-portal', roles: ['super_admin', 'admin', 'cs_head'] },
            { title: 'CS Historical Import', icon: Upload, path: '/cs/historical-import', roles: ['super_admin'] },
        ],
    },
    academics: {
        id: 'academics',
        title: 'Academics',
        icon: GraduationCap,
        color: 'bg-orange-500',
        roles: ['super_admin', 'admin', 'mentor', 'academic_master', 'master_of_academics', 'master_of_academics_', 'business_development', 'business_development_manager_', 'business_development_manager'],
        items: [
            { title: 'Mentor CRM', icon: GraduationCap, path: '/mentor', roles: ['super_admin', 'admin', 'mentor', 'academic_master', 'master_of_academics', 'master_of_academics_'] },
            { title: 'Mentor Dashboard', icon: TrendingUp, path: '/mentor/dashboard', roles: ['super_admin', 'admin', 'mentor', 'academic_master', 'master_of_academics', 'master_of_academics_'] },
            { title: 'Leaderboard', icon: Users, path: '/mentor/leaderboard', roles: ['super_admin', 'admin', 'mentor', 'academic_master', 'master_of_academics', 'master_of_academics_'] },
            { title: 'Cross-Mentor Deposits', icon: ArrowRightLeft, path: '/mentor/cross-deposits', roles: ['super_admin', 'admin', 'mentor', 'academic_master', 'master_of_academics', 'master_of_academics_'] },
            { title: 'BD CRM', icon: Briefcase, path: '/bd', roles: ['super_admin', 'admin', 'business_development', 'business_development_manager_', 'business_development_manager'] },
            { title: 'BD Dashboard', icon: TrendingUp, path: '/bd/dashboard', roles: ['super_admin', 'admin', 'business_development', 'business_development_manager_', 'business_development_manager'] },
            { title: 'Historical Import', icon: Upload, path: '/mentor/historical-import', roles: ['super_admin'] },
        ],
    },
    hr: {
        id: 'hr',
        title: 'Human Resources',
        icon: Users,
        color: 'bg-rose-500',
        roles: ['super_admin', 'admin', 'hr'],
        items: [
            { title: 'HR Dashboard', icon: LayoutDashboard, path: '/hr/dashboard' },
            { title: 'Employee Master', icon: UserCircle, path: '/hr/employees' },
            { title: 'Company Documents', icon: FolderOpen, path: '/hr/documents' },
            { title: 'Leave Management', icon: Calendar, path: '/hr/leave' },
            { title: 'Attendance', icon: Clock, path: '/hr/attendance' },
            { title: 'Attendance Settings', icon: Settings, path: '/hr/attendance-settings' },
            { title: 'Approval Queue', icon: ClipboardCheck, path: '/hr/approvals' },
            { title: 'BioCloud Sync', icon: Fingerprint, path: '/hr/biocloud' },
            { title: 'Payroll', icon: DollarSign, path: '/hr/payroll' },
            { title: 'Performance', icon: TrendingUp, path: '/hr/performance' },
            { title: 'HR Analytics', icon: BarChart3, path: '/hr/analytics' },
        ],
    },
    operations: {
        id: 'operations',
        title: 'Operations',
        icon: Briefcase,
        color: 'bg-purple-500',
        roles: ['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance', 'hr', 'operations', 'team_leader', 'master_of_academics_'],
        items: [
            { title: 'QC Dashboard', icon: Headphones, path: '/qc-dashboard', roles: ['super_admin', 'admin', 'cs_head', 'sales_manager'] },
            { title: 'Leads Pool', icon: Inbox, path: '/leads/pool', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader'] },
            { title: 'Approvals', icon: CheckSquare, path: '/approvals', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader'] },
            { title: 'Transfer Requests', icon: ArrowRightLeft, path: '/transfer-requests', roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'cs_head', 'cs_agent', 'mentor', 'academic_master'] },
            { title: 'Round Robin', icon: Shuffle, path: '/round-robin', roles: ['super_admin', 'admin', 'sales_manager', 'cs_head'] },
            { title: 'SLA Management', icon: Timer, path: '/sla-management', roles: ['super_admin', 'admin'] },
            { title: 'Customer Master', icon: UserCheck, path: '/customers', roles: ['super_admin', 'admin', 'sales_manager', 'cs_head', 'finance'] },
            { title: 'Departments', icon: Building2, path: '/departments', roles: ['super_admin', 'admin', 'hr'] },
            { title: 'Courses', icon: BookOpen, path: '/courses', roles: ['super_admin', 'admin'] },
            { title: 'Certificates', icon: FileText, path: '/certificates', roles: ['super_admin', 'admin', 'operations'] },
            { title: 'MT5 Integration', icon: Server, path: '/mt5', roles: ['super_admin', 'admin', 'cs_head', 'cs_head_', 'customer_service', 'customer_service_', 'cs_agent'] },
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
            { title: 'Role Management', icon: Users, path: '/roles', roles: ['super_admin'] },
            { title: 'Teams Management', icon: Users, path: '/teams', roles: ['super_admin', 'admin', 'sales_manager'] },
            { title: 'Password Resets', icon: Key, path: '/password-resets', roles: ['super_admin'] },
            { title: 'People Intelligence', icon: Brain, path: '/people-intelligence', roles: ['super_admin', 'admin'] },
            { title: 'Audit Log', icon: FileText, path: '/audit-log', roles: ['super_admin', 'admin'] },
            { title: 'User Management', icon: UserCircle, path: '/users', roles: ['super_admin', 'admin', 'hr'] },
        ],
    },
    finance: {
        id: 'finance',
        title: 'Finance',
        icon: DollarSign,
        color: 'bg-cyan-500',
        roles: ['super_admin', 'admin', 'finance', 'ceo'],
        items: [
            { title: 'Finance', icon: DollarSign, path: '/finance', roles: ['super_admin', 'admin', 'finance'] },
            { title: 'Payment Verifications', icon: FileCheck, path: '/finance/verifications', roles: ['super_admin', 'admin', 'finance'] },
            { title: 'Mentor Withdrawals', icon: ArrowDownRight, path: '/finance/mentor-withdrawals', roles: ['super_admin', 'admin', 'finance'] },
            { title: 'Commission Engine', icon: Calculator, path: '/commissions', roles: ['super_admin', 'admin', 'finance'] },
            { title: 'Commission Dashboard', icon: DollarSign, path: '/commission-dashboard', roles: ['super_admin', 'admin', 'finance'] },
            { title: 'Revenue Forecast', icon: TrendingUp, path: '/forecasting', roles: ['super_admin', 'admin', 'finance'] },
            { title: 'Report Builder', icon: BarChart3, path: '/reports', roles: ['super_admin', 'admin', 'finance'] },
        ],
    },
    marketing: {
        id: 'marketing',
        title: 'Marketing',
        icon: Megaphone,
        color: 'bg-pink-500',
        roles: ['super_admin', 'admin', 'marketing'],
        items: [
            { title: 'Analytics Dashboard', icon: BarChart3, path: '/marketing/dashboard' },
            { title: 'Competitor Intel', icon: Target, path: '/competitor-intelligence' },
            { title: 'Market Analysis', icon: TrendingUp, path: '/marketing/analysis' },
            { title: 'Content Studio', icon: Sparkles, path: '/marketing/content-studio' },
            { title: 'Lead Connectors', icon: Inbox, path: '/marketing/connectors' },
            { title: 'Settings', icon: Settings, path: '/marketing/settings', roles: ['super_admin', 'admin'] },
        ],
    },
    chat: {
        id: 'chat',
        title: 'Team Chat',
        icon: MessageSquare,
        color: 'bg-blue-600',
        roles: ['super_admin', 'admin', 'sales_manager', 'team_leader', 'sales_executive', 'cs_head', 'cs_agent', 'mentor', 'academic_master', 'master_of_academics', 'master_of_academics_', 'hr', 'finance', 'finance_manager', 'operations', 'marketing', 'quality_control', 'business_development', 'business_development_manager_', 'business_development_manager', 'staff'],
        items: [
            { title: 'Team Chat', icon: MessageSquare, path: '/chat' },
        ],
    },
    it: {
        id: 'it',
        title: 'IT & Assets',
        icon: Monitor,
        color: 'bg-slate-600',
        roles: ['super_admin', 'coo', 'admin', 'hr'],
        items: [
            { title: 'IT Assets', icon: Monitor, path: '/it/assets' },
        ],
    },
    executive: {
        id: 'executive',
        title: 'Executive',
        icon: Zap,
        color: 'bg-amber-500',
        roles: ['super_admin', 'coo', 'admin', 'hr'],
        items: [
            { title: 'Executive Dashboard', icon: Zap, path: '/executive', roles: ['super_admin', 'coo', 'admin'] },
            { title: 'Organization Map', icon: Network, path: '/organization' },
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
    const prevUnreadCountRef = useRef(0);
    const prevNotificationsRef = useRef([]);
    const notificationSoundRef = useRef(null);
    const leadSoundRef = useRef(null);
    
    // Get notification sound setting from localStorage
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('notificationSoundEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Initialize notification sounds
    useEffect(() => {
        // Create audio elements for different notification types
        notificationSoundRef.current = new Audio(NOTIFICATION_SOUNDS.notification);
        notificationSoundRef.current.volume = 0.5;
        
        leadSoundRef.current = new Audio(NOTIFICATION_SOUNDS.lead);
        leadSoundRef.current.volume = 0.6;
    }, []);

    // Sync sound settings with backend
    const syncSoundSettings = useCallback(async (enabled) => {
        try {
            await api.put('/users/preferences', { notification_sound_enabled: enabled });
        } catch (err) {
            console.error('Failed to sync sound settings:', err);
        }
    }, []);

    // Play appropriate sound when new notifications arrive
    useEffect(() => {
        if (!soundEnabled) return;
        if (unreadCount <= prevUnreadCountRef.current) {
            prevUnreadCountRef.current = unreadCount;
            return;
        }
        
        // Find new notifications by comparing with previous
        const prevIds = new Set(prevNotificationsRef.current.map(n => n.id));
        const newNotifications = notifications.filter(n => !prevIds.has(n.id) && !n.read);
        
        if (newNotifications.length > 0) {
            // Determine which sound to play based on notification type
            const hasLeadNotification = newNotifications.some(n => getNotificationType(n) === 'lead');
            
            if (hasLeadNotification) {
                leadSoundRef.current?.play().catch(() => {});
            } else {
                notificationSoundRef.current?.play().catch(() => {});
            }
        }
        
        prevUnreadCountRef.current = unreadCount;
        prevNotificationsRef.current = [...notifications];
    }, [unreadCount, notifications, soundEnabled]);
    
    const { user, logout } = useAuth();
    const { theme, themeMode, toggleTheme } = useTheme();
    const { canAccess, canAccessModule, loading: permLoading } = usePermissions();
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;
    const userRole = user?.role || '';

    useEffect(() => {
        async function fetchNotifications() {
            try {
                const response = await notificationApi.getAll();
                const data = response.data;
                const items = data?.items || (Array.isArray(data) ? data : []);
                setNotifications(items);
                setUnreadCount(data?.unread_count || items.filter(n => !n.read).length);
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
        
        // First: check if the path exists in the CURRENTLY active section (don't switch away)
        if (activeSection) {
            const currentSec = SECTIONS[activeSection];
            if (currentSec) {
                for (let j = 0; j < currentSec.items.length; j++) {
                    if (currentPath === currentSec.items[j].path || currentPath.startsWith(currentSec.items[j].path + '/')) {
                        return; // Stay in current section
                    }
                }
            }
        }

        // Otherwise: find the best matching section for this path
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
            // Find the first item accessible by ROLE (not permissions — permissions may not be loaded yet)
            const firstItem = section.items.find(item => {
                if (userRole === 'super_admin' || userRole === 'coo') return true;
                // Use role-based check: if item has roles restriction, user must be in the list
                if (item.roles && !item.roles.includes(userRole)) return false;
                return true;
            });
            if (firstItem) {
                navigate(firstItem.path);
            }
        }
    }

    // Check if user can access a path using roles AND permissions
    function checkAccess(path, roles) {
        // Super admin and COO always has access
        if (userRole === 'super_admin' || userRole === 'coo') return true;
        
        // First check item-level role restriction (most specific)
        if (roles && roles.length > 0 && !roles.includes(userRole)) {
            return false; // Item explicitly excludes this role
        }
        
        // Then check permission-based access
        if (canAccess(path)) return true;
        
        // If roles are defined and user's role is included, allow access
        if (roles && roles.includes(userRole)) return true;
        
        return false;
    }

    function hasRole(roles) {
        if (!roles) return true;
        return roles.includes(userRole);
    }

    function getRoleBadgeColor(r) {
        const map = { super_admin: 'bg-purple-500', coo: 'bg-purple-500', admin: 'bg-blue-500', sales_manager: 'bg-green-500', team_leader: 'bg-cyan-500', sales_executive: 'bg-yellow-500', cs_head: 'bg-pink-500', cs_agent: 'bg-indigo-500', mentor: 'bg-orange-500', finance: 'bg-emerald-500', hr: 'bg-rose-500', business_development: 'bg-sky-500', business_development_manager: 'bg-sky-500', business_development_manager_: 'bg-sky-500' };
        return map[r] || 'bg-slate-500';
    }

    const currentSection = activeSection ? SECTIONS[activeSection] : null;
    const standalonePages = ['/knowledge-base', '/claret', '/organization', '/it-assets'];
    const isStandalonePage = standalonePages.some(p => currentPath.startsWith(p));
    const isHomePage = (!activeSection && !isStandalonePage) || currentPath === '/home';

    // Determine visible sections using BOTH role restrictions and permission system
    const visibleSections = [];
    const sectionKeys = Object.keys(SECTIONS);
    for (let i = 0; i < sectionKeys.length; i++) {
        const key = sectionKeys[i];
        const section = SECTIONS[key];
        // Super admin and COO see everything
        if (userRole === 'super_admin' || userRole === 'coo') {
            visibleSections.push(section);
        } else {
            // First check: user's role must be in the section's allowed roles
            if (section.roles && !section.roles.includes(userRole)) continue;
            // Second check: at least one item must be accessible
            const hasAccessibleItem = section.items.some(item => {
                // If item has specific role restrictions, check those first
                if (item.roles && !item.roles.includes(userRole)) return false;
                return true;
            });
            if (hasAccessibleItem) {
                visibleSections.push(section);
            }
        }
    }

    // Determine sidebar items using role restrictions
    const sidebarItems = [];
    if (currentSection) {
        for (let i = 0; i < currentSection.items.length; i++) {
            const item = currentSection.items[i];
            if (userRole === 'super_admin' || userRole === 'coo') {
                sidebarItems.push(item);
            } else {
                // If item has specific roles, check against user role
                if (item.roles && !item.roles.includes(userRole)) continue;
                sidebarItems.push(item);
            }
        }
    }

    const notificationItems = [];
    const notifSlice = (notifications || []).slice(0, 10);
    for (let i = 0; i < notifSlice.length; i++) {
        const n = notifSlice[i];
        const isLeadNotification = getNotificationType(n) === 'lead';
        notificationItems.push(
            <DropdownMenuItem 
                key={n.id} 
                className={`flex flex-col items-start p-3 cursor-pointer ${!n.read ? 'bg-muted/50' : ''}`}
                onClick={() => handleNotificationClick(n)}
                data-testid={`notification-item-${n.id}`}
            >
                <div className="flex items-center gap-2 w-full">
                    {isLeadNotification && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="New Lead" />
                    )}
                    <span className="font-medium text-sm flex-1">{n.title}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">{n.message}</span>
                {(n.entity_type || n.entity_id) && <span className="text-xs text-primary mt-1">Click to view →</span>}
            </DropdownMenuItem>
        );
    }

    // Handle notification click - redirect to relevant entity
    function handleNotificationClick(notification) {
        // Mark as read
        notificationApi.markRead(notification.id).catch(() => {});
        
        // Redirect based on entity type
        if (notification.entity_type && notification.entity_id) {
            switch (notification.entity_type) {
                case 'lead':
                    navigate(`/sales?lead=${notification.entity_id}`);
                    break;
                case 'student':
                    navigate(`/cs?student=${notification.entity_id}`);
                    break;
                case 'followup':
                    navigate('/followups');
                    break;
                case 'reminder':
                    if (notification.related_type === 'lead') {
                        navigate(`/sales?lead=${notification.related_id}`);
                    } else if (notification.related_type === 'student') {
                        navigate(`/cs?student=${notification.related_id}`);
                    }
                    break;
                default:
                    // For SLA breach or deadline notifications
                    if (notification.message?.toLowerCase().includes('lead')) {
                        navigate('/sales');
                    } else if (notification.message?.toLowerCase().includes('student')) {
                        navigate('/cs');
                    }
            }
        }
        
        // Update local state
        setNotifications(prev => prev.map(n => n.id === notification.id ? {...n, read: true} : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
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
                            <div className="border-t border-slate-800 mt-4 pt-4 space-y-1">
                                <button onClick={() => goTo('/settings')} className={`sidebar-item w-full ${currentPath === '/settings' ? 'active' : ''}`}>
                                    <Settings className="h-5 w-5 flex-shrink-0" />
                                    <span className="truncate">Settings</span>
                                </button>
                                {userRole === 'super_admin' && (
                                    <button onClick={() => goTo('/admin-settings')} className={`sidebar-item w-full ${currentPath === '/admin-settings' ? 'active' : ''}`}>
                                        <Shield className="h-5 w-5 flex-shrink-0" />
                                        <span className="truncate">Admin Settings</span>
                                    </button>
                                )}
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
                        {(userRole === 'super_admin' || userRole === 'coo') && <EnvironmentSwitcher />}
                        <Button variant="ghost" size="icon" onClick={toggleTheme} title={`Theme: ${themeMode || 'auto'}`} data-testid="theme-toggle">
                            {themeMode === 'auto' ? <Monitor className="h-5 w-5" /> : theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>
                        <NotificationCenter />
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
            
            {/* Claret AI Chat Widget */}
            <ClaretChatWidget />
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
    
    // Dynamically import QuickStatsWidget
    const QuickStatsWidget = React.lazy(() => import('@/components/QuickStatsWidget'));
    
    return (
        <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden" data-testid="home-launcher">
            {/* Trading chart background with 15-20% opacity */}
            <div className="absolute inset-0 opacity-20">
                <TradingChartBackground />
            </div>
            
            {/* Content */}
            <div className="relative z-10 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6">
                {/* CLT Logo in center - LARGE */}
                <div className="mb-8">
                    <CLTLogo 
                        className="h-40 md:h-48 lg:h-56 w-auto mx-auto"
                        isDark={isDark}
                        data-testid="home-logo"
                    />
                </div>
                
                {/* Welcome message */}
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold mb-1">Welcome, {user?.designation ? user.full_name : user?.full_name || 'User'}!</h2>
                    {user?.designation && (
                        <p className="text-base text-primary/80 font-medium mb-1">{user.designation}</p>
                    )}
                    <p className="text-muted-foreground">Select a module to get started</p>
                </div>
                
                {/* Quick Stats Widget */}
                <React.Suspense fallback={<div className="h-20 w-full max-w-5xl animate-pulse bg-muted/30 rounded-lg" />}>
                    <QuickStatsWidget className="max-w-5xl w-full mb-8" />
                </React.Suspense>
                
                {/* Section icons grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl">
                    {visibleSections.map(section => (
                        <SectionIcon key={section.id} section={section} onClick={() => selectSection(section.id)} />
                    ))}
                </div>
                
                {/* Knowledge Base & Claret Quick Access */}
                <div className="flex flex-wrap gap-3 mt-6 max-w-5xl w-full justify-center">
                    <a
                        href="/knowledge-base"
                        className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                        data-testid="home-kb-btn"
                    >
                        <BookOpen className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="font-semibold text-sm">Knowledge Base</p>
                            <p className="text-[10px] text-muted-foreground">SOPs, Policies & Training</p>
                        </div>
                    </a>
                    <a
                        href="/claret"
                        className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                        data-testid="home-claret-btn"
                    >
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        <div>
                            <p className="font-semibold text-sm">Claret Dashboard</p>
                            <p className="text-[10px] text-muted-foreground">Mood & Wellness Tracking</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}

export default Layout;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Bell, Check, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle,
    DollarSign, Users, FileText, Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS = {
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    transfer: { icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    finance: { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    certificate: { icon: FileText, color: 'text-sky-500', bg: 'bg-sky-500/10' },
};

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/notifications?page_size=20');
            const data = res.data;
            setNotifications(data?.items || []);
            setUnreadCount(data?.unread_count || 0);
        } catch { /* silent */ }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markRead = async (id) => {
        try {
            await apiClient.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(prev - 1, 0));
        } catch {}
    };

    const markAllRead = async () => {
        try {
            await apiClient.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch {}
    };

    const handleClick = (notif) => {
        if (!notif.read) markRead(notif.id);
        if (notif.link) { navigate(notif.link); setOpen(false); }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="notification-bell">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1"
                            data-testid="notification-badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="end" data-testid="notification-panel">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}
                                data-testid="mark-all-read-btn">
                                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
                            </Button>
                        )}
                    </div>
                </div>
                <ScrollArea className="max-h-[400px]">
                    {loading && notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            No notifications yet
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map(notif => {
                                const cfg = TYPE_ICONS[notif.type] || TYPE_ICONS.info;
                                const Icon = cfg.icon;
                                return (
                                    <div key={notif.id}
                                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${!notif.read ? 'bg-primary/5' : ''}`}
                                        onClick={() => handleClick(notif)}
                                        data-testid={`notification-item-${notif.id}`}>
                                        <div className={`p-1.5 rounded-lg ${cfg.bg} mt-0.5 flex-shrink-0`}>
                                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notif.read ? 'font-semibold' : ''}`}>{notif.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notif.created_at)}</p>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

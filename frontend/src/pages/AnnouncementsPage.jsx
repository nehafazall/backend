import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Megaphone, Plus, Trash2, Cake, CalendarDays, AlertTriangle,
    RefreshCw, Sparkles, Clock
} from 'lucide-react';

const PRIORITY_COLORS = {
    normal: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
    important: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
    urgent: 'bg-red-500/10 border-red-500/30 text-red-600',
};

const CATEGORY_ICONS = {
    general: Megaphone,
    hr: CalendarDays,
    event: Sparkles,
    birthday: Cake,
};

const AnnouncementsPage = () => {
    const { user } = useAuth();
    const isHR = ['super_admin', 'admin', 'hr'].includes(user?.role);
    const [announcements, setAnnouncements] = useState([]);
    const [birthdays, setBirthdays] = useState({ today: [], upcoming: [] });
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '', content: '', priority: 'normal', category: 'general', expires_at: ''
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [annRes, bdRes] = await Promise.all([
                api.get('/announcements'),
                api.get('/hr/birthdays')
            ]);
            setAnnouncements(annRes.data);
            setBirthdays(bdRes.data);
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async () => {
        if (!newAnnouncement.title || !newAnnouncement.content) {
            toast.error('Title and content are required');
            return;
        }
        try {
            await api.post('/announcements', {
                ...newAnnouncement,
                expires_at: newAnnouncement.expires_at || null
            });
            toast.success('Announcement published');
            setShowCreateModal(false);
            setNewAnnouncement({ title: '', content: '', priority: 'normal', category: 'general', expires_at: '' });
            fetchData();
        } catch (error) {
            toast.error('Failed to create announcement');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this announcement?')) return;
        try {
            await api.delete(`/announcements/${id}`);
            toast.success('Announcement deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete announcement');
        }
    };

    const handleAutoBirthday = async () => {
        try {
            const res = await api.post('/hr/birthdays/auto-announce');
            toast.success(res.data.message);
            fetchData();
        } catch (error) {
            toast.error('Failed to generate birthday announcements');
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const timeAgo = (iso) => {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="announcements-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-primary" />
                        Announcements
                    </h1>
                    <p className="text-muted-foreground text-sm">Company-wide notices and celebrations</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    {isHR && (
                        <>
                            <Button variant="secondary" size="sm" onClick={handleAutoBirthday} data-testid="auto-birthday-btn">
                                <Cake className="h-4 w-4 mr-2" />Auto Birthday
                            </Button>
                            <Button size="sm" onClick={() => setShowCreateModal(true)} data-testid="new-announcement-btn">
                                <Plus className="h-4 w-4 mr-2" />New Announcement
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Announcements Feed */}
                <div className="lg:col-span-2 space-y-4">
                    {announcements.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Megaphone className="h-12 w-12 mb-3 opacity-40" />
                                <p>No announcements yet</p>
                            </CardContent>
                        </Card>
                    ) : (
                        announcements.map((ann) => {
                            const Icon = CATEGORY_ICONS[ann.category] || Megaphone;
                            const colors = PRIORITY_COLORS[ann.priority] || PRIORITY_COLORS.normal;
                            return (
                                <Card key={ann.id} className={`border ${colors.split(' ')[1]}`} data-testid={`announcement-${ann.id}`}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${colors.split(' ')[0]}`}>
                                                    <Icon className={`h-5 w-5 ${colors.split(' ')[2]}`} />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">{ann.title}</CardTitle>
                                                    <CardDescription className="flex items-center gap-2 mt-1">
                                                        <Clock className="h-3 w-3" />
                                                        {timeAgo(ann.created_at)} by {ann.created_by_name}
                                                        {ann.expires_at && (
                                                            <span className="text-xs text-muted-foreground">
                                                                (expires {formatDate(ann.expires_at)})
                                                            </span>
                                                        )}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="capitalize text-xs">{ann.category}</Badge>
                                                {ann.priority !== 'normal' && (
                                                    <Badge variant={ann.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                                                        {ann.priority}
                                                    </Badge>
                                                )}
                                                {isHR && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                                        onClick={() => handleDelete(ann.id)} data-testid={`delete-announcement-${ann.id}`}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm whitespace-pre-line">{ann.content}</p>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Birthdays Sidebar */}
                <div className="space-y-4">
                    {/* Today's Birthdays */}
                    <Card className="border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-rose-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Cake className="h-5 w-5 text-pink-500" />
                                Today's Birthdays
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {birthdays.today.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No birthdays today</p>
                            ) : (
                                <div className="space-y-3">
                                    {birthdays.today.map((emp) => (
                                        <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg bg-pink-500/10" data-testid={`birthday-today-${emp.id}`}>
                                            <div className="h-9 w-9 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-600 font-bold text-sm">
                                                {emp.full_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{emp.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{emp.department}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upcoming Birthdays */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-purple-500" />
                                Upcoming Birthdays
                            </CardTitle>
                            <CardDescription>Next 30 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {birthdays.upcoming.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No upcoming birthdays</p>
                            ) : (
                                <div className="space-y-2">
                                    {birthdays.upcoming.map((emp) => (
                                        <div key={emp.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`birthday-upcoming-${emp.id}`}>
                                            <div>
                                                <p className="text-sm font-medium">{emp.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{emp.department}</p>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {emp.days_until_birthday === 1 ? 'Tomorrow' : `In ${emp.days_until_birthday} days`}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Create Announcement Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5" />New Announcement
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Title</Label>
                            <Input
                                value={newAnnouncement.title}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                placeholder="Announcement title"
                                data-testid="announcement-title-input"
                            />
                        </div>
                        <div>
                            <Label>Content</Label>
                            <Textarea
                                value={newAnnouncement.content}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                placeholder="Write your announcement..."
                                rows={4}
                                data-testid="announcement-content-input"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Priority</Label>
                                <Select value={newAnnouncement.priority} onValueChange={v => setNewAnnouncement({ ...newAnnouncement, priority: v })}>
                                    <SelectTrigger data-testid="announcement-priority">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="important">Important</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select value={newAnnouncement.category} onValueChange={v => setNewAnnouncement({ ...newAnnouncement, category: v })}>
                                    <SelectTrigger data-testid="announcement-category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General</SelectItem>
                                        <SelectItem value="hr">HR</SelectItem>
                                        <SelectItem value="event">Event</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Expires On (optional)</Label>
                            <Input
                                type="date"
                                value={newAnnouncement.expires_at}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expires_at: e.target.value })}
                                data-testid="announcement-expires"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button onClick={handleCreate} data-testid="publish-announcement-btn">Publish</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AnnouncementsPage;

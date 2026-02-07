import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Phone,
    Clock,
    User,
    CheckCircle,
    Sun,
    Sunset,
    Moon,
    Calendar,
    RefreshCw,
    Bell,
    TrendingUp,
    DollarSign,
} from 'lucide-react';

function FollowupCard({ item, onComplete, onCall }) {
    const isLead = item.entity_type === 'lead';
    const typeLabel = isLead ? 'Lead' : (item.reminder_type === 'upgrade' ? 'Upgrade' : item.reminder_type === 'redeposit' ? 'Redeposit' : 'Student');
    const typeColor = isLead ? 'bg-blue-500' : (item.reminder_type === 'upgrade' ? 'bg-emerald-500' : item.reminder_type === 'redeposit' ? 'bg-purple-500' : 'bg-gray-500');
    
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className={typeColor}>{typeLabel}</Badge>
                            {item.reminder_time && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />{item.reminder_time}
                                </span>
                            )}
                        </div>
                        <p className="font-semibold">{item.full_name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />{item.phone}
                        </p>
                        {item.reminder_note && (
                            <p className="text-sm mt-2 bg-muted/50 p-2 rounded">{item.reminder_note}</p>
                        )}
                        {isLead && item.stage && (
                            <Badge variant="outline" className="mt-2">{item.stage.replace(/_/g, ' ')}</Badge>
                        )}
                        {!isLead && item.package_bought && (
                            <p className="text-xs text-muted-foreground mt-1">{item.package_bought}</p>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => onCall(item)}>
                            <Phone className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="default" onClick={() => onComplete(item)}>
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function TimeSlotColumn({ title, icon, items, onComplete, onCall }) {
    const Icon = icon;
    return (
        <div className="flex-1 min-w-[300px]">
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-semibold">{title}</span>
                <Badge variant="secondary">{items.length}</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-3 pr-2">
                    {items.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No follow-ups</p>
                    ) : (
                        items.map(item => (
                            <FollowupCard
                                key={item.id}
                                item={item}
                                onComplete={onComplete}
                                onCall={onCall}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

function FollowupsPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(function() {
        loadFollowups();
    }, []);

    async function loadFollowups() {
        setLoading(true);
        try {
            const res = await apiClient.get('/followups/today');
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load follow-ups');
        }
        setLoading(false);
    }

    async function handleComplete(item) {
        try {
            const endpoint = item.entity_type === 'lead' 
                ? '/leads/' + item.id + '/reminder/complete'
                : '/students/' + item.id + '/reminder/complete';
            await apiClient.post(endpoint);
            toast.success('Follow-up completed');
            loadFollowups();
        } catch (err) {
            toast.error('Failed to complete');
        }
    }

    function handleCall(item) {
        window.open('tel:' + item.phone, '_blank');
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const followups = data?.followups || { morning: [], afternoon: [], evening: [], unscheduled: [] };

    return (
        <div className="space-y-6" data-testid="followups-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="h-8 w-8 text-primary" />
                        Today's Follow-ups
                    </h1>
                    <p className="text-muted-foreground">
                        {data?.date} • {data?.total_followups || 0} scheduled
                    </p>
                </div>
                <Button onClick={loadFollowups} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Today</p>
                                <p className="text-3xl font-bold">{data?.total_followups || 0}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Leads</p>
                                <p className="text-3xl font-bold text-blue-500">{data?.leads_count || 0}</p>
                            </div>
                            <User className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Upgrades</p>
                                <p className="text-3xl font-bold text-emerald-500">
                                    {followups.morning.filter(x => x.reminder_type === 'upgrade').length +
                                     followups.afternoon.filter(x => x.reminder_type === 'upgrade').length +
                                     followups.evening.filter(x => x.reminder_type === 'upgrade').length}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Redeposits</p>
                                <p className="text-3xl font-bold text-purple-500">
                                    {followups.morning.filter(x => x.reminder_type === 'redeposit').length +
                                     followups.afternoon.filter(x => x.reminder_type === 'redeposit').length +
                                     followups.evening.filter(x => x.reminder_type === 'redeposit').length}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4">
                <TimeSlotColumn
                    title="Morning (Before 12 PM)"
                    icon={Sun}
                    items={followups.morning}
                    onComplete={handleComplete}
                    onCall={handleCall}
                />
                <TimeSlotColumn
                    title="Afternoon (12 PM - 5 PM)"
                    icon={Sunset}
                    items={followups.afternoon}
                    onComplete={handleComplete}
                    onCall={handleCall}
                />
                <TimeSlotColumn
                    title="Evening (After 5 PM)"
                    icon={Moon}
                    items={followups.evening}
                    onComplete={handleComplete}
                    onCall={handleCall}
                />
                <TimeSlotColumn
                    title="Unscheduled"
                    icon={Clock}
                    items={followups.unscheduled}
                    onComplete={handleComplete}
                    onCall={handleCall}
                />
            </div>
        </div>
    );
}

export default FollowupsPage;

import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Shuffle, Clock, Users, Pause, Play, AlertTriangle,
    CheckCircle, XCircle, Timer, Sun, Moon,
} from 'lucide-react';

const RoundRobinPage = () => {
    const [data, setData] = useState({ agents: [], cs_window: {} });
    const [loading, setLoading] = useState(true);
    const [showPauseModal, setShowPauseModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [pauseReason, setPauseReason] = useState('');
    const [tab, setTab] = useState('cs_agent');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/round-robin/status');
            setData(res.data);
        } catch (e) { toast.error('Failed to load'); }
        setLoading(false);
    };

    const togglePause = async (agent, newPaused) => {
        if (newPaused) {
            setSelectedAgent(agent);
            setPauseReason('');
            setShowPauseModal(true);
        } else {
            try {
                await apiClient.post('/round-robin/toggle-agent', { agent_id: agent.id, paused: false });
                toast.success(`Round robin resumed for ${agent.full_name}`);
                fetchData();
            } catch (e) { toast.error('Failed'); }
        }
    };

    const confirmPause = async () => {
        try {
            await apiClient.post('/round-robin/toggle-agent', { agent_id: selectedAgent.id, paused: true, reason: pauseReason });
            toast.success(`Round robin paused for ${selectedAgent.full_name}`);
            setShowPauseModal(false);
            fetchData();
        } catch (e) { toast.error('Failed'); }
    };

    const processQueue = async () => {
        try {
            const res = await apiClient.post('/round-robin/process-cs-queue');
            toast.success(res.data.message);
            fetchData();
        } catch (e) { toast.error('Failed'); }
    };

    const filteredAgents = data.agents.filter(a => a.role === tab);
    const csWindow = data.cs_window || {};
    const pausedCount = data.agents.filter(a => a.round_robin_paused).length;

    const roleLabels = { sales_executive: 'Sales Agents', cs_agent: 'CS Agents', mentor: 'Mentors' };

    return (
        <div className="space-y-6" data-testid="round-robin-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shuffle className="h-8 w-8 text-primary" /> Round Robin Controls
                    </h1>
                    <p className="text-muted-foreground">Manage agent availability for lead/student distribution</p>
                </div>
                <Button onClick={processQueue} variant="outline" data-testid="process-queue-btn">
                    <Play className="h-4 w-4 mr-2" /> Process CS Queue Now
                </Button>
            </div>

            {/* CS Time Window */}
            <Card className={`border-2 ${csWindow.active ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {csWindow.active ? <Sun className="h-8 w-8 text-emerald-500" /> : <Moon className="h-8 w-8 text-amber-500" />}
                            <div>
                                <p className="text-lg font-bold">CS Distribution Window: {csWindow.window || '10:00 AM - 10:00 PM GST+4'}</p>
                                <p className="text-sm text-muted-foreground">
                                    Current Abu Dhabi Time: <span className="font-mono font-bold">{csWindow.current_time_gst4 || '--:--'}</span>
                                </p>
                            </div>
                        </div>
                        <Badge variant={csWindow.active ? 'default' : 'secondary'} className={`text-lg px-4 py-2 ${csWindow.active ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                            {csWindow.active ? 'ACTIVE' : 'PAUSED — Queuing Students'}
                        </Badge>
                    </div>
                    {!csWindow.active && (
                        <p className="text-sm text-amber-600 mt-3 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" /> New enrollments after 10 PM will be queued and auto-distributed at 10 AM tomorrow
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Agents</p><p className="text-3xl font-bold">{data.agents.length}</p></div><Users className="h-8 w-8 text-primary" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active</p><p className="text-3xl font-bold text-emerald-500">{data.agents.length - pausedCount}</p></div><CheckCircle className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Paused</p><p className="text-3xl font-bold text-amber-500">{pausedCount}</p></div><Pause className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">CS Window</p><p className="text-xl font-bold">{csWindow.active ? 'Open' : 'Closed'}</p></div><Timer className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
            </div>

            {/* Agent Tables by Role */}
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="cs_agent">CS Agents</TabsTrigger>
                    <TabsTrigger value="sales_executive">Sales Agents</TabsTrigger>
                    <TabsTrigger value="mentor">Mentors</TabsTrigger>
                </TabsList>

                <TabsContent value={tab}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{roleLabels[tab] || 'Agents'}</CardTitle>
                            <CardDescription>Toggle the switch to pause/resume round robin for individual agents</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Agent</TableHead>
                                            <TableHead>Team</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Paused Since</TableHead>
                                            <TableHead className="text-right">Round Robin</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAgents.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No {roleLabels[tab]} found</TableCell></TableRow>
                                        ) : filteredAgents.map(agent => (
                                            <TableRow key={agent.id} className={agent.round_robin_paused ? 'bg-amber-500/5' : ''}>
                                                <TableCell className="font-medium">{agent.full_name}</TableCell>
                                                <TableCell className="text-muted-foreground">{agent.team_name || '-'}</TableCell>
                                                <TableCell>
                                                    {agent.round_robin_paused ? (
                                                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-500"><Pause className="h-3 w-3 mr-1" />Paused</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-500"><Play className="h-3 w-3 mr-1" />Active</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{agent.round_robin_pause_reason || '-'}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{agent.round_robin_paused_at ? new Date(agent.round_robin_paused_at).toLocaleDateString('en-GB') : '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Switch
                                                        checked={!agent.round_robin_paused}
                                                        onCheckedChange={(checked) => togglePause(agent, !checked)}
                                                        data-testid={`toggle-${agent.id}`}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Pause Reason Modal */}
            <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pause Round Robin</DialogTitle>
                        <DialogDescription>Pause {selectedAgent?.full_name}'s round robin participation (e.g., vacation, off day)</DialogDescription>
                    </DialogHeader>
                    <div>
                        <label className="text-sm font-medium">Reason</label>
                        <Input value={pauseReason} onChange={e => setPauseReason(e.target.value)} placeholder="e.g., On vacation, Sick leave..." data-testid="pause-reason" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPauseModal(false)}>Cancel</Button>
                        <Button onClick={confirmPause} className="bg-amber-500 hover:bg-amber-600">Pause Agent</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RoundRobinPage;

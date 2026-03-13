import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Users, UserPlus, RefreshCw, Search, Phone, Mail, MapPin,
    Clock, AlertTriangle, Shuffle, History, Filter, CheckSquare,
    ChevronRight, XCircle, ArrowRightLeft,
} from 'lucide-react';

const LeadsPoolPage = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [agents, setAgents] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamFilter, setTeamFilter] = useState('all');
    const [agentFilter, setAgentFilter] = useState('all');
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [poolRes, usersRes, teamsRes] = await Promise.all([
                apiClient.get('/leads/pool'),
                apiClient.get('/users?role=sales_executive'),
                apiClient.get('/teams').catch(() => ({ data: [] })),
            ]);
            setLeads(poolRes.data);
            setAgents(usersRes.data.filter(u => u.is_active));
            
            // Extract unique teams from assignment histories
            const teamSet = new Set();
            poolRes.data.forEach(l => {
                (l.assignment_history || []).forEach(h => { if (h.team_name) teamSet.add(h.team_name); });
                if (l.team_name) teamSet.add(l.team_name);
            });
            setTeams([...teamSet].sort());
        } catch (error) {
            toast.error('Failed to fetch leads pool');
        } finally { setLoading(false); }
    };

    const handleAssign = async (leadId, agentId = null) => {
        try {
            setAssigning(true);
            const url = agentId ? `/leads/pool/${leadId}/assign?user_id=${agentId}` : `/leads/pool/${leadId}/assign`;
            const res = await apiClient.post(url);
            toast.success(res.data.message);
            setShowAssignModal(false);
            setSelectedLead(null);
            setSelectedAgent('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to assign lead');
        } finally { setAssigning(false); }
    };

    const handleBulkAssign = async () => {
        if (!selectedAgent || selectedLeads.size === 0) return;
        try {
            setAssigning(true);
            const res = await apiClient.post('/leads/pool/bulk-assign', {
                lead_ids: [...selectedLeads],
                agent_id: selectedAgent,
            });
            toast.success(res.data.message);
            setShowBulkAssignModal(false);
            setSelectedLeads(new Set());
            setSelectedAgent('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to bulk assign');
        } finally { setAssigning(false); }
    };

    const toggleSelectLead = (leadId) => {
        setSelectedLeads(prev => {
            const next = new Set(prev);
            if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedLeads.size === filteredLeads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const filteredLeads = useMemo(() => {
        let result = leads;
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            result = result.filter(l => l.full_name?.toLowerCase().includes(s) || l.phone?.includes(s) || l.email?.toLowerCase().includes(s));
        }
        if (teamFilter && teamFilter !== 'all') {
            result = result.filter(l => {
                const history = l.assignment_history || [];
                return history.some(h => h.team_name === teamFilter) || l.team_name === teamFilter;
            });
        }
        if (agentFilter && agentFilter !== 'all') {
            result = result.filter(l => {
                const history = l.assignment_history || [];
                return history.some(h => h.agent_name === agentFilter);
            });
        }
        return result;
    }, [leads, searchTerm, teamFilter, agentFilter]);

    // Extract unique agents from history for the filter
    const historyAgents = useMemo(() => {
        const agentSet = new Set();
        leads.forEach(l => (l.assignment_history || []).forEach(h => { if (h.agent_name) agentSet.add(h.agent_name); }));
        return [...agentSet].sort();
    }, [leads]);

    const canManage = ['super_admin', 'admin', 'sales_manager', 'coo'].includes(user?.role);
    const rejectedCount = leads.filter(l => l.stage === 'rejected' || l.stage === 'not_interested').length;
    const multiAssignedCount = leads.filter(l => (l.times_assigned || 0) > 1).length;

    return (
        <div className="space-y-6" data-testid="leads-pool-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads Pool</h1>
                    <p className="text-muted-foreground">Rejected & unassigned leads — filter by team/agent to avoid re-assignment conflicts</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedLeads.size > 0 && canManage && (
                        <Button onClick={() => { setSelectedAgent(''); setShowBulkAssignModal(true); }} className="bg-primary" data-testid="bulk-assign-btn">
                            <CheckSquare className="h-4 w-4 mr-2" />Bulk Assign ({selectedLeads.size})
                        </Button>
                    )}
                    <Button onClick={fetchData} variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total in Pool</p><p className="text-3xl font-bold">{leads.length}</p></div><Users className="h-8 w-8 text-primary" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Rejected</p><p className="text-3xl font-bold text-red-500">{rejectedCount}</p></div><XCircle className="h-8 w-8 text-red-500" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Multi-Assigned</p><p className="text-3xl font-bold text-amber-500">{multiAssignedCount}</p><p className="text-xs text-muted-foreground">Assigned 2+ times</p></div><ArrowRightLeft className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Available Agents</p><p className="text-3xl font-bold text-emerald-500">{agents.length}</p></div><UserPlus className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filter & Search</CardTitle>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative w-56">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search name, phone, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" data-testid="pool-search" />
                            </div>
                            <Select value={teamFilter} onValueChange={setTeamFilter}>
                                <SelectTrigger className="w-[160px]" data-testid="team-filter"><SelectValue placeholder="All Teams" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Teams</SelectItem>
                                    {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={agentFilter} onValueChange={setAgentFilter}>
                                <SelectTrigger className="w-[160px]" data-testid="agent-filter"><SelectValue placeholder="All Agents" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Agents</SelectItem>
                                    {historyAgents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {canManage && <TableHead className="w-10"><Checkbox checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0} onCheckedChange={toggleSelectAll} data-testid="select-all" /></TableHead>}
                                    <TableHead>Lead</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Times Assigned</TableHead>
                                    <TableHead>Last Rejected By</TableHead>
                                    <TableHead>Added</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLeads.length === 0 ? (
                                    <TableRow><TableCell colSpan={canManage ? 9 : 8} className="text-center text-muted-foreground py-8">No leads in pool matching filters</TableCell></TableRow>
                                ) : filteredLeads.map(lead => {
                                    const history = lead.assignment_history || [];
                                    const lastRejection = [...history].reverse().find(h => h.action === 'rejected' || h.action === 'not_interested');
                                    const timesAssigned = lead.times_assigned || history.filter(h => h.action?.includes('assign')).length || 0;
                                    return (
                                        <TableRow key={lead.id} className={selectedLeads.has(lead.id) ? 'bg-primary/5' : ''}>
                                            {canManage && <TableCell><Checkbox checked={selectedLeads.has(lead.id)} onCheckedChange={() => toggleSelectLead(lead.id)} /></TableCell>}
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{lead.full_name}</p>
                                                    {lead.country && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.country}</p>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <p className="text-sm flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>
                                                    {lead.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</p>}
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{lead.lead_source || 'Direct'}</Badge></TableCell>
                                            <TableCell>
                                                <Badge variant={lead.stage === 'rejected' ? 'destructive' : lead.stage === 'not_interested' ? 'secondary' : 'outline'} className="text-xs capitalize">
                                                    {lead.stage?.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Badge variant={timesAssigned > 2 ? 'destructive' : timesAssigned > 1 ? 'warning' : 'secondary'} className="font-mono">
                                                        {timesAssigned}x
                                                    </Badge>
                                                    {history.length > 0 && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedLead(lead); setShowHistoryModal(true); }}>
                                                            <History className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {lastRejection ? (
                                                    <div className="text-xs">
                                                        <p className="font-medium text-red-500">{lastRejection.agent_name}</p>
                                                        <p className="text-muted-foreground">{lastRejection.team_name || '-'}</p>
                                                    </div>
                                                ) : <span className="text-xs text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell><span className="text-xs text-muted-foreground">{formatDate(lead.created_at)}</span></TableCell>
                                            <TableCell className="text-right">
                                                {canManage && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => handleAssign(lead.id, null)} title="Round Robin" data-testid={`rr-assign-${lead.id}`}>
                                                            <Shuffle className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedLead(lead); setSelectedAgent(''); setShowAssignModal(true); }} title="Manual Assign">
                                                            <UserPlus className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Manual Assign Modal */}
            <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Lead</DialogTitle>
                        <DialogDescription>Assign {selectedLead?.full_name} to a sales agent</DialogDescription>
                    </DialogHeader>
                    {selectedLead?.assignment_history?.length > 0 && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <p className="text-xs font-medium text-amber-500 mb-1">Previous Assignments ({selectedLead.assignment_history.length})</p>
                            {selectedLead.assignment_history.map((h, i) => (
                                <p key={i} className="text-xs text-muted-foreground">{h.agent_name} ({h.team_name || 'No team'}) — {h.action?.replace(/_/g, ' ')} — {formatDate(h.date)}</p>
                            ))}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Agent</label>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger data-testid="assign-agent-select"><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                            <SelectContent>
                                {agents.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.full_name} {a.team_name ? `(${a.team_name})` : ''} {a.region ? `— ${a.region}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                        <Button onClick={() => handleAssign(selectedLead?.id, selectedAgent)} disabled={!selectedAgent || assigning}>{assigning ? 'Assigning...' : 'Assign Lead'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Assign Modal */}
            <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bulk Assign {selectedLeads.size} Leads</DialogTitle>
                        <DialogDescription>All selected leads will be assigned to one agent</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Agent</label>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger data-testid="bulk-assign-agent"><SelectValue placeholder="Choose an agent" /></SelectTrigger>
                            <SelectContent>
                                {agents.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.full_name} {a.team_name ? `(${a.team_name})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkAssignModal(false)}>Cancel</Button>
                        <Button onClick={handleBulkAssign} disabled={!selectedAgent || assigning}>{assigning ? 'Assigning...' : `Assign ${selectedLeads.size} Leads`}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assignment History Modal */}
            <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Assignment History — {selectedLead?.full_name}</DialogTitle>
                        <DialogDescription>Complete history of all assignments and rejections</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                        {(selectedLead?.assignment_history || []).length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No assignment history</p>
                        ) : (
                            [...(selectedLead?.assignment_history || [])].reverse().map((h, i) => (
                                <div key={i} className={`p-3 rounded-lg border ${h.action === 'rejected' || h.action === 'not_interested' ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{h.agent_name}</p>
                                            <p className="text-xs text-muted-foreground">{h.team_name || 'No team'}</p>
                                        </div>
                                        <Badge variant={h.action === 'rejected' || h.action === 'not_interested' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                                            {h.action?.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                    {h.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {h.reason}</p>}
                                    {h.assigned_by && <p className="text-xs text-muted-foreground mt-0.5">Assigned by: {h.assigned_by}</p>}
                                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(h.date)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LeadsPoolPage;

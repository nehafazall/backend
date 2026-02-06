import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Users,
    UserPlus,
    RefreshCw,
    Search,
    MoreVertical,
    Phone,
    Mail,
    MapPin,
    Clock,
    AlertTriangle,
    Shuffle,
} from 'lucide-react';

const LeadsPoolPage = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [poolRes, usersRes] = await Promise.all([
                apiClient.get('/leads/pool'),
                apiClient.get('/users?role=sales_executive'),
            ]);
            setLeads(poolRes.data);
            setAgents(usersRes.data.filter(u => u.is_active));
        } catch (error) {
            toast.error('Failed to fetch leads pool');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (leadId, agentId = null) => {
        try {
            setAssigning(true);
            const url = agentId 
                ? `/leads/pool/${leadId}/assign?user_id=${agentId}`
                : `/leads/pool/${leadId}/assign`;
            
            const res = await apiClient.post(url);
            toast.success(res.data.message);
            setShowAssignModal(false);
            setSelectedLead(null);
            setSelectedAgent('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to assign lead');
        } finally {
            setAssigning(false);
        }
    };

    const handleRoundRobinAssign = async (leadId) => {
        await handleAssign(leadId, null);
    };

    const openAssignModal = (lead) => {
        setSelectedLead(lead);
        setSelectedAgent('');
        setShowAssignModal(true);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredLeads = leads.filter(lead => 
        lead.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const canManage = ['super_admin', 'admin', 'sales_manager'].includes(user?.role);

    return (
        <div className="space-y-6" data-testid="leads-pool-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads Pool</h1>
                    <p className="text-muted-foreground">
                        Unassigned leads waiting for distribution
                    </p>
                </div>
                <Button onClick={fetchData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total in Pool</p>
                                <p className="text-3xl font-bold">{leads.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">SLA Breached</p>
                                <p className="text-3xl font-bold text-red-500">
                                    {leads.filter(l => l.sla_breach || l.sla_status === 'breach').length}
                                </p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Available Agents</p>
                                <p className="text-3xl font-bold text-emerald-500">{agents.length}</p>
                            </div>
                            <UserPlus className="h-8 w-8 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Unassigned Leads</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search leads..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lead</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Added</TableHead>
                                    <TableHead>SLA</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLeads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            No leads in pool
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLeads.map((lead) => (
                                        <TableRow key={lead.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{lead.full_name}</p>
                                                    {lead.country && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {lead.country}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="text-sm flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {lead.phone}
                                                    </p>
                                                    {lead.email && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {lead.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {lead.lead_source || 'Direct'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {lead.stage?.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(lead.created_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {lead.sla_breach || lead.sla_status === 'breach' ? (
                                                    <Badge className="bg-red-500">Breached</Badge>
                                                ) : lead.sla_status === 'warning' ? (
                                                    <Badge className="bg-yellow-500">Warning</Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-500">OK</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {canManage && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleRoundRobinAssign(lead.id)}>
                                                                <Shuffle className="h-4 w-4 mr-2" />
                                                                Auto-Assign (Round Robin)
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openAssignModal(lead)}>
                                                                <UserPlus className="h-4 w-4 mr-2" />
                                                                Manual Assign
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
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
                        <DialogDescription>
                            Assign {selectedLead?.full_name} to a sales executive
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Agent</label>
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose an agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                            {agent.full_name} ({agent.region || 'No region'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => handleAssign(selectedLead?.id, selectedAgent)}
                            disabled={!selectedAgent || assigning}
                        >
                            {assigning ? 'Assigning...' : 'Assign Lead'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LeadsPoolPage;

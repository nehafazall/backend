import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Users, Plus, Pencil, Trash2, UserPlus, Crown, RefreshCw, 
    Building2, ChevronRight, X
} from 'lucide-react';

const TeamsPage = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showLeaderModal, setShowLeaderModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [searchLeader, setSearchLeader] = useState('');
    const [searchMember, setSearchMember] = useState('');
    
    const [teamForm, setTeamForm] = useState({
        name: '',
        department: 'Sales',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamsRes, usersRes] = await Promise.all([
                api.get('/teams?active_only=false'),
                api.get('/users')
            ]);
            setTeams(teamsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamDetails = async (teamId) => {
        try {
            const response = await api.get(`/teams/${teamId}`);
            setSelectedTeam(response.data);
        } catch (error) {
            toast.error('Failed to load team details');
        }
    };

    const openCreateTeamModal = () => {
        setEditingTeam(null);
        setTeamForm({ name: '', department: 'sales', description: '' });
        setShowTeamModal(true);
    };

    const openEditTeamModal = (team) => {
        setEditingTeam(team);
        setTeamForm({
            name: team.name,
            department: team.department,
            description: team.description || ''
        });
        setShowTeamModal(true);
    };

    const handleSaveTeam = async (e) => {
        e.preventDefault();
        try {
            if (editingTeam) {
                await api.put(`/teams/${editingTeam.id}`, teamForm);
                toast.success('Team updated');
            } else {
                await api.post('/teams', teamForm);
                toast.success('Team created');
            }
            setShowTeamModal(false);
            fetchData();
            if (selectedTeam?.id === editingTeam?.id) {
                fetchTeamDetails(editingTeam.id);
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const handleDeleteTeam = async (teamId) => {
        if (!confirm('Are you sure you want to delete this team?')) return;
        try {
            await api.delete(`/teams/${teamId}`);
            toast.success('Team deleted');
            fetchData();
            if (selectedTeam?.id === teamId) {
                setSelectedTeam(null);
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete team');
        }
    };

    const handleSetLeader = async (userId) => {
        if (!selectedTeam) return;
        try {
            await api.put(`/teams/${selectedTeam.id}`, { leader_id: userId });
            toast.success('Team leader set');
            setShowLeaderModal(false);
            fetchTeamDetails(selectedTeam.id);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const handleAddMember = async (userId) => {
        if (!selectedTeam) return;
        try {
            await api.post(`/teams/${selectedTeam.id}/members`, { user_id: userId });
            toast.success('Member added');
            setShowMemberModal(false);
            fetchTeamDetails(selectedTeam.id);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!selectedTeam) return;
        if (!confirm('Remove this member from the team?')) return;
        try {
            await api.delete(`/teams/${selectedTeam.id}/members/${memberId}`);
            toast.success('Member removed');
            fetchTeamDetails(selectedTeam.id);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed');
        }
    };

    // Filter users who can be added to a team (not already in this team)
    const availableUsers = users.filter(u => 
        u.is_active !== false &&
        !selectedTeam?.members?.find(m => m.id === u.id)
    );

    // Filter for potential leaders — any active user can be a leader
    const potentialLeaders = users.filter(u => u.is_active !== false);

    const departments = ['Sales', 'Finance', 'Customer Service', 'Mentors/Academics', 'Operations', 'Marketing', 'HR', 'Quality Control'];

    return (
        <div className="space-y-6" data-testid="teams-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Teams Management</h1>
                    <p className="text-muted-foreground">Create and manage sales teams</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={openCreateTeamModal} data-testid="create-team-btn">
                        <Plus className="h-4 w-4 mr-2" />Create Team
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Teams List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Teams ({teams.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[500px]">
                            <div className="divide-y">
                                {teams.map((team) => (
                                    <div 
                                        key={team.id}
                                        className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                                            selectedTeam?.id === team.id ? 'bg-muted border-l-4 border-l-primary' : ''
                                        }`}
                                        onClick={() => fetchTeamDetails(team.id)}
                                        data-testid={`team-${team.id}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium">{team.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {team.leader_name || 'No leader'} • {team.member_count} members
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={team.active !== false ? 'default' : 'secondary'}>
                                                    {team.department}
                                                </Badge>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {teams.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>No teams yet</p>
                                        <p className="text-sm">Create your first team to get started</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Team Details */}
                <Card className="lg:col-span-2">
                    {selectedTeam ? (
                        <>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {selectedTeam.name}
                                            <Badge>{selectedTeam.department}</Badge>
                                        </CardTitle>
                                        <CardDescription>
                                            {selectedTeam.description || 'No description'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openEditTeamModal(selectedTeam)}>
                                            <Pencil className="h-4 w-4 mr-1" />Edit
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTeam(selectedTeam.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Team Leader Section */}
                                <div className="p-4 rounded-lg bg-muted/50 border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                                <Crown className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Team Leader</p>
                                                <p className="font-medium">
                                                    {selectedTeam.leader_name || 'Not assigned'}
                                                </p>
                                                {selectedTeam.leader_email && (
                                                    <p className="text-sm text-muted-foreground">{selectedTeam.leader_email}</p>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setShowLeaderModal(true)}>
                                            {selectedTeam.leader_id ? 'Change' : 'Assign'} Leader
                                        </Button>
                                    </div>
                                </div>

                                {/* Team Members */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold">Team Members ({selectedTeam.members?.length || 0})</h3>
                                        <Button size="sm" onClick={() => setShowMemberModal(true)}>
                                            <UserPlus className="h-4 w-4 mr-1" />Add Member
                                        </Button>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedTeam.members?.map((member) => (
                                                <TableRow key={member.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {member.full_name}
                                                            {member.id === selectedTeam.leader_id && (
                                                                <Crown className="h-4 w-4 text-amber-500" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{member.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{member.role}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            disabled={member.id === selectedTeam.leader_id}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!selectedTeam.members || selectedTeam.members.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                        No team members yet
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <CardContent className="h-[500px] flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">Select a team to view details</p>
                                <p className="text-sm">Or create a new team to get started</p>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Create/Edit Team Modal */}
            <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
                        <DialogDescription>
                            {editingTeam ? 'Update team details' : 'Add a new team to your organization'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveTeam} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Team Name</Label>
                            <Input 
                                value={teamForm.name}
                                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                placeholder="e.g., Alpha Team"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select value={teamForm.department} onValueChange={(v) => setTeamForm({ ...teamForm, department: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    {departments.map((d) => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Input 
                                value={teamForm.description}
                                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                                placeholder="Brief description"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowTeamModal(false)}>Cancel</Button>
                            <Button type="submit">{editingTeam ? 'Update' : 'Create'} Team</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Leader Modal */}
            <Dialog open={showLeaderModal} onOpenChange={(v) => { setShowLeaderModal(v); setSearchLeader(''); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Team Leader</DialogTitle>
                        <DialogDescription>Select an employee to be the team leader</DialogDescription>
                    </DialogHeader>
                    <Input 
                        placeholder="Search by name or email..."
                        value={searchLeader}
                        onChange={(e) => setSearchLeader(e.target.value)}
                        data-testid="search-leader-input"
                    />
                    <ScrollArea className="max-h-[400px]">
                        <div className="space-y-2">
                            {potentialLeaders
                                .filter(u => !searchLeader || 
                                    u.full_name?.toLowerCase().includes(searchLeader.toLowerCase()) ||
                                    u.email?.toLowerCase().includes(searchLeader.toLowerCase())
                                )
                                .map((u) => (
                                <div 
                                    key={u.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
                                    onClick={() => handleSetLeader(u.id)}
                                    data-testid={`leader-option-${u.id}`}
                                >
                                    <div>
                                        <p className="font-medium">{u.full_name}</p>
                                        <p className="text-sm text-muted-foreground">{u.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {u.department && <Badge variant="secondary" className="text-xs">{u.department}</Badge>}
                                        <Badge variant="outline">{u.role}</Badge>
                                    </div>
                                </div>
                            ))}
                            {potentialLeaders.filter(u => !searchLeader || 
                                u.full_name?.toLowerCase().includes(searchLeader.toLowerCase()) ||
                                u.email?.toLowerCase().includes(searchLeader.toLowerCase())
                            ).length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No users found</p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Add Member Modal */}
            <Dialog open={showMemberModal} onOpenChange={(v) => { setShowMemberModal(v); setSearchMember(''); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>Select an employee to add to this team</DialogDescription>
                    </DialogHeader>
                    <Input 
                        placeholder="Search by name or email..."
                        value={searchMember}
                        onChange={(e) => setSearchMember(e.target.value)}
                        data-testid="search-member-input"
                    />
                    <ScrollArea className="max-h-[400px]">
                        <div className="space-y-2">
                            {availableUsers
                                .filter(u => !searchMember || 
                                    u.full_name?.toLowerCase().includes(searchMember.toLowerCase()) ||
                                    u.email?.toLowerCase().includes(searchMember.toLowerCase())
                                )
                                .map((u) => (
                                <div 
                                    key={u.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
                                    onClick={() => handleAddMember(u.id)}
                                    data-testid={`member-option-${u.id}`}
                                >
                                    <div>
                                        <p className="font-medium">{u.full_name}</p>
                                        <p className="text-sm text-muted-foreground">{u.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {u.department && <Badge variant="secondary" className="text-xs">{u.department}</Badge>}
                                        <Badge variant="outline">{u.role}</Badge>
                                    </div>
                                </div>
                            ))}
                            {availableUsers.filter(u => !searchMember || 
                                u.full_name?.toLowerCase().includes(searchMember.toLowerCase()) ||
                                u.email?.toLowerCase().includes(searchMember.toLowerCase())
                            ).length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No available employees to add</p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeamsPage;

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient, useAuth } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Search, Phone, Mail, User, GraduationCap, Clock,
    Users, ArrowUp, ArrowDown, Database, UserCheck, Calendar, RefreshCw,
} from 'lucide-react';

const STAGES = [
    { id: 'new_student', label: 'New Student', color: 'bg-blue-500' },
    { id: 'activated', label: 'Activated', color: 'bg-emerald-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
    { id: 'satisfactory', label: 'Satisfactory', color: 'bg-green-500' },
    { id: 'pitched', label: 'Pitched', color: 'bg-orange-500' },
    { id: 'interested', label: 'Interested', color: 'bg-purple-500' },
    { id: 'upgraded', label: 'Upgraded', color: 'bg-indigo-500' },
    { id: 'not_interested', label: 'Not Interested', color: 'bg-red-500' },
    { id: 'do_not_disturb', label: 'DND', color: 'bg-gray-500' },
    { id: 'frozen', label: 'Frozen', color: 'bg-slate-400' },
];
const stageMap = Object.fromEntries(STAGES.map(s => [s.id, s]));

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const StudentDirectoryPage = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState('all');
    const [csFilter, setCsFilter] = useState('all');
    const [csAgents, setCsAgents] = useState([]);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selected, setSelected] = useState(null);
    const [reassigning, setReassigning] = useState(false);
    const pageSize = 50;

    useEffect(() => {
        loadAgents();
    }, []);

    useEffect(() => {
        loadStudents();
    }, [page, stageFilter, csFilter, sortBy, sortOrder]);

    const loadAgents = async () => {
        try {
            const res = await apiClient.get('/users?role=cs_agent');
            const agents = res.data?.items || (Array.isArray(res.data) ? res.data : []);
            // Include cs_agent AND cs_head roles
            setCsAgents(agents.filter(a => ['cs_agent', 'cs_head'].includes(a.role)));
        } catch { /* ignore */ }
    };

    const reassignAgent = async (studentId, agentId) => {
        const agent = csAgents.find(a => a.id === agentId);
        if (!agent) return;
        setReassigning(true);
        try {
            await apiClient.put(`/students/${studentId}`, {
                cs_agent_id: agent.id,
                cs_agent_name: agent.full_name || agent.name,
            });
            toast.success(`Reassigned to ${agent.full_name || agent.name}`);
            // Update local state immediately
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, cs_agent_id: agent.id, cs_agent_name: agent.full_name || agent.name } : s));
            if (selected?.id === studentId) {
                setSelected(prev => ({ ...prev, cs_agent_id: agent.id, cs_agent_name: agent.full_name || agent.name }));
            }
        } catch {
            toast.error('Failed to reassign');
        }
        setReassigning(false);
    };

    const loadStudents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder });
            if (search) params.set('search', search);
            if (stageFilter !== 'all') params.set('stage', stageFilter);
            if (csFilter !== 'all') params.set('cs_agent_id', csFilter);
            const res = await apiClient.get(`/students?${params}`);
            setStudents(res.data?.items || []);
            setTotal(res.data?.total || 0);
        } catch {
            toast.error('Failed to load students');
        }
        setLoading(false);
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setPage(1);
            loadStudents();
        }
    };

    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return null;
        return sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 inline ml-0.5" /> : <ArrowUp className="h-3 w-3 inline ml-0.5" />;
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-5" data-testid="student-directory-page">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Database className="h-7 w-7 text-primary" />
                    Student Directory
                </h1>
                <p className="text-muted-foreground">Complete database of all students — search, filter, and find any student instantly</p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3" data-testid="directory-filters">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search name, phone, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearch}
                        className="pl-10"
                        data-testid="directory-search"
                    />
                </div>
                <Button onClick={() => { setPage(1); loadStudents(); }} variant="secondary" data-testid="directory-search-btn">
                    Search
                </Button>
                <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px]" data-testid="directory-stage-filter">
                        <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        {STAGES.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={csFilter} onValueChange={(v) => { setCsFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[180px]" data-testid="directory-cs-filter">
                        <SelectValue placeholder="All CS Agents" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All CS Agents</SelectItem>
                        {csAgents.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.full_name || a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(search || stageFilter !== 'all' || csFilter !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStageFilter('all'); setCsFilter('all'); setPage(1); setTimeout(loadStudents, 50); }}>
                        Clear All
                    </Button>
                )}
                <div className="ml-auto text-sm text-muted-foreground" data-testid="directory-count">
                    <Users className="h-4 w-4 inline mr-1" />
                    {total.toLocaleString()} students
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden" data-testid="directory-table">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8">#</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('full_name')}>
                                    Name <SortIcon field="full_name" />
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Stage</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">CS Agent</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Course</th>
                                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                                    <Calendar className="h-3 w-3 inline mr-1" />Enrolled <SortIcon field="created_at" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {students.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No students found</td></tr>
                            ) : students.map((s, idx) => {
                                const stage = stageMap[s.stage];
                                return (
                                    <tr
                                        key={s.id}
                                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                                        onClick={() => setSelected(s)}
                                        data-testid={`dir-row-${s.id}`}
                                    >
                                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{(page - 1) * pageSize + idx + 1}</td>
                                        <td className="px-4 py-2.5 font-medium">{s.full_name}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone || '—'}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.email || '—'}</td>
                                        <td className="px-4 py-2.5">
                                            {stage && <Badge className={`${stage.color} text-white text-[10px]`}>{stage.label}</Badge>}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs">
                                            <Select
                                                value={s.cs_agent_id || ''}
                                                onValueChange={(val) => { reassignAgent(s.id, val); }}
                                            >
                                                <SelectTrigger
                                                    className="h-7 text-xs w-[150px] border-dashed"
                                                    onClick={(e) => e.stopPropagation()}
                                                    data-testid={`dir-reassign-${s.id}`}
                                                >
                                                    <span className="flex items-center gap-1 truncate">
                                                        <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        {s.cs_agent_name || 'Unassigned'}
                                                    </span>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {csAgents.map(a => (
                                                        <SelectItem key={a.id} value={a.id}>{a.full_name || a.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.course_level || s.current_course_name || s.package_bought || '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-xs">AED {(s.enrollment_amount || 0).toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(s.created_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages} ({total} total)
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {selected?.full_name}
                        </DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground text-xs">Phone</p>
                                    <p className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" />{selected.phone || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Email</p>
                                    <p className="font-medium flex items-center gap-1"><Mail className="h-3 w-3" />{selected.email || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Stage</p>
                                    {stageMap[selected.stage] && (
                                        <Badge className={`${stageMap[selected.stage].color} text-white text-xs`}>
                                            {stageMap[selected.stage].label}
                                        </Badge>
                                    )}
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">CS Agent</p>
                                    <Select
                                        value={selected.cs_agent_id || ''}
                                        onValueChange={(val) => reassignAgent(selected.id, val)}
                                        disabled={reassigning}
                                    >
                                        <SelectTrigger className="h-8 text-sm mt-1" data-testid="modal-reassign-cs">
                                            <span className="flex items-center gap-1">
                                                <RefreshCw className={`h-3 w-3 ${reassigning ? 'animate-spin' : ''}`} />
                                                {selected.cs_agent_name || 'Unassigned'}
                                            </span>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {csAgents.map(a => (
                                                <SelectItem key={a.id} value={a.id}>{a.full_name || a.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Course</p>
                                    <p className="font-medium flex items-center gap-1"><GraduationCap className="h-3 w-3" />{selected.course_level || selected.current_course_name || selected.package_bought || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Enrollment Amount</p>
                                    <p className="font-mono font-bold text-emerald-600">AED {(selected.enrollment_amount || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Enrolled On</p>
                                    <p className="font-medium flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(selected.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Mentor</p>
                                    <p className="font-medium">{selected.mentor_name || '—'}</p>
                                </div>
                                {selected.closed_date && (
                                    <div>
                                        <p className="text-muted-foreground text-xs">Closed Date</p>
                                        <p className="font-medium">{formatDate(selected.closed_date)}</p>
                                    </div>
                                )}
                                {selected.sales_person_name && (
                                    <div>
                                        <p className="text-muted-foreground text-xs">Sales Person</p>
                                        <p className="font-medium">{selected.sales_person_name}</p>
                                    </div>
                                )}
                                {selected.team_leader_name && (
                                    <div>
                                        <p className="text-muted-foreground text-xs">Team Leader</p>
                                        <p className="font-medium">{selected.team_leader_name}</p>
                                    </div>
                                )}
                            </div>
                            {selected.notes && (
                                <div>
                                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                                    <p className="text-sm bg-muted/50 rounded p-2 whitespace-pre-wrap">{selected.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StudentDirectoryPage;

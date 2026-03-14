import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Timer, Plus, Pencil, Trash2, AlertTriangle, Shield,
    Bell, Mail, ChevronDown, ChevronUp, Clock, Users,
} from 'lucide-react';

const DEPARTMENTS = ['Sales', 'Customer Service', 'HR', 'Mentor', 'Operations', 'Finance'];
const APPLIES_TO = [
    { value: 'leads', label: 'Leads' },
    { value: 'students', label: 'Students' },
    { value: 'leave_requests', label: 'Leave Requests' },
    { value: 'regularization_requests', label: 'Regularization Requests' },
    { value: 'employees', label: 'Employees' },
    { value: 'custom', label: 'Custom' },
];
const TRIGGER_CONDITIONS = [
    { value: 'no_first_contact', label: 'No First Contact' },
    { value: 'no_activity', label: 'No Activity / Inactive' },
    { value: 'pipeline_stale', label: 'Pipeline Stale' },
    { value: 'no_activation_call', label: 'No Activation Call' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'custom', label: 'Custom Condition' },
];
const ACTIONS = [
    { value: 'warning', label: 'Warning' },
    { value: 'breach', label: 'SLA Breach' },
    { value: 'notify_manager', label: 'Notify Manager / Escalate' },
    { value: 'reassign_to_pool', label: 'Reassign to Pool' },
    { value: 'notify_coo', label: 'Notify COO / CEO' },
    { value: 'custom', label: 'Custom Action' },
];
const NOTIFY_ROLES = [
    'sales_executive', 'team_leader', 'sales_manager',
    'cs_agent', 'cs_head', 'mentor', 'academic_master',
    'hr', 'finance', 'admin', 'super_admin',
];

const emptyLevel = { level: 1, name: '', time_threshold_hours: 1, action: 'warning', notify_in_app: true, notify_email: false, notify_roles: [] };
const emptyForm = { name: '', department: '', description: '', applies_to: '', trigger_condition: 'custom', config_key: '', is_active: true, levels: [{ ...emptyLevel }] };

const formatHours = (h) => {
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 24) return `${h} hr${h !== 1 ? 's' : ''}`;
    const d = Math.round(h / 24);
    return `${d} day${d !== 1 ? 's' : ''}`;
};

const actionColor = (a) => {
    if (a === 'warning') return 'bg-amber-500/20 text-amber-500';
    if (a === 'breach') return 'bg-red-500/20 text-red-500';
    if (a === 'reassign_to_pool') return 'bg-red-600/20 text-red-400';
    if (a === 'notify_manager' || a === 'notify_coo') return 'bg-blue-500/20 text-blue-500';
    return 'bg-muted text-muted-foreground';
};

const SLAManagementPage = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [submitting, setSubmitting] = useState(false);
    const [expandedRule, setExpandedRule] = useState(null);
    const [showDelete, setShowDelete] = useState(null);

    const fetchRules = useCallback(async () => {
        setLoading(true);
        try {
            const params = tab !== 'all' ? `?department=${tab}` : '';
            const res = await apiClient.get(`/sla/rules${params}`);
            setRules(res.data || []);
        } catch { toast.error('Failed to load SLA rules'); }
        setLoading(false);
    }, [tab]);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm, levels: [{ ...emptyLevel }] });
        setShowModal(true);
    };

    const openEdit = (rule) => {
        setEditingId(rule.id);
        setForm({
            name: rule.name, department: rule.department, description: rule.description,
            applies_to: rule.applies_to, trigger_condition: rule.trigger_condition,
            config_key: rule.config_key || '', is_active: rule.is_active,
            levels: rule.levels?.length ? rule.levels.map(l => ({ ...l })) : [{ ...emptyLevel }],
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name || !form.department || form.levels.length === 0) {
            toast.error('Name, Department, and at least one level are required'); return;
        }
        setSubmitting(true);
        try {
            const payload = { ...form, levels: form.levels.map((l, i) => ({ ...l, level: i + 1 })) };
            if (editingId) {
                await apiClient.put(`/sla/rules/${editingId}`, payload);
                toast.success('SLA rule updated');
            } else {
                await apiClient.post('/sla/rules', payload);
                toast.success('SLA rule created');
            }
            setShowModal(false);
            fetchRules();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
        setSubmitting(false);
    };

    const handleToggle = async (rule) => {
        try {
            await apiClient.patch(`/sla/rules/${rule.id}/toggle`);
            toast.success(`${rule.name} ${rule.is_active ? 'deactivated' : 'activated'}`);
            fetchRules();
        } catch { toast.error('Failed'); }
    };

    const handleDelete = async () => {
        if (!showDelete) return;
        try {
            await apiClient.delete(`/sla/rules/${showDelete.id}`);
            toast.success('SLA rule deleted');
            setShowDelete(null);
            fetchRules();
        } catch { toast.error('Failed'); }
    };

    const addLevel = () => setForm(f => ({ ...f, levels: [...f.levels, { ...emptyLevel, level: f.levels.length + 1 }] }));
    const removeLevel = (idx) => setForm(f => ({ ...f, levels: f.levels.filter((_, i) => i !== idx) }));
    const updateLevel = (idx, key, val) => setForm(f => {
        const levels = [...f.levels];
        levels[idx] = { ...levels[idx], [key]: val };
        return { ...f, levels };
    });
    const toggleLevelRole = (idx, role) => setForm(f => {
        const levels = [...f.levels];
        const roles = levels[idx].notify_roles || [];
        levels[idx] = { ...levels[idx], notify_roles: roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role] };
        return { ...f, levels };
    });

    const grouped = {};
    rules.forEach(r => { (grouped[r.department] = grouped[r.department] || []).push(r); });
    const activeCount = rules.filter(r => r.is_active).length;

    return (
        <div className="space-y-6" data-testid="sla-management-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Timer className="h-8 w-8 text-primary" /> SLA Management
                    </h1>
                    <p className="text-muted-foreground">Configure service level agreements across all departments</p>
                </div>
                <Button onClick={openCreate} data-testid="create-sla-btn">
                    <Plus className="h-4 w-4 mr-2" /> New SLA Rule
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Rules</p><p className="text-3xl font-bold">{rules.length}</p></div><Shield className="h-8 w-8 text-primary" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active</p><p className="text-3xl font-bold text-emerald-500">{activeCount}</p></div><Timer className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Inactive</p><p className="text-3xl font-bold text-amber-500">{rules.length - activeCount}</p></div><Clock className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Departments</p><p className="text-3xl font-bold">{Object.keys(grouped).length}</p></div><Users className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
            </div>

            {/* Department Tabs */}
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {DEPARTMENTS.map(d => <TabsTrigger key={d} value={d}>{d}</TabsTrigger>)}
                </TabsList>

                <TabsContent value={tab} className="mt-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" /></div>
                    ) : rules.length === 0 ? (
                        <Card><CardContent className="py-12 text-center text-muted-foreground">
                            <Timer className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>No SLA rules {tab !== 'all' ? `for ${tab}` : 'configured'}</p>
                            <Button variant="outline" className="mt-4" onClick={openCreate}>Create First Rule</Button>
                        </CardContent></Card>
                    ) : (
                        <div className="space-y-3">
                            {rules.map(rule => (
                                <Card key={rule.id} className={`transition-all ${!rule.is_active ? 'opacity-60' : ''}`} data-testid={`sla-rule-${rule.id}`}>
                                    <CardContent className="pt-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold text-base">{rule.name}</h3>
                                                    <Badge variant="outline" className="text-xs">{rule.department}</Badge>
                                                    <Badge variant="secondary" className="text-xs">{rule.applies_to}</Badge>
                                                    {rule.is_active
                                                        ? <Badge className="bg-emerald-500/20 text-emerald-500 text-xs">Active</Badge>
                                                        : <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                    {rule.levels?.map((lvl, i) => (
                                                        <span key={i} className={`text-xs px-2 py-1 rounded-full ${actionColor(lvl.action)}`}>
                                                            L{lvl.level}: {lvl.name || lvl.action} @ {formatHours(lvl.time_threshold_hours)}
                                                            {lvl.notify_email && <Mail className="inline h-3 w-3 ml-1" />}
                                                            {lvl.notify_in_app && <Bell className="inline h-3 w-3 ml-1" />}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Switch checked={rule.is_active} onCheckedChange={() => handleToggle(rule)} data-testid={`sla-toggle-${rule.id}`} />
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setShowDelete(rule)}><Trash2 className="h-4 w-4" /></Button>
                                                {expandedRule === rule.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                            </div>
                                        </div>

                                        {expandedRule === rule.id && (
                                            <div className="mt-4 border-t pt-4">
                                                <h4 className="text-sm font-medium mb-2">Escalation Levels</h4>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Level</TableHead>
                                                            <TableHead>Name</TableHead>
                                                            <TableHead>Threshold</TableHead>
                                                            <TableHead>Action</TableHead>
                                                            <TableHead>In-App</TableHead>
                                                            <TableHead>Email</TableHead>
                                                            <TableHead>Notify Roles</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {rule.levels?.map((lvl, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell><Badge variant="outline">L{lvl.level}</Badge></TableCell>
                                                                <TableCell className="font-medium">{lvl.name}</TableCell>
                                                                <TableCell>{formatHours(lvl.time_threshold_hours)}</TableCell>
                                                                <TableCell><Badge className={actionColor(lvl.action)}>{ACTIONS.find(a => a.value === lvl.action)?.label || lvl.action}</Badge></TableCell>
                                                                <TableCell>{lvl.notify_in_app ? <Bell className="h-4 w-4 text-blue-500" /> : '-'}</TableCell>
                                                                <TableCell>{lvl.notify_email ? <Mail className="h-4 w-4 text-emerald-500" /> : '-'}</TableCell>
                                                                <TableCell className="text-xs text-muted-foreground">{lvl.notify_roles?.join(', ') || '-'}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create / Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit SLA Rule' : 'Create New SLA Rule'}</DialogTitle>
                        <DialogDescription>Configure the SLA rule with escalation levels</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">SLA Name *</label>
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., New Lead First Contact" data-testid="sla-name" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Department *</label>
                                <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                                    <SelectTrigger data-testid="sla-department"><SelectValue placeholder="Select department" /></SelectTrigger>
                                    <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Description</label>
                            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this SLA enforce?" className="min-h-[60px]" data-testid="sla-description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Applies To</label>
                                <Select value={form.applies_to} onValueChange={v => setForm({ ...form, applies_to: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                                    <SelectContent>{APPLIES_TO.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Trigger Condition</label>
                                <Select value={form.trigger_condition} onValueChange={v => setForm({ ...form, trigger_condition: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                                    <SelectContent>{TRIGGER_CONDITIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Escalation Levels */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium">Escalation Levels *</label>
                                <Button variant="outline" size="sm" onClick={addLevel}><Plus className="h-3 w-3 mr-1" /> Add Level</Button>
                            </div>
                            <div className="space-y-3">
                                {form.levels.map((lvl, idx) => (
                                    <Card key={idx} className="border-dashed">
                                        <CardContent className="pt-3 pb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline">Level {idx + 1}</Badge>
                                                {form.levels.length > 1 && <Button variant="ghost" size="sm" className="text-red-500 h-6" onClick={() => removeLevel(idx)}><Trash2 className="h-3 w-3" /></Button>}
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs text-muted-foreground">Level Name</label>
                                                    <Input value={lvl.name} onChange={e => updateLevel(idx, 'name', e.target.value)} placeholder="e.g., Warning" className="h-8 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-muted-foreground">Time Threshold (hours)</label>
                                                    <Input type="number" step="0.25" min="0.1" value={lvl.time_threshold_hours} onChange={e => updateLevel(idx, 'time_threshold_hours', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                                                    <span className="text-[10px] text-muted-foreground">{formatHours(lvl.time_threshold_hours)}</span>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-muted-foreground">Action</label>
                                                    <Select value={lvl.action} onValueChange={v => updateLevel(idx, 'action', v)}>
                                                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                                        <SelectContent>{ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2">
                                                <label className="flex items-center gap-2 text-xs">
                                                    <Switch checked={lvl.notify_in_app} onCheckedChange={v => updateLevel(idx, 'notify_in_app', v)} className="scale-75" />
                                                    <Bell className="h-3 w-3" /> In-App
                                                </label>
                                                <label className="flex items-center gap-2 text-xs">
                                                    <Switch checked={lvl.notify_email} onCheckedChange={v => updateLevel(idx, 'notify_email', v)} className="scale-75" />
                                                    <Mail className="h-3 w-3" /> Email
                                                </label>
                                            </div>
                                            <div className="mt-2">
                                                <label className="text-xs text-muted-foreground">Notify Roles</label>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {NOTIFY_ROLES.map(role => (
                                                        <button key={role} type="button"
                                                            onClick={() => toggleLevelRole(idx, role)}
                                                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${lvl.notify_roles?.includes(role) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'}`}
                                                        >
                                                            {role.replace(/_/g, ' ')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : editingId ? 'Update Rule' : 'Create Rule'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Delete SLA Rule</DialogTitle>
                        <DialogDescription>Are you sure you want to delete "{showDelete?.name}"? This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SLAManagementPage;

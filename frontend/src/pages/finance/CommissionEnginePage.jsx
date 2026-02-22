import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calculator, Users, TrendingUp, RefreshCw, Settings, Plus, Pencil, Trash2, Percent, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const ROLES = [
    { value: 'sales_executive', label: 'Sales Executive' },
    { value: 'team_leader', label: 'Team Leader' },
    { value: 'sales_manager', label: 'Sales Manager' },
    { value: 'cs_agent', label: 'CS Agent' },
    { value: 'mentor', label: 'Mentor' },
];

const COMMISSION_TYPES = [
    { value: 'percentage', label: 'Percentage of Sale' },
    { value: 'fixed', label: 'Fixed Amount' },
];

const CommissionEnginePage = () => {
    const [activeTab, setActiveTab] = useState('commissions');
    const [commissions, setCommissions] = useState([]);
    const [rules, setRules] = useState([]);
    const [courses, setCourses] = useState([]);
    const [stats, setStats] = useState({ totalPending: 0, totalPaid: 0, agentCount: 0 });
    const [loading, setLoading] = useState(true);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    
    const [ruleForm, setRuleForm] = useState({
        name: '',
        role: '',
        commission_type: 'percentage',
        commission_value: 0,
        course_id: '',
        course_category: '',
        min_sale_amount: 0,
        max_sale_amount: '',
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [commissionsRes, rulesRes, coursesRes] = await Promise.all([
                api.get('/commissions?limit=50'),
                api.get('/commission-rules'),
                api.get('/courses')
            ]);
            
            const commissionsData = commissionsRes.data || [];
            setCommissions(commissionsData);
            setRules(rulesRes.data || []);
            setCourses(coursesRes.data || []);
            
            // Calculate stats
            const pending = commissionsData.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || c.commission_amount || 0), 0);
            const paid = commissionsData.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.amount || c.commission_amount || 0), 0);
            const agents = new Set(commissionsData.map(c => c.user_id)).size;
            setStats({ totalPending: pending, totalPaid: paid, agentCount: agents });
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateRuleModal = () => {
        setEditingRule(null);
        setRuleForm({
            name: '',
            role: '',
            commission_type: 'percentage',
            commission_value: 0,
            course_id: '',
            course_category: '',
            min_sale_amount: 0,
            max_sale_amount: '',
            is_active: true
        });
        setShowRuleModal(true);
    };

    const openEditRuleModal = (rule) => {
        setEditingRule(rule);
        setRuleForm({
            name: rule.name,
            role: rule.role,
            commission_type: rule.commission_type,
            commission_value: rule.commission_value,
            course_id: rule.course_id || '',
            course_category: rule.course_category || '',
            min_sale_amount: rule.min_sale_amount || 0,
            max_sale_amount: rule.max_sale_amount || '',
            is_active: rule.is_active !== false
        });
        setShowRuleModal(true);
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...ruleForm,
                commission_value: parseFloat(ruleForm.commission_value),
                min_sale_amount: parseFloat(ruleForm.min_sale_amount) || 0,
                max_sale_amount: ruleForm.max_sale_amount ? parseFloat(ruleForm.max_sale_amount) : null,
                course_id: ruleForm.course_id || null,
                course_category: ruleForm.course_category || null
            };
            
            if (editingRule) {
                await api.put(`/commission-rules/${editingRule.id}`, payload);
                toast.success('Commission rule updated');
            } else {
                await api.post('/commission-rules', payload);
                toast.success('Commission rule created');
            }
            setShowRuleModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save rule');
        }
    };

    const handleDeleteRule = async (ruleId) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            await api.delete(`/commission-rules/${ruleId}`);
            toast.success('Rule deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete rule');
        }
    };

    const toggleRuleActive = async (rule) => {
        try {
            await api.put(`/commission-rules/${rule.id}`, { is_active: !rule.is_active });
            toast.success(`Rule ${rule.is_active ? 'disabled' : 'enabled'}`);
            fetchData();
        } catch (error) {
            toast.error('Failed to update rule');
        }
    };

    return (
        <div className="space-y-6" data-testid="commission-engine-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Commission Engine</h1>
                    <p className="text-muted-foreground">Sales commission calculation and tracking</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                <Calculator className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</p>
                                <p className="text-sm text-muted-foreground">Pending Commissions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</p>
                                <p className="text-sm text-muted-foreground">Paid This Month</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.agentCount}</p>
                                <p className="text-sm text-muted-foreground">Active Agents</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="commissions">Commissions</TabsTrigger>
                    <TabsTrigger value="rules">Commission Rules</TabsTrigger>
                </TabsList>

                <TabsContent value="commissions" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Commissions</CardTitle>
                            <CardDescription>Auto-calculated from enrolled sales</CardDescription>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Sale Type</TableHead>
                                    <TableHead className="text-right">Sale Amount</TableHead>
                                    <TableHead className="text-right">Commission</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {commissions.map((comm) => (
                                    <TableRow key={comm.id}>
                                        <TableCell>{formatDate(comm.created_at)}</TableCell>
                                        <TableCell className="font-medium">{comm.user_name || comm.user_id}</TableCell>
                                        <TableCell><Badge variant="outline">{comm.sale_type || comm.commission_type || 'Fresh Sale'}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(comm.sale_amount)}</TableCell>
                                        <TableCell className="text-right font-mono font-medium text-green-600">{formatCurrency(comm.amount || comm.commission_amount)}</TableCell>
                                        <TableCell>
                                            <Badge variant={comm.status === 'paid' ? 'default' : 'secondary'}>
                                                {comm.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {commissions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            No commissions calculated yet. Commissions are auto-generated when sales are enrolled.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="rules" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Commission Rules</CardTitle>
                                    <CardDescription>Configure how commissions are calculated for each role</CardDescription>
                                </div>
                                <Button onClick={openCreateRuleModal} data-testid="create-rule-btn">
                                    <Plus className="h-4 w-4 mr-2" />Add Rule
                                </Button>
                            </div>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rule Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead>Course Filter</TableHead>
                                    <TableHead>Sale Range</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell className="font-medium">{rule.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{ROLES.find(r => r.value === rule.role)?.label || rule.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {rule.commission_type === 'percentage' ? (
                                                <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> Percentage</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Fixed</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {rule.commission_type === 'percentage' 
                                                ? `${rule.commission_value}%` 
                                                : formatCurrency(rule.commission_value)}
                                        </TableCell>
                                        <TableCell>
                                            {rule.course_name || rule.course_category || 'All Courses'}
                                        </TableCell>
                                        <TableCell>
                                            {rule.min_sale_amount > 0 || rule.max_sale_amount ? (
                                                <span className="text-xs">
                                                    {formatCurrency(rule.min_sale_amount || 0)} - {rule.max_sale_amount ? formatCurrency(rule.max_sale_amount) : '∞'}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">Any</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Switch 
                                                checked={rule.is_active !== false}
                                                onCheckedChange={() => toggleRuleActive(rule)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEditRuleModal(rule)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {rules.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                            No commission rules defined yet. Add rules to auto-calculate commissions.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Rule Modal */}
            <Dialog open={showRuleModal} onOpenChange={setShowRuleModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? 'Edit Commission Rule' : 'Create Commission Rule'}</DialogTitle>
                        <DialogDescription>
                            Configure how commissions are calculated for specific roles and products
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveRule} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Rule Name *</Label>
                            <Input 
                                value={ruleForm.name}
                                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                                placeholder="e.g., Sales Executive - Basic Package"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select value={ruleForm.role} onValueChange={(v) => setRuleForm({ ...ruleForm, role: v })} required>
                                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {ROLES.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Commission Type *</Label>
                                <Select value={ruleForm.commission_type} onValueChange={(v) => setRuleForm({ ...ruleForm, commission_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {COMMISSION_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Commission Value * {ruleForm.commission_type === 'percentage' ? '(%)' : '(AED)'}</Label>
                            <Input 
                                type="number"
                                step={ruleForm.commission_type === 'percentage' ? '0.1' : '1'}
                                min="0"
                                value={ruleForm.commission_value}
                                onChange={(e) => setRuleForm({ ...ruleForm, commission_value: e.target.value })}
                                placeholder={ruleForm.commission_type === 'percentage' ? 'e.g., 5' : 'e.g., 500'}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Course (Optional)</Label>
                            <Select value={ruleForm.course_id} onValueChange={(v) => setRuleForm({ ...ruleForm, course_id: v === 'all' ? '' : v })}>
                                <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <SelectItem value="all">All Courses</SelectItem>
                                    {courses.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Min Sale Amount (AED)</Label>
                                <Input 
                                    type="number"
                                    min="0"
                                    value={ruleForm.min_sale_amount}
                                    onChange={(e) => setRuleForm({ ...ruleForm, min_sale_amount: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Sale Amount (AED)</Label>
                                <Input 
                                    type="number"
                                    min="0"
                                    value={ruleForm.max_sale_amount}
                                    onChange={(e) => setRuleForm({ ...ruleForm, max_sale_amount: e.target.value })}
                                    placeholder="No limit"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch 
                                checked={ruleForm.is_active}
                                onCheckedChange={(v) => setRuleForm({ ...ruleForm, is_active: v })}
                            />
                            <Label>Rule is Active</Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowRuleModal(false)}>Cancel</Button>
                            <Button type="submit">{editingRule ? 'Update' : 'Create'} Rule</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CommissionEnginePage;

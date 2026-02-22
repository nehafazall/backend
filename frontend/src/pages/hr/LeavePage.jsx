import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, RefreshCw, Check, X, Clock, CalendarDays, Users } from 'lucide-react';

const LEAVE_TYPES = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'emergency', label: 'Emergency Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
];

const STATUS_COLORS = {
    pending: 'bg-amber-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    cancelled: 'bg-slate-500',
};

const LeavePage = () => {
    const [leaves, setLeaves] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [filterStatus, setFilterStatus] = useState('');
    
    const [formData, setFormData] = useState({
        employee_id: '',
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        half_day: false,
        reason: '',
        contact_during_leave: '',
        handover_to: ''
    });

    useEffect(() => {
        fetchData();
    }, [filterStatus]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [leavesRes, pendingRes] = await Promise.all([
                api.get(`/hr/leave-requests${filterStatus ? `?status=${filterStatus}` : ''}`),
                api.get('/hr/leave-requests?pending_approval=true')
            ]);
            setLeaves(leavesRes.data || []);
            setPendingApprovals(pendingRes.data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLeave = async () => {
        try {
            if (!formData.start_date || !formData.end_date || !formData.reason) {
                toast.error('Please fill all required fields');
                return;
            }
            await api.post('/hr/leave-requests', formData);
            toast.success('Leave request submitted');
            setShowCreateModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to submit leave request');
        }
    };

    const handleApprove = async (requestId, action) => {
        try {
            await api.put(`/hr/leave-requests/${requestId}/approve`, { action, comments: '' });
            toast.success(`Leave request ${action}d`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Action failed');
        }
    };

    const resetForm = () => {
        setFormData({
            employee_id: '',
            leave_type: 'annual',
            start_date: '',
            end_date: '',
            half_day: false,
            reason: '',
            contact_during_leave: '',
            handover_to: ''
        });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="space-y-6" data-testid="leave-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
                    <p className="text-muted-foreground">Manage leave requests and approvals</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)} data-testid="new-leave-btn">
                        <Plus className="h-4 w-4 mr-2" />New Request
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{pendingApprovals.length}</p>
                                <p className="text-sm text-muted-foreground">Pending Approval</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30">
                                <Check className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {leaves.filter(l => l.status === 'approved').length}
                                </p>
                                <p className="text-sm text-muted-foreground">Approved</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                <CalendarDays className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {leaves.reduce((sum, l) => sum + (l.leave_days || 0), 0)}
                                </p>
                                <p className="text-sm text-muted-foreground">Total Days</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30">
                                <X className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {leaves.filter(l => l.status === 'rejected').length}
                                </p>
                                <p className="text-sm text-muted-foreground">Rejected</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">All Requests</TabsTrigger>
                    <TabsTrigger value="pending">Pending Approval ({pendingApprovals.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Leave Requests</CardTitle>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Requested</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaves.map((leave) => (
                                    <TableRow key={leave.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{leave.employee_name}</p>
                                                <p className="text-xs text-muted-foreground">{leave.employee_code}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="capitalize">{leave.leave_type}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>{formatDate(leave.start_date)}</p>
                                                <p className="text-muted-foreground">to {formatDate(leave.end_date)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{leave.leave_days} {leave.half_day && '(Half)'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{leave.reason}</TableCell>
                                        <TableCell>
                                            <Badge className={`${STATUS_COLORS[leave.status]} text-white`}>
                                                {leave.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(leave.created_at)}</TableCell>
                                    </TableRow>
                                ))}
                                {leaves.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No leave requests found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="pending" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Approvals</CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingApprovals.map((leave) => (
                                    <TableRow key={leave.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{leave.employee_name}</p>
                                                <p className="text-xs text-muted-foreground">{leave.employee_code}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{leave.department}</TableCell>
                                        <TableCell className="capitalize">{leave.leave_type}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>{formatDate(leave.start_date)}</p>
                                                <p className="text-muted-foreground">to {formatDate(leave.end_date)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{leave.leave_days}</TableCell>
                                        <TableCell className="max-w-[150px] truncate">{leave.reason}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{leave.current_approver_level}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="text-green-600"
                                                    onClick={() => handleApprove(leave.id, 'approve')}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="text-red-600"
                                                    onClick={() => handleApprove(leave.id, 'reject')}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {pendingApprovals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No pending approvals
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Leave Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Leave Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Leave Type</Label>
                            <Select value={formData.leave_type} onValueChange={(v) => setFormData({...formData, leave_type: v})}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LEAVE_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input 
                                    type="date" 
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input 
                                    type="date" 
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="half_day"
                                checked={formData.half_day}
                                onChange={(e) => setFormData({...formData, half_day: e.target.checked})}
                            />
                            <Label htmlFor="half_day">Half Day</Label>
                        </div>
                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Textarea 
                                placeholder="Enter reason for leave"
                                value={formData.reason}
                                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Contact During Leave (Optional)</Label>
                            <Input 
                                placeholder="Phone number"
                                value={formData.contact_during_leave}
                                onChange={(e) => setFormData({...formData, contact_during_leave: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateLeave}>Submit Request</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default LeavePage;

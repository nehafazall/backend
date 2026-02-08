import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield, Search, RefreshCw, User, LogIn, LogOut, Edit, Trash2, Plus, Eye, Key, Download, Upload, Activity, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');
    const [dateRange, setDateRange] = useState('7');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = { limit: 200 };
            if (searchQuery) params.search = searchQuery;
            if (actionFilter !== 'all') params.action = actionFilter;
            if (entityFilter !== 'all') params.entity_type = entityFilter;
            const response = await api.get('/audit-logs', { params });
            setLogs(response.data.logs || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await api.get('/audit-logs/summary', { params: { days: parseInt(dateRange) } });
            setSummary(response.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchSummary();
    }, [actionFilter, entityFilter, dateRange]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getActionIcon = (action) => {
        const icons = { login: LogIn, logout: LogOut, login_failed: XCircle, create: Plus, update: Edit, delete: Trash2, access_change: Key, view: Eye, export: Download, bulk_import: Upload };
        const Icon = icons[action] || Activity;
        const colors = { login: 'text-green-500', logout: 'text-gray-500', login_failed: 'text-red-500', create: 'text-blue-500', update: 'text-yellow-500', delete: 'text-red-500', access_change: 'text-purple-500' };
        return <Icon className={`h-4 w-4 ${colors[action] || 'text-gray-500'}`} />;
    };

    const getActionBadgeClass = (action) => {
        const classes = { login: 'bg-green-500/10 text-green-600', logout: 'bg-gray-500/10 text-gray-600', login_failed: 'bg-red-500/10 text-red-600', create: 'bg-blue-500/10 text-blue-600', update: 'bg-yellow-500/10 text-yellow-600', delete: 'bg-red-500/10 text-red-600', access_change: 'bg-purple-500/10 text-purple-600' };
        return classes[action] || 'bg-gray-500/10 text-gray-600';
    };

    return (
        <div className="p-6 space-y-6" data-testid="audit-log-page">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">Audit Log</h1>
                        <p className="text-muted-foreground">Track all system activities and changes</p>
                    </div>
                </div>
                <Button onClick={() => { fetchLogs(); fetchSummary(); }} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="logs" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="logs">Activity Log</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="logins">Login Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <Label className="text-xs">Search</Label>
                                    <div className="flex gap-2">
                                        <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchLogs()} />
                                        <Button onClick={fetchLogs} variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="w-40">
                                    <Label className="text-xs">Action</Label>
                                    <Select value={actionFilter} onValueChange={setActionFilter}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Actions</SelectItem>
                                            <SelectItem value="login">Login</SelectItem>
                                            <SelectItem value="login_failed">Login Failed</SelectItem>
                                            <SelectItem value="create">Create</SelectItem>
                                            <SelectItem value="update">Update</SelectItem>
                                            <SelectItem value="delete">Delete</SelectItem>
                                            <SelectItem value="access_change">Access Change</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-40">
                                    <Label className="text-xs">Entity</Label>
                                    <Select value={entityFilter} onValueChange={setEntityFilter}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="auth">Authentication</SelectItem>
                                            <SelectItem value="user">Users</SelectItem>
                                            <SelectItem value="lead">Leads</SelectItem>
                                            <SelectItem value="student">Students</SelectItem>
                                            <SelectItem value="access_control">Access Control</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>Showing latest {logs.length} activities</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8 text-muted-foreground">Loading...</div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No activities found</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[180px]">Timestamp</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Entity</TableHead>
                                            <TableHead>Target</TableHead>
                                            <TableHead className="w-[80px]">Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedLog(log); setShowDetailModal(true); }}>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(log.timestamp)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium">{log.user_name}</p>
                                                    <p className="text-xs text-muted-foreground">{log.user_role}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getActionIcon(log.action)}
                                                        <Badge className={getActionBadgeClass(log.action)}>{log.action}</Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="capitalize">{log.entity_type}</TableCell>
                                                <TableCell className="text-sm">{log.entity_name || log.entity_id || '-'}</TableCell>
                                                <TableCell><Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="summary" className="space-y-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <Label>Time Period:</Label>
                                <Select value={dateRange} onValueChange={setDateRange}>
                                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Last 24 hours</SelectItem>
                                        <SelectItem value="7">Last 7 days</SelectItem>
                                        <SelectItem value="30">Last 30 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <Activity className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Actions</p>
                                            <p className="text-2xl font-bold">{summary.total_actions}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <LogIn className="h-5 w-5 text-green-500" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Logins</p>
                                            <p className="text-2xl font-bold">{summary.actions_by_type?.login || 0}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <Edit className="h-5 w-5 text-yellow-500" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Updates</p>
                                            <p className="text-2xl font-bold">{summary.actions_by_type?.update || 0}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <Key className="h-5 w-5 text-purple-500" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Access Changes</p>
                                            <p className="text-2xl font-bold">{summary.actions_by_type?.access_change || 0}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {summary?.most_active_users && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Most Active Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {summary.most_active_users.map((user, index) => (
                                        <div key={user.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                                                <User className="h-5 w-5" />
                                                <span className="font-medium">{user.user_name}</span>
                                            </div>
                                            <Badge variant="secondary">{user.actions} actions</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="logins" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LogIn className="h-5 w-5 text-green-500" />
                                Login Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {summary?.recent_login_activity?.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summary.recent_login_activity.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                                                <TableCell>
                                                    <p className="font-medium">{log.user_name}</p>
                                                    <p className="text-xs text-muted-foreground">{log.user_email}</p>
                                                </TableCell>
                                                <TableCell className="capitalize">{log.user_role}</TableCell>
                                                <TableCell>
                                                    {log.action === 'login' && <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>}
                                                    {log.action === 'logout' && <Badge className="bg-gray-500/10 text-gray-600"><LogOut className="h-3 w-3 mr-1" />Logged Out</Badge>}
                                                    {log.action === 'login_failed' && <Badge className="bg-red-500/10 text-red-600"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">No login activity found</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Activity Details</DialogTitle>
                        <DialogDescription>Full details of this activity</DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-muted-foreground">Timestamp</Label><p className="font-medium">{formatDate(selectedLog.timestamp)}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Action</Label><p className="capitalize">{selectedLog.action}</p></div>
                                <div><Label className="text-xs text-muted-foreground">User</Label><p className="font-medium">{selectedLog.user_name}</p><p className="text-xs text-muted-foreground">{selectedLog.user_email}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Role</Label><p className="capitalize">{selectedLog.user_role}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Entity Type</Label><p className="capitalize">{selectedLog.entity_type}</p></div>
                                <div><Label className="text-xs text-muted-foreground">Entity</Label><p>{selectedLog.entity_name || selectedLog.entity_id || '-'}</p></div>
                            </div>
                            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                                <div><Label className="text-xs text-muted-foreground">Details</Label><pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">{JSON.stringify(selectedLog.details, null, 2)}</pre></div>
                            )}
                            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                                <div><Label className="text-xs text-muted-foreground">Changes Made</Label><pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">{JSON.stringify(selectedLog.changes, null, 2)}</pre></div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AuditLogPage;

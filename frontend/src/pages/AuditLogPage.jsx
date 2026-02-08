import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Shield,
    Search,
    Filter,
    RefreshCw,
    User,
    LogIn,
    LogOut,
    Edit,
    Trash2,
    Plus,
    Eye,
    Key,
    Download,
    Upload,
    Activity,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ChevronRight,
    Users,
    FileText,
    Settings,
} from 'lucide-react';

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    
    // Filters
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
            const response = await api.get('/audit-logs/summary', { 
                params: { days: parseInt(dateRange) } 
            });
            setSummary(response.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchSummary();
    }, [actionFilter, entityFilter, dateRange]);

    const handleSearch = () => {
        fetchLogs();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'login': return <LogIn className="h-4 w-4 text-green-500" />;
            case 'logout': return <LogOut className="h-4 w-4 text-gray-500" />;
            case 'login_failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'create': return <Plus className="h-4 w-4 text-blue-500" />;
            case 'update': return <Edit className="h-4 w-4 text-yellow-500" />;
            case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
            case 'access_change': return <Key className="h-4 w-4 text-purple-500" />;
            case 'view': return <Eye className="h-4 w-4 text-gray-500" />;
            case 'export': return <Download className="h-4 w-4 text-cyan-500" />;
            case 'bulk_import': return <Upload className="h-4 w-4 text-orange-500" />;
            default: return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    const getActionBadge = (action) => {
        const colors = {
            login: 'bg-green-500/10 text-green-600 border-green-500/30',
            logout: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
            login_failed: 'bg-red-500/10 text-red-600 border-red-500/30',
            create: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
            update: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
            delete: 'bg-red-500/10 text-red-600 border-red-500/30',
            access_change: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
            view: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
            export: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
            bulk_import: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
        };
        return <Badge className={colors[action] || 'bg-gray-500/10 text-gray-600'}>{action}</Badge>;
    };

    const getEntityIcon = (entityType) => {
        switch (entityType) {
            case 'user': return <User className="h-4 w-4" />;
            case 'lead': return <FileText className="h-4 w-4" />;
            case 'student': return <Users className="h-4 w-4" />;
            case 'access_control': return <Key className="h-4 w-4" />;
            case 'auth': return <Shield className="h-4 w-4" />;
            case 'settings': return <Settings className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

    const openDetail = (log) => {
        setSelectedLog(log);
        setShowDetailModal(true);
    };

    return (
        <div className="p-6 space-y-6" data-testid="audit-log-page">
            {/* Header */}
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
                    <TabsTrigger value="access">Access Changes</TabsTrigger>
                    <TabsTrigger value="logins">Login Activity</TabsTrigger>
                </TabsList>

                {/* Activity Log Tab */}
                <TabsContent value="logs" className="space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <Label className="text-xs">Search</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Search by user, entity, action..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                        <Button onClick={handleSearch} variant="outline" size="icon">
                                            <Search className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="w-40">
                                    <Label className="text-xs">Action</Label>
                                    <Select value={actionFilter} onValueChange={setActionFilter}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Actions</SelectItem>
                                            <SelectItem value="login">Login</SelectItem>
                                            <SelectItem value="logout">Logout</SelectItem>
                                            <SelectItem value="login_failed">Login Failed</SelectItem>
                                            <SelectItem value="create">Create</SelectItem>
                                            <SelectItem value="update">Update</SelectItem>
                                            <SelectItem value="delete">Delete</SelectItem>
                                            <SelectItem value="access_change">Access Change</SelectItem>
                                            <SelectItem value="export">Export</SelectItem>
                                            <SelectItem value="bulk_import">Bulk Import</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-40">
                                    <Label className="text-xs">Entity Type</Label>
                                    <Select value={entityFilter} onValueChange={setEntityFilter}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="auth">Authentication</SelectItem>
                                            <SelectItem value="user">Users</SelectItem>
                                            <SelectItem value="lead">Leads</SelectItem>
                                            <SelectItem value="student">Students</SelectItem>
                                            <SelectItem value="access_control">Access Control</SelectItem>
                                            <SelectItem value="department">Departments</SelectItem>
                                            <SelectItem value="course">Courses</SelectItem>
                                            <SelectItem value="payment">Payments</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logs Table */}
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
                                            <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(log)}>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(log.timestamp)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{log.user_name}</p>
                                                        <p className="text-xs text-muted-foreground">{log.user_role}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getActionIcon(log.action)}
                                                        {getActionBadge(log.action)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getEntityIcon(log.entity_type)}
                                                        <span className="capitalize">{log.entity_type}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{log.entity_name || log.entity_id || '-'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm">
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-4">
                    {/* Date Range Selector */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <Label>Time Period:</Label>
                                <Select value={dateRange} onValueChange={setDateRange}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Last 24 hours</SelectItem>
                                        <SelectItem value="7">Last 7 days</SelectItem>
                                        <SelectItem value="30">Last 30 days</SelectItem>
                                        <SelectItem value="90">Last 90 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {summary && (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <Activity className="h-5 w-5 text-blue-500" />
                                            </div>
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
                                            <div className="p-2 bg-green-500/10 rounded-lg">
                                                <LogIn className="h-5 w-5 text-green-500" />
                                            </div>
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
                                            <div className="p-2 bg-yellow-500/10 rounded-lg">
                                                <Edit className="h-5 w-5 text-yellow-500" />
                                            </div>
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
                                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                                <Key className="h-5 w-5 text-purple-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Access Changes</p>
                                                <p className="text-2xl font-bold">{summary.actions_by_type?.access_change || 0}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Most Active Users */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Most Active Users</CardTitle>
                                    <CardDescription>Users with highest activity in the selected period</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {summary.most_active_users?.map((user, index) => (
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
                        </>
                    )}
                </TabsContent>

                {/* Access Changes Tab */}
                <TabsContent value="access" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-purple-500" />
                                Access Control Changes
                            </CardTitle>
                            <CardDescription>Track who granted or modified access permissions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {summary?.recent_access_changes?.length > 0 ? (
                                <div className="space-y-3">
                                    {summary.recent_access_changes.map((log) => (
                                        <div key={log.id} className="p-4 border rounded-lg">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium">{log.user_name}</span>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-primary">{log.entity_name}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {log.details?.change_type || 'Permission change'}
                                                    </p>
                                                    {log.changes && (
                                                        <div className="mt-2 text-xs">
                                                            {log.changes.old_access && (
                                                                <p className="text-red-500">- Old: {JSON.stringify(log.changes.old_access)}</p>
                                                            )}
                                                            {log.changes.new_access && (
                                                                <p className="text-green-500">+ New: {JSON.stringify(log.changes.new_access)}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>No access changes in the selected period</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Login Activity Tab */}
                <TabsContent value="logins" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LogIn className="h-5 w-5 text-green-500" />
                                Login Activity
                            </CardTitle>
                            <CardDescription>Recent login and logout events</CardDescription>
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
                                            <TableHead>Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summary.recent_login_activity.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{log.user_name}</p>
                                                        <p className="text-xs text-muted-foreground">{log.user_email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="capitalize">{log.user_role}</TableCell>
                                                <TableCell>
                                                    {log.action === 'login' && (
                                                        <Badge className="bg-green-500/10 text-green-600">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Success
                                                        </Badge>
                                                    )}
                                                    {log.action === 'logout' && (
                                                        <Badge className="bg-gray-500/10 text-gray-600">
                                                            <LogOut className="h-3 w-3 mr-1" />
                                                            Logged Out
                                                        </Badge>
                                                    )}
                                                    {log.action === 'login_failed' && (
                                                        <Badge className="bg-red-500/10 text-red-600">
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Failed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {log.details?.reason || log.details?.method || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <LogIn className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>No login activity in the selected period</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Activity Details</DialogTitle>
                        <DialogDescription>
                            Full details of this activity
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Timestamp</Label>
                                    <p className="font-medium">{formatDate(selectedLog.timestamp)}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Action</Label>
                                    <div className="flex items-center gap-2">
                                        {getActionIcon(selectedLog.action)}
                                        <span className="capitalize">{selectedLog.action}</span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">User</Label>
                                    <p className="font-medium">{selectedLog.user_name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedLog.user_email}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Role</Label>
                                    <p className="capitalize">{selectedLog.user_role}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Entity Type</Label>
                                    <p className="capitalize">{selectedLog.entity_type}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Entity</Label>
                                    <p>{selectedLog.entity_name || selectedLog.entity_id || '-'}</p>
                                </div>
                            </div>

                            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Additional Details</Label>
                                    <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Changes Made</Label>
                                    <div className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-60">
                                        {Object.entries(selectedLog.changes).map(([field, values]) => (
                                            <div key={field} className="mb-2">
                                                <span className="font-medium">{field}:</span>
                                                <div className="ml-4">
                                                    <p className="text-red-500">- {JSON.stringify(values.old)}</p>
                                                    <p className="text-green-500">+ {JSON.stringify(values.new)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedLog.ip_address && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">IP Address</Label>
                                    <p className="font-mono text-sm">{selectedLog.ip_address}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AuditLogPage;

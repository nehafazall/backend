import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Search, RefreshCw, Clock, Activity, LogIn, Edit, Key } from 'lucide-react';

const AuditLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    useEffect(() => {
        fetchData();
    }, [actionFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = { limit: 100 };
            if (searchQuery) params.search = searchQuery;
            if (actionFilter !== 'all') params.action = actionFilter;
            
            const [logsRes, summaryRes] = await Promise.all([
                api.get('/audit-logs', { params }),
                api.get('/audit-logs/summary', { params: { days: 7 } })
            ]);
            
            setLogs(logsRes.data.logs || []);
            setSummary(summaryRes.data);
        } catch (error) {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleString() : '-';

    return (
        <div className="p-6 space-y-6" data-testid="audit-log-page">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold">Audit Log</h1>
                </div>
                <Button onClick={fetchData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />Refresh
                </Button>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <Activity className="h-5 w-5 text-blue-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-xl font-bold">{summary?.total_actions || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <LogIn className="h-5 w-5 text-green-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Logins</p>
                            <p className="text-xl font-bold">{summary?.actions_by_type?.login || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <Edit className="h-5 w-5 text-yellow-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Updates</p>
                            <p className="text-xl font-bold">{summary?.actions_by_type?.update || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center gap-3">
                        <Key className="h-5 w-5 text-purple-500" />
                        <div>
                            <p className="text-sm text-muted-foreground">Access</p>
                            <p className="text-xl font-bold">{summary?.actions_by_type?.access_change || 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6 flex gap-4">
                    <Input 
                        placeholder="Search..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                        className="max-w-xs"
                    />
                    <Button onClick={fetchData} variant="outline" size="icon">
                        <Search className="h-4 w-4" />
                    </Button>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            <SelectItem value="login">Login</SelectItem>
                            <SelectItem value="create">Create</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                            <SelectItem value="access_change">Access Change</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Activity Log ({logs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-center py-8">Loading...</p>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <LogRow key={log.id} log={log} formatDate={formatDate} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const LogRow = ({ log, formatDate }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
        <div className="flex items-center gap-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground w-40">{formatDate(log.timestamp)}</span>
            <span className="font-medium w-32">{log.user_name}</span>
            <Badge className={getActionColor(log.action)}>{log.action}</Badge>
            <span className="text-sm capitalize">{log.entity_type}</span>
            <span className="text-sm text-muted-foreground">{log.entity_name || '-'}</span>
        </div>
    </div>
);

const getActionColor = (action) => {
    const colors = {
        login: 'bg-green-500/10 text-green-600',
        logout: 'bg-gray-500/10 text-gray-600',
        login_failed: 'bg-red-500/10 text-red-600',
        create: 'bg-blue-500/10 text-blue-600',
        update: 'bg-yellow-500/10 text-yellow-600',
        delete: 'bg-red-500/10 text-red-600',
        access_change: 'bg-purple-500/10 text-purple-600'
    };
    return colors[action] || 'bg-gray-500/10 text-gray-600';
};

export default AuditLogPage;

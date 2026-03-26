import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/api';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    RefreshCw, Link2, Unlink, Search, Server, Clock,
    Users, AlertTriangle, CheckCircle2, XCircle, ArrowDownUp,
    History, Wifi, WifiOff, Loader2
} from 'lucide-react';

const MT5SyncPage = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState(null);
    const [students, setStudents] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [syncLogs, setSyncLogs] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [linkDialog, setLinkDialog] = useState(null);
    const [mt5Input, setMt5Input] = useState('');
    const [linking, setLinking] = useState(false);
    const [tab, setTab] = useState('students');

    const fetchStatus = useCallback(async () => {
        try {
            const r = await api.get('/mt5/status');
            setStatus(r.data);
        } catch (e) {
            console.error('MT5 status error:', e);
        }
    }, []);

    const fetchStudents = useCallback(async () => {
        try {
            const r = await api.get(`/mt5/linked-students?search=${search}&page=${page}&limit=30`);
            setStudents(r.data.students || []);
            setTotalStudents(r.data.total || 0);
        } catch (e) {
            console.error(e);
        }
    }, [search, page]);

    const fetchLogs = useCallback(async () => {
        try {
            const r = await api.get('/mt5/sync-logs?limit=20');
            setSyncLogs(r.data.logs || []);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        Promise.all([fetchStatus(), fetchStudents(), fetchLogs()]).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchStudents(); }, [search, page]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/mt5/sync');
            await Promise.all([fetchStatus(), fetchLogs()]);
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(false);
        }
    };

    const handleLink = async () => {
        if (!linkDialog || !mt5Input.trim()) return;
        setLinking(true);
        try {
            await api.put('/mt5/link-student', {
                student_id: linkDialog.id,
                mt5_account_number: mt5Input.trim()
            });
            setLinkDialog(null);
            setMt5Input('');
            await Promise.all([fetchStudents(), fetchStatus()]);
        } catch (e) {
            alert(e.response?.data?.detail || 'Link failed');
        } finally {
            setLinking(false);
        }
    };

    const handleUnlink = async (studentId) => {
        if (!window.confirm('Unlink this MT5 account?')) return;
        try {
            await api.put('/mt5/unlink-student', { student_id: studentId });
            await Promise.all([fetchStudents(), fetchStatus()]);
        } catch (e) {
            alert(e.response?.data?.detail || 'Unlink failed');
        }
    };

    const StatusBadge = ({ ok, label }) => (
        <Badge variant={ok ? "default" : "secondary"} className={ok ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/10 text-red-500 border-red-500/30"}>
            {ok ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
            {label}
        </Badge>
    );

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    return (
        <div className="space-y-6" data-testid="mt5-sync-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Server className="h-8 w-8 text-blue-500" />
                        MT5 Integration
                    </h1>
                    <p className="text-muted-foreground">MetaTrader 5 withdrawal sync and account linking</p>
                </div>
                <Button onClick={handleSync} disabled={syncing} data-testid="manual-sync-btn">
                    {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card data-testid="mt5-connection-status">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Server</p>
                                <p className="text-lg font-bold mt-1">
                                    {status?.connection?.server_reachable ? 'Reachable' : 'Unreachable'}
                                </p>
                            </div>
                            {status?.connection?.server_reachable ?
                                <Wifi className="h-8 w-8 text-emerald-500" /> :
                                <WifiOff className="h-8 w-8 text-red-500" />}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <StatusBadge ok={status?.credentials_configured} label="Credentials" />
                            <StatusBadge ok={status?.connection?.auth_start_ok} label="Auth" />
                        </div>
                    </CardContent>
                </Card>

                <Card data-testid="mt5-linked-count">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Linked Students</p>
                                <p className="text-3xl font-bold mt-1">{status?.linked_students || 0}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card data-testid="mt5-last-sync">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Last Sync</p>
                                <p className="text-lg font-bold mt-1">
                                    {status?.last_sync ? new Date(status.last_sync.synced_at).toLocaleString() : 'Never'}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-amber-500" />
                        </div>
                        {status?.last_sync && (
                            <Badge variant="outline" className="mt-2">
                                {status.last_sync.withdrawals_synced || 0} synced
                            </Badge>
                        )}
                    </CardContent>
                </Card>

                <Card data-testid="mt5-schedule">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Auto-Sync Schedule</p>
                                <div className="flex gap-1 mt-2">
                                    {(status?.schedule?.times || ['08:00', '16:00', '00:00']).map(t => (
                                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                                    ))}
                                </div>
                            </div>
                            <ArrowDownUp className="h-8 w-8 text-purple-500" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{status?.schedule?.timezone || 'UAE (UTC+4)'}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Auth Warning */}
            {status?.connection && !status.connection.server_reachable && (
                <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
                    <CardContent className="pt-6 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div>
                            <p className="font-medium">MT5 Web API Access Pending</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                The MT5 server is reachable but full authentication is pending.
                                Please verify with your broker (Miles Capitals) that Web API access is enabled for manager login {status?.connection?.message || ''}.
                                In the meantime, you can link students to their MT5 accounts below — syncing will begin once auth is active.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                <Button variant={tab === 'students' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('students')} data-testid="tab-students">
                    <Users className="h-4 w-4 mr-2" />Student Linking
                </Button>
                <Button variant={tab === 'logs' ? 'default' : 'ghost'} size="sm" onClick={() => setTab('logs')} data-testid="tab-logs">
                    <History className="h-4 w-4 mr-2" />Sync History
                </Button>
            </div>

            {/* Students Tab */}
            {tab === 'students' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Student MT5 Account Linking</CardTitle>
                        <CardDescription>Link students to their MetaTrader 5 accounts for automatic withdrawal tracking</CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, phone, or MT5 ID..."
                                    className="pl-10"
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    data-testid="student-search-input"
                                />
                            </div>
                            <Badge variant="outline">{totalStudents} students</Badge>
                        </div>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Email / Phone</TableHead>
                                <TableHead>Mentor</TableHead>
                                <TableHead>MT5 Account</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map(s => (
                                <TableRow key={s.id} data-testid={`student-row-${s.id}`}>
                                    <TableCell>
                                        <p className="font-medium">{s.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{s.stage || s.status}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm">{s.email}</p>
                                        <p className="text-xs text-muted-foreground">{s.phone}</p>
                                    </TableCell>
                                    <TableCell className="text-sm">{s.mentor_name || '—'}</TableCell>
                                    <TableCell>
                                        {s.mt5_account_number ? (
                                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 font-mono">
                                                <Link2 className="h-3 w-3 mr-1" />
                                                {s.mt5_account_number}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Not linked</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="outline" size="sm"
                                                onClick={() => { setLinkDialog(s); setMt5Input(s.mt5_account_number || ''); }}
                                                data-testid={`link-btn-${s.id}`}
                                            >
                                                <Link2 className="h-3 w-3 mr-1" />
                                                {s.mt5_account_number ? 'Change' : 'Link'}
                                            </Button>
                                            {s.mt5_account_number && (
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => handleUnlink(s.id)}
                                                    data-testid={`unlink-btn-${s.id}`}
                                                >
                                                    <Unlink className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {students.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No students found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    {totalStudents > 30 && (
                        <div className="flex items-center justify-between p-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                Page {page} of {Math.ceil(totalStudents / 30)}
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * 30 >= totalStudents}>
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Sync Logs Tab */}
            {tab === 'logs' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sync History</CardTitle>
                        <CardDescription>Recent MT5 withdrawal sync runs</CardDescription>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Triggered By</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-center">Found</TableHead>
                                <TableHead className="text-center">Synced</TableHead>
                                <TableHead className="text-center">Skipped</TableHead>
                                <TableHead>Errors</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {syncLogs.map(log => (
                                <TableRow key={log.id} data-testid={`sync-log-${log.id}`}>
                                    <TableCell className="text-sm">{new Date(log.synced_at).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {log.triggered_by === 'auto_schedule' ? 'Auto' : log.triggered_by}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={
                                            log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                                            log.status === 'auth_failed' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                                            'bg-red-500/10 text-red-500 border-red-500/30'
                                        }>
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-mono">{log.withdrawals_found}</TableCell>
                                    <TableCell className="text-center font-mono font-bold text-emerald-500">{log.withdrawals_synced}</TableCell>
                                    <TableCell className="text-center font-mono text-muted-foreground">{log.withdrawals_skipped}</TableCell>
                                    <TableCell>
                                        {log.errors?.length > 0 && (
                                            <span className="text-xs text-red-500">{log.errors[0]?.substring(0, 60)}...</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {syncLogs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        No sync logs yet. Click "Sync Now" to trigger a manual sync.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Link Dialog */}
            <Dialog open={!!linkDialog} onOpenChange={v => !v && setLinkDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Link MT5 Account</DialogTitle>
                    </DialogHeader>
                    {linkDialog && (
                        <div className="space-y-4">
                            <div>
                                <Label>Student</Label>
                                <p className="font-medium">{linkDialog.full_name}</p>
                                <p className="text-sm text-muted-foreground">{linkDialog.email}</p>
                            </div>
                            <div>
                                <Label htmlFor="mt5-account">MT5 Account Number</Label>
                                <Input
                                    id="mt5-account"
                                    placeholder="e.g. 12345 or MT5_12345"
                                    value={mt5Input}
                                    onChange={e => setMt5Input(e.target.value)}
                                    data-testid="mt5-account-input"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Enter the MetaTrader 5 login/account number
                                </p>
                            </div>
                            {linkDialog.mt5_account_history?.length > 0 && (
                                <div>
                                    <Label>Account History</Label>
                                    <div className="space-y-1 mt-1">
                                        {linkDialog.mt5_account_history.map((h, i) => (
                                            <div key={i} className="text-xs flex items-center gap-2">
                                                <Badge variant="outline" className="font-mono">{h.account_number}</Badge>
                                                <span className={h.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'}>
                                                    {h.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkDialog(null)}>Cancel</Button>
                        <Button onClick={handleLink} disabled={linking || !mt5Input.trim()} data-testid="confirm-link-btn">
                            {linking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                            Link Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MT5SyncPage;

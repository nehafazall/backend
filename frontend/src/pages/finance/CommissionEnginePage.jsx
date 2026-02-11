import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Users, TrendingUp, RefreshCw, Settings } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const CommissionEnginePage = () => {
    const [commissions, setCommissions] = useState([]);
    const [stats, setStats] = useState({ totalPending: 0, totalPaid: 0, agentCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCommissions();
    }, []);

    const fetchCommissions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/commissions?limit=50');
            const data = response.data || [];
            setCommissions(data);
            
            // Calculate stats
            const pending = data.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
            const paid = data.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
            const agents = new Set(data.map(c => c.user_id)).size;
            setStats({ totalPending: pending, totalPaid: paid, agentCount: agents });
        } catch (error) {
            console.error('Error:', error);
            setCommissions([]);
        } finally {
            setLoading(false);
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
                    <Button variant="outline" size="sm" onClick={fetchCommissions}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />Configure Rules
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

            {/* Commission Table */}
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
                                <TableCell><Badge variant="outline">{comm.sale_type || 'Fresh Sale'}</Badge></TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(comm.sale_amount)}</TableCell>
                                <TableCell className="text-right font-mono font-medium text-green-600">{formatCurrency(comm.amount)}</TableCell>
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
        </div>
    );
};

export default CommissionEnginePage;

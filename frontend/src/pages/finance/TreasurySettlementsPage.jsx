import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Wallet, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatNumber = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
        return new Date(dateStr).toLocaleDateString('en-CA');
    } catch (e) {
        return "";
    }
};

const TreasurySettlementsPage = () => {
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('clt_token');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/finance/treasury/pending-settlements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSettlements(data);
            }
        } catch (error) {
            toast.error('Failed to fetch settlements');
        }
        setLoading(false);
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { pendingTotal, settledTotal, pendingCount, settledCount } = useMemo(() => {
        const pending = settlements.filter(s => s.status === 'pending');
        const settled = settlements.filter(s => s.status === 'settled');
        
        return {
            pendingTotal: pending.reduce((sum, s) => sum + (s.amount || 0), 0),
            settledTotal: settled.reduce((sum, s) => sum + (s.amount || 0), 0),
            pendingCount: pending.length,
            settledCount: settled.length
        };
    }, [settlements]);

    const handleMarkSettled = async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/finance/treasury/pending-settlements/${id}/settle`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Settlement marked as settled');
                fetchData();
            }
        } catch (error) {
            toast.error('Error updating settlement');
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="treasury-settlements-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-500">Treasury - Pending Settlements</h1>
                    <p className="text-muted-foreground">Track and manage pending payment settlements</p>
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                        <Clock className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">AED {formatNumber(pendingTotal)}</div>
                        <p className="text-xs text-muted-foreground">{pendingCount} settlements</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Settled Amount</CardTitle>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">AED {formatNumber(settledTotal)}</div>
                        <p className="text-xs text-muted-foreground">{settledCount} settlements</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                        <Wallet className="h-5 w-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">AED {formatNumber(pendingTotal + settledTotal)}</div>
                        <p className="text-xs text-muted-foreground">{settlements.length} total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Settlement Rate</CardTitle>
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">
                            {settlements.length > 0 
                                ? Math.round((settledCount / settlements.length) * 100) 
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Completion rate</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Settlements</CardTitle>
                    <CardDescription>Pending and completed settlements</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount (AED)</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {settlements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        No settlements found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                settlements.map(settlement => (
                                    <TableRow key={settlement.id}>
                                        <TableCell>{formatDate(settlement.date)}</TableCell>
                                        <TableCell>{settlement.description}</TableCell>
                                        <TableCell>{settlement.source}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="outline"
                                                className={
                                                    settlement.status === 'pending' 
                                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                                                        : 'bg-green-500/10 text-green-500 border-green-500/30'
                                                }
                                            >
                                                {settlement.status === 'pending' ? 'Pending' : 'Settled'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatNumber(settlement.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {settlement.status === 'pending' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleMarkSettled(settlement.id)}
                                                    className="text-green-500"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Settle
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default TreasurySettlementsPage;

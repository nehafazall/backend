import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const SettlementsPage = () => {
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettlements();
    }, []);

    const fetchSettlements = async () => {
        try {
            setLoading(true);
            const response = await api.get('/accounting/settlements');
            setSettlements(response.data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6" data-testid="settlements-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settlement Batches</h1>
                    <p className="text-muted-foreground">Tabby, Tamara, and Network payment settlements</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchSettlements}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Provider</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Gross</TableHead>
                            <TableHead className="text-right">Net</TableHead>
                            <TableHead className="text-right">Fees</TableHead>
                            <TableHead>Expected</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {settlements.map((batch) => (
                            <TableRow key={batch.id} className={batch.is_overdue ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                                <TableCell className="font-medium">{batch.provider}</TableCell>
                                <TableCell>{formatDate(batch.period_start)} - {formatDate(batch.period_end)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(batch.gross_amount)}</TableCell>
                                <TableCell className="text-right font-mono">{batch.net_received ? formatCurrency(batch.net_received) : '-'}</TableCell>
                                <TableCell className="text-right font-mono text-red-600">{batch.fees_withheld ? formatCurrency(batch.fees_withheld) : '-'}</TableCell>
                                <TableCell>{formatDate(batch.expected_settlement_date)}</TableCell>
                                <TableCell>
                                    <Badge variant={batch.status === 'Settled' ? 'default' : batch.is_overdue ? 'destructive' : 'secondary'}>
                                        {batch.is_overdue ? 'Overdue' : batch.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {settlements.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    No settlement batches yet. Settlements are auto-generated from sales.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default SettlementsPage;

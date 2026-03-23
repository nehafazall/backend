import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ArrowUpRight, ArrowDownRight, CreditCard, TrendingUp, RefreshCw, DollarSign, Loader2,
} from 'lucide-react';

const fmtAED = (v) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(v || 0);

const TYPE_CONFIG = {
    enrollment: { icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    upgrade: { icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
    redeposit: { icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    withdrawal: { icon: ArrowDownRight, color: 'text-red-500', bg: 'bg-red-500/10', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

function getConfig(type) {
    return TYPE_CONFIG[type] || { icon: DollarSign, color: 'text-gray-500', bg: 'bg-gray-500/10', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
}

export function TransactionHistory({ studentId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!studentId) return;
        setLoading(true);
        setError(false);
        apiClient.get(`/students/${studentId}/transaction-history`)
            .then(r => setData(r.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [studentId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6 text-muted-foreground gap-2" data-testid="txn-history-loading">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
            </div>
        );
    }

    if (error || !data) {
        return <p className="text-xs text-muted-foreground text-center py-4">Unable to load transaction history</p>;
    }

    const { transactions, summary } = data;

    return (
        <div className="space-y-3" data-testid="transaction-history">
            {/* Summary Row */}
            <div className="grid grid-cols-3 gap-2 text-center" data-testid="txn-summary">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Deposits</p>
                    <p className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">{fmtAED(summary.total_deposits)}</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400">Withdrawals</p>
                    <p className="text-sm font-bold font-mono text-red-700 dark:text-red-300">{fmtAED(summary.total_withdrawals)}</p>
                </div>
                <div className="rounded-lg bg-sky-500/10 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-sky-600 dark:text-sky-400">Net Value</p>
                    <p className="text-sm font-bold font-mono text-sky-700 dark:text-sky-300">{fmtAED(summary.net_value)}</p>
                </div>
            </div>

            {/* Timeline */}
            {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions recorded</p>
            ) : (
                <ScrollArea className="max-h-[220px]">
                    <div className="space-y-1">
                        {transactions.map((txn, i) => {
                            const cfg = getConfig(txn.type);
                            const Icon = cfg.icon;
                            const isWithdrawal = txn.type === 'withdrawal';
                            return (
                                <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors" data-testid={`txn-row-${i}`}>
                                    <div className={`p-1.5 rounded-lg ${cfg.bg} flex-shrink-0`}>
                                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium truncate">{txn.label}</span>
                                            <Badge className={`text-[10px] px-1.5 py-0 ${cfg.badge} border-0`}>{txn.type}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{txn.date || 'N/A'}</span>
                                            {txn.recorded_by && <span>by {txn.recorded_by}</span>}
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold font-mono flex-shrink-0 ${isWithdrawal ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {isWithdrawal ? '-' : '+'}{fmtAED(txn.amount_aed)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}

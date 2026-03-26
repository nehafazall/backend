import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Users, Search, DollarSign, Phone, Eye, Receipt, Clock, CreditCard, ArrowDown, ArrowUp, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import ImportButton from '@/components/ImportButton';

const formatCurrency = (amount) => {
    const val = amount || 0;
    return 'AED ' + val.toLocaleString();
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB');
};

const CustomerMasterPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    // LTV sort: null (date default), 'desc', 'asc'
    const [ltvSort, setLtvSort] = useState(null);

    useEffect(() => {
        loadCustomers();
    }, [ltvSort]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const sortBy = ltvSort ? 'net_ltv' : 'created_at';
            const sortOrder = ltvSort || 'desc';
            const url = searchTerm
                ? `/customers?search=${encodeURIComponent(searchTerm)}&sort_by=${sortBy}&sort_order=${sortOrder}`
                : `/customers?sort_by=${sortBy}&sort_order=${sortOrder}`;
            const res = await apiClient.get(url);
            setCustomers(res.data || []);
        } catch (err) {
            toast.error('Failed to load customers');
        }
        setLoading(false);
    };

    const searchCustomers = async () => {
        setLoading(true);
        try {
            const sortBy = ltvSort ? 'net_ltv' : 'created_at';
            const sortOrder = ltvSort || 'desc';
            const url = `/customers?search=${encodeURIComponent(searchTerm)}&sort_by=${sortBy}&sort_order=${sortOrder}`;
            const res = await apiClient.get(url);
            setCustomers(res.data || []);
        } catch (err) {
            toast.error('Search failed');
        }
        setLoading(false);
    };

    const openDetails = async (id) => {
        setShowModal(true);
        try {
            const res = await apiClient.get('/customers/' + id);
            setSelectedCustomer(res.data);
        } catch (err) {
            toast.error('Failed to load details');
            setShowModal(false);
        }
    };

    // Compute aggregate stats
    const totalCustomers = customers.length;
    const totalEnrollment = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
    const totalDeposits = customers.reduce((s, c) => s + (c.mentor_deposits_total || 0), 0);
    const totalWithdrawals = customers.reduce((s, c) => s + (c.mentor_withdrawals_total || 0), 0);
    const totalNetLtv = customers.reduce((s, c) => s + (c.net_ltv || c.total_spent || 0), 0);
    const totalTxn = customers.reduce((s, c) => s + (c.transaction_count || 0), 0);

    const renderTxn = (txn, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                    <p className="font-medium">{txn.payment_type || 'Payment'}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(txn.date)}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="font-mono font-bold">{formatCurrency(txn.amount)}</p>
                <Badge variant="outline">{txn.payment_method || 'N/A'}</Badge>
            </div>
        </div>
    );

    return (
        <div className="space-y-6" data-testid="customer-master-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Master</h1>
                    <p className="text-muted-foreground">Transaction history & lifetime value for all customers</p>
                </div>
                <ImportButton templateType="customers" title="Import Customers" onSuccess={loadCustomers} />
            </div>

            {/* Summary Status Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2" data-testid="cm-summary-bar">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Customers</p>
                        <p className="text-sm font-bold">{totalCustomers.toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                    <Receipt className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Transactions</p>
                        <p className="text-sm font-bold text-blue-600">{totalTxn.toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                    <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Enrollment</p>
                        <p className="text-sm font-bold text-emerald-600">AED {Math.round(totalEnrollment).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30">
                    <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Redeposits</p>
                        <p className="text-sm font-bold text-emerald-600">AED {Math.round(totalDeposits).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-red-50 dark:bg-red-950/30">
                    <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Withdrawals</p>
                        <p className="text-sm font-bold text-red-500">AED {Math.round(totalWithdrawals).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-indigo-50 dark:bg-indigo-950/30">
                    <BarChart3 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Net LTV</p>
                        <p className="text-sm font-bold text-indigo-600">AED {Math.round(totalNetLtv).toLocaleString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                    <DollarSign className="h-4 w-4 text-orange-500 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Avg LTV</p>
                        <p className="text-sm font-bold text-orange-500">AED {totalCustomers > 0 ? Math.round(totalNetLtv / totalCustomers).toLocaleString() : 0}</p>
                    </div>
                </div>
                <button
                    onClick={() => setLtvSort(prev => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${ltvSort ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/30 ring-1 ring-indigo-400' : 'bg-card hover:bg-muted/50'}`}
                    data-testid="cm-ltv-sort-toggle"
                >
                    <TrendingUp className={`h-4 w-4 shrink-0 ${ltvSort ? 'text-indigo-600' : 'text-muted-foreground'}`} />
                    <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">LTV Sort</p>
                        <p className={`text-sm font-bold ${ltvSort ? 'text-indigo-600' : 'text-muted-foreground'}`}>
                            {ltvSort === 'desc' ? 'High\u2192Low' : ltvSort === 'asc' ? 'Low\u2192High' : 'Off'}
                        </p>
                    </div>
                </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchCustomers()}
                        className="pl-10"
                        data-testid="cm-search-input"
                    />
                </div>
                <Button onClick={searchCustomers} variant="secondary" data-testid="cm-search-btn">Search</Button>
                {searchTerm && (
                    <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); loadCustomers(); }}>Clear</Button>
                )}
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden" data-testid="cm-table">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Customer</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Course</th>
                                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Txns</th>
                                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Enrollment</th>
                                <th className="text-right px-4 py-2.5 font-medium text-emerald-600">Redeposits</th>
                                <th className="text-right px-4 py-2.5 font-medium text-red-500">Withdrawals</th>
                                <th
                                    className="text-right px-4 py-2.5 font-medium cursor-pointer select-none hover:text-indigo-600 transition-colors"
                                    onClick={() => setLtvSort(prev => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null)}
                                    data-testid="cm-ltv-header-sort"
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Net LTV
                                        {ltvSort === 'desc' ? <ArrowDown className="h-3 w-3 text-indigo-600" /> : ltvSort === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-600" /> : null}
                                    </span>
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-12 text-muted-foreground">No customers found</td>
                                </tr>
                            ) : customers.map((c, idx) => {
                                const deposits = c.mentor_deposits_total || 0;
                                const withdrawals = c.mentor_withdrawals_total || 0;
                                const netLtv = c.net_ltv || c.total_spent || 0;
                                return (
                                    <tr key={c.id} className="hover:bg-muted/30 transition-colors" data-testid={`cm-row-${c.id}`}>
                                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                                        <td className="px-4 py-2.5">
                                            <p className="font-medium">{c.full_name}</p>
                                            {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                                        </td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                            {c.transactions && c.transactions.length > 0 ? c.transactions[0].course_name || '—' : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <Badge variant="secondary" className="text-xs">{c.transaction_count || 0}</Badge>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-xs">{formatCurrency(c.total_spent)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                                            {deposits > 0 ? (
                                                <span className="text-emerald-600">+{Math.round(deposits).toLocaleString()}</span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                                            {withdrawals > 0 ? (
                                                <span className="text-red-500">-{Math.round(withdrawals).toLocaleString()}</span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-600" data-testid={`cm-ltv-${c.id}`}>
                                            AED {Math.round(netLtv).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(c.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => openDetails(c.id)} data-testid={`cm-view-${c.id}`}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Customer Detail Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Customer Details</DialogTitle>
                        <DialogDescription>Transaction history & LTV breakdown</DialogDescription>
                    </DialogHeader>
                    {selectedCustomer && (
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="pt-6 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Name</p>
                                        <p className="font-medium">{selectedCustomer.full_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Phone</p>
                                        <p className="font-medium">{selectedCustomer.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-medium">{selectedCustomer.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Enrollment Spent</p>
                                        <p className="font-mono text-emerald-500">{formatCurrency(selectedCustomer.total_spent)}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Net LTV Summary */}
                            {selectedCustomer.mentor_totals && (
                                <Card className="border-blue-200 bg-blue-50/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base text-blue-700">Lifetime Value (LTV)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-4 gap-3 text-center">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Enrollment</p>
                                                <p className="font-mono font-bold text-emerald-600">{formatCurrency(selectedCustomer.total_spent)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Deposits</p>
                                                <p className="font-mono font-bold text-emerald-600">+ {formatCurrency(selectedCustomer.mentor_totals.total_deposits_aed)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Withdrawals</p>
                                                <p className="font-mono font-bold text-red-500">- {formatCurrency(selectedCustomer.mentor_totals.total_withdrawals_aed)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium">Net LTV</p>
                                                <p className="font-mono font-bold text-blue-700 text-lg" data-testid="customer-net-ltv">{formatCurrency(selectedCustomer.net_ltv)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Enrollment Transactions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedCustomer.transactions && selectedCustomer.transactions.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedCustomer.transactions.map(renderTxn)}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-4">No transactions</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Mentor Deposits */}
                            {selectedCustomer.mentor_deposits && selectedCustomer.mentor_deposits.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg text-emerald-600">Mentor Deposits</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {selectedCustomer.mentor_deposits.map((d, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                    <div>
                                                        <p className="text-sm font-medium">Redeposit</p>
                                                        <p className="text-xs text-muted-foreground">{formatDate(d.date)} · {d.mentor_name}</p>
                                                    </div>
                                                    <p className="font-mono font-bold text-emerald-600">+ {formatCurrency(d.amount_aed)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Mentor Withdrawals */}
                            {selectedCustomer.mentor_withdrawals && selectedCustomer.mentor_withdrawals.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg text-red-500">Mentor Withdrawals</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {selectedCustomer.mentor_withdrawals.map((w, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                                    <div>
                                                        <p className="text-sm font-medium">Withdrawal</p>
                                                        <p className="text-xs text-muted-foreground">{formatDate(w.date)} · {w.mentor_name}</p>
                                                    </div>
                                                    <p className="font-mono font-bold text-red-500">- {formatCurrency(w.amount_aed)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CustomerMasterPage;

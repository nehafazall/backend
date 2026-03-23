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
import { Users, Search, DollarSign, Phone, Eye, Receipt, Clock, CreditCard, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
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
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        loadCustomers();
    }, [sortBy, sortOrder]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/customers?sort_by=${sortBy}&sort_order=${sortOrder}`);
            setCustomers(res.data || []);
        } catch (err) {
            toast.error('Failed to load customers');
        }
        setLoading(false);
    };

    const searchCustomers = async () => {
        setLoading(true);
        try {
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

    const calcTotal = (arr, field) => {
        let sum = 0;
        for (let i = 0; i < arr.length; i++) {
            sum += arr[i][field] || 0;
        }
        return sum;
    };

    const totalRev = calcTotal(customers, 'total_spent');
    const totalTxn = calcTotal(customers, 'transaction_count');
    const avgVal = customers.length > 0 ? totalRev / customers.length : 0;

    const renderStats = () => {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Customers</p>
                                <p className="text-3xl font-bold">{customers.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Revenue</p>
                                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalRev)}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Transactions</p>
                                <p className="text-3xl font-bold text-blue-500">{totalTxn}</p>
                            </div>
                            <Receipt className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Value</p>
                                <p className="text-2xl font-bold text-orange-500">{formatCurrency(avgVal)}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderRow = (c) => {
        const hasRedeposits = (c.mentor_deposits_total || 0) > 0 || (c.mentor_withdrawals_total || 0) > 0;
        return (
            <TableRow key={c.id}>
                <TableCell>
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.email || ''}</p>
                </TableCell>
                <TableCell>
                    <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>
                </TableCell>
                <TableCell>
                    {c.transactions && c.transactions.length > 0 ? (
                        <span className="text-sm">{c.transactions[0].course_name || 'N/A'}</span>
                    ) : 'N/A'}
                </TableCell>
                <TableCell>
                    <Badge variant="secondary">{c.transaction_count || 0}</Badge>
                </TableCell>
                <TableCell>
                    <span className="font-mono text-emerald-500">{formatCurrency(c.total_spent)}</span>
                </TableCell>
                <TableCell>
                    <div className="space-y-0.5">
                        <span className="font-mono font-bold text-blue-600" data-testid={`net-ltv-${c.id}`}>{formatCurrency(c.net_ltv || c.total_spent)}</span>
                        {hasRedeposits && (
                            <div className="flex items-center gap-1 text-[10px]">
                                {c.mentor_deposits_total > 0 && <span className="text-emerald-500">+{Math.round(c.mentor_deposits_total).toLocaleString()}</span>}
                                {c.mentor_withdrawals_total > 0 && <span className="text-red-500">-{Math.round(c.mentor_withdrawals_total).toLocaleString()}</span>}
                            </div>
                        )}
                    </div>
                </TableCell>
                <TableCell>
                    <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDate(c.created_at)}
                    </span>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetails(c.id)}>
                        <Eye className="h-4 w-4 mr-1" />View
                    </Button>
                </TableCell>
            </TableRow>
        );
    };

    const renderTxn = (txn, idx) => {
        return (
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
    };

    return (
        <div className="space-y-6" data-testid="customer-master-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Master</h1>
                    <p className="text-muted-foreground">Transaction history for all customers</p>
                </div>
                <ImportButton templateType="customers" title="Import Customers" onSuccess={loadCustomers} />
            </div>

            {renderStats()}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Customers</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchCustomers()}
                                    className="pl-10"
                                />
                            </div>
                            <Button onClick={searchCustomers} variant="secondary">Search</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Transactions</TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto p-0 font-medium hover:bg-transparent"
                                            onClick={() => {
                                                if (sortBy === 'total_spent') {
                                                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                                                } else {
                                                    setSortBy('total_spent');
                                                    setSortOrder('desc');
                                                }
                                            }}
                                            data-testid="sort-total-spent"
                                        >
                                            Total Spent
                                            {sortBy === 'total_spent' ? (
                                                sortOrder === 'desc' ? <ArrowDown className="ml-1 h-3.5 w-3.5 inline" /> : <ArrowUp className="ml-1 h-3.5 w-3.5 inline" />
                                            ) : (
                                                <ArrowUpDown className="ml-1 h-3.5 w-3.5 inline text-muted-foreground" />
                                            )}
                                        </Button>
                                    </TableHead>
                                    <TableHead>Net LTV</TableHead>
                                    <TableHead>Enrollment Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">No customers found</TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map(renderRow)
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

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

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
import { Users, Search, DollarSign, Phone, Eye, Receipt, Clock, CreditCard } from 'lucide-react';

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

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/customers');
            setCustomers(res.data || []);
        } catch (err) {
            toast.error('Failed to load customers');
        }
        setLoading(false);
    };

    const searchCustomers = async () => {
        setLoading(true);
        try {
            const url = '/customers?search=' + encodeURIComponent(searchTerm);
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
        return (
            <TableRow key={c.id}>
                <TableCell>
                    <p className="font-medium">{c.full_name}</p>
                </TableCell>
                <TableCell>
                    <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>
                </TableCell>
                <TableCell>
                    <Badge variant="secondary">{c.transaction_count || 0}</Badge>
                </TableCell>
                <TableCell>
                    <span className="font-mono text-emerald-500">{formatCurrency(c.total_spent)}</span>
                </TableCell>
                <TableCell>
                    <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDate(c.last_transaction_at)}
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Customer Master</h1>
                <p className="text-muted-foreground">Transaction history for all customers</p>
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
                                    <TableHead>Transactions</TableHead>
                                    <TableHead>Total Spent</TableHead>
                                    <TableHead>Last Transaction</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">No customers found</TableCell>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Customer Details</DialogTitle>
                        <DialogDescription>Transaction history</DialogDescription>
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
                                        <p className="text-sm text-muted-foreground">Total Spent</p>
                                        <p className="font-mono text-emerald-500">{formatCurrency(selectedCustomer.total_spent)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Transactions</CardTitle>
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
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CustomerMasterPage;

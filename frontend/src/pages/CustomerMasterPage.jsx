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
import {
    Users,
    Search,
    DollarSign,
    CreditCard,
    Phone,
    Mail,
    Eye,
    TrendingUp,
    Receipt,
    Clock,
    ChevronRight,
} from 'lucide-react';

const CustomerMasterPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            toast.error('Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/customers?search=' + encodeURIComponent(searchTerm));
            setCustomers(res.data);
        } catch (error) {
            toast.error('Failed to search customers');
        } finally {
            setLoading(false);
        }
    };

    const viewCustomerDetails = async (customerId) => {
        try {
            setShowDetailModal(true);
            const res = await apiClient.get('/customers/' + customerId);
            setSelectedCustomer(res.data);
        } catch (error) {
            toast.error('Failed to fetch customer details');
            setShowDetailModal(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const totalTransactions = customers.reduce((sum, c) => sum + (c.transaction_count || 0), 0);

    return (
        <div className="space-y-6" data-testid="customer-master-page">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Master</h1>
                    <p className="text-muted-foreground">
                        Complete transaction history for all customers
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Customers</p>
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
                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                <p className="text-3xl font-bold text-emerald-500">
                                    {formatCurrency(totalRevenue)}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Transactions</p>
                                <p className="text-3xl font-bold text-blue-500">{totalTransactions}</p>
                            </div>
                            <Receipt className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg. Value</p>
                                <p className="text-3xl font-bold text-orange-500">
                                    {formatCurrency(customers.length > 0 ? totalRevenue / customers.length : 0)}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

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
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10"
                                />
                            </div>
                            <Button onClick={handleSearch} variant="secondary">Search</Button>
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
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Transactions</TableHead>
                                    <TableHead>Total Spent</TableHead>
                                    <TableHead>Last Transaction</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            No customers found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((customer) => (
                                        <TableRow key={customer.id}>
                                            <TableCell>
                                                <p className="font-medium">{customer.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{customer.country}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />{customer.phone}
                                                </p>
                                                {customer.email && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />{customer.email}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{customer.transaction_count || 0}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono font-bold text-emerald-500">
                                                    {formatCurrency(customer.total_spent)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />{formatDate(customer.last_transaction_at)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => viewCustomerDetails(customer.id)}>
                                                    <Eye className="h-4 w-4 mr-1" />View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Customer Details</DialogTitle>
                        <DialogDescription>Transaction history and info</DialogDescription>
                    </DialogHeader>
                    
                    {selectedCustomer && (
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-2 gap-4">
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
                                            <p className="font-mono font-bold text-emerald-500">
                                                {formatCurrency(selectedCustomer.total_spent)}
                                            </p>
                                        </div>
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
                                            {selectedCustomer.transactions.map((txn, idx) => (
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
                                                        <Badge variant="outline">{txn.payment_method}</Badge>
                                                    </div>
                                                </div>
                                            ))}
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

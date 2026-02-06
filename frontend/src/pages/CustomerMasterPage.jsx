import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Users,
    Search,
    DollarSign,
    CreditCard,
    Calendar,
    Phone,
    Mail,
    Eye,
    TrendingUp,
    Receipt,
    Clock,
    ChevronRight,
} from 'lucide-react';

const CustomerMasterPage = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

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
            const res = await apiClient.get(`/customers?search=${encodeURIComponent(searchTerm)}`);
            setCustomers(res.data);
        } catch (error) {
            toast.error('Failed to search customers');
        } finally {
            setLoading(false);
        }
    };

    const viewCustomerDetails = async (customerId) => {
        try {
            setDetailLoading(true);
            setShowDetailModal(true);
            const res = await apiClient.get(`/customers/${customerId}`);
            setSelectedCustomer(res.data);
        } catch (error) {
            toast.error('Failed to fetch customer details');
            setShowDetailModal(false);
        } finally {
            setDetailLoading(false);
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

    const getPaymentMethodBadge = (method) => {
        const colors = {
            'stripe': 'bg-purple-500',
            'unipay': 'bg-blue-500',
            'tabby': 'bg-green-500',
            'tamara': 'bg-pink-500',
            'bank_transfer': 'bg-yellow-500',
            'cash': 'bg-gray-500',
            'usdt': 'bg-orange-500',
        };
        return colors[method] || 'bg-gray-500';
    };

    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const totalTransactions = customers.reduce((sum, c) => sum + (c.transaction_count || 0), 0);

    return (
        <div className="space-y-6" data-testid="customer-master-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Master</h1>
                    <p className="text-muted-foreground">
                        Complete transaction history for all customers
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
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
                                <p className="text-sm text-muted-foreground">Avg. Customer Value</p>
                                <p className="text-3xl font-bold text-orange-500">
                                    {formatCurrency(customers.length > 0 ? totalRevenue / customers.length : 0)}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Customers</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, phone, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10"
                                />
                            </div>
                            <Button onClick={handleSearch} variant="secondary">
                                Search
                            </Button>
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
                                            No customers found. Customers are created when leads are enrolled.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((customer) => (
                                        <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewCustomerDetails(customer.id)}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{customer.full_name}</p>
                                                    {customer.country && (
                                                        <p className="text-xs text-muted-foreground">{customer.country}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="text-sm flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {customer.phone}
                                                    </p>
                                                    {customer.email && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {customer.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {customer.transaction_count || 0} transactions
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono font-bold text-emerald-500">
                                                    {formatCurrency(customer.total_spent)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(customer.last_transaction_at)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                    <ChevronRight className="h-4 w-4 ml-1" />
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

            {/* Customer Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-3xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Customer Details</DialogTitle>
                        <DialogDescription>
                            Complete transaction history and customer information
                        </DialogDescription>
                    </DialogHeader>
                    
                    {detailLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : selectedCustomer && (
                        <ScrollArea className="max-h-[70vh]">
                            <Tabs defaultValue="overview" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                                    <TabsTrigger value="history">History</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="overview" className="space-y-4 mt-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Full Name</p>
                                                    <p className="font-medium text-lg">{selectedCustomer.full_name}</p>
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
                                                    <p className="text-sm text-muted-foreground">Country</p>
                                                    <p className="font-medium">{selectedCustomer.country || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                        <Card>
                                            <CardContent className="pt-6 text-center">
                                                <DollarSign className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                                                <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.total_spent)}</p>
                                                <p className="text-sm text-muted-foreground">Total Spent</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6 text-center">
                                                <Receipt className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                                                <p className="text-2xl font-bold">{selectedCustomer.transaction_count || 0}</p>
                                                <p className="text-sm text-muted-foreground">Transactions</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6 text-center">
                                                <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                                                <p className="text-sm font-bold">{formatDate(selectedCustomer.first_transaction_at)}</p>
                                                <p className="text-sm text-muted-foreground">First Transaction</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                                
                                <TabsContent value="transactions" className="mt-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Transaction History</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {selectedCustomer.transactions?.length > 0 ? (
                                                <div className="space-y-3">
                                                    {selectedCustomer.transactions.map((txn, index) => (
                                                        <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <CreditCard className="h-5 w-5 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {txn.course_name || txn.payment_type || 'Payment'}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {formatDate(txn.date)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-mono font-bold text-lg">
                                                                    {formatCurrency(txn.amount)}
                                                                </p>
                                                                <Badge className={getPaymentMethodBadge(txn.payment_method)}>
                                                                    {txn.payment_method?.replace(/_/g, ' ')}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center text-muted-foreground py-8">
                                                    No transactions recorded yet
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                
                                <TabsContent value="history" className="mt-4 space-y-4">
                                    {selectedCustomer.lead_info && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Lead Information</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Lead Stage</p>
                                                        <Badge>{selectedCustomer.lead_info.stage}</Badge>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Lead Source</p>
                                                        <p className="font-medium">{selectedCustomer.lead_info.lead_source || 'Direct'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Assigned To</p>
                                                        <p className="font-medium">{selectedCustomer.lead_info.assigned_to_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Sale Amount</p>
                                                        <p className="font-medium font-mono">{formatCurrency(selectedCustomer.lead_info.sale_amount)}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                    
                                    {selectedCustomer.student_info && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Student Information</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">CS Stage</p>
                                                        <Badge>{selectedCustomer.student_info.stage}</Badge>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">CS Agent</p>
                                                        <p className="font-medium">{selectedCustomer.student_info.cs_agent_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Mentor</p>
                                                        <p className="font-medium">{selectedCustomer.student_info.mentor_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Onboarding</p>
                                                        <Badge className={selectedCustomer.student_info.onboarding_complete ? 'bg-emerald-500' : 'bg-yellow-500'}>
                                                            {selectedCustomer.student_info.onboarding_complete ? 'Complete' : 'Pending'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CustomerMasterPage;

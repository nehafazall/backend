import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    FileSpreadsheet, Upload, RefreshCw, CheckCircle2, XCircle, 
    AlertTriangle, Search, Link2, Wand2, Eye
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/components/finance/utils';

const ReconciliationPage = () => {
    const [statements, setStatements] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStatement, setSelectedStatement] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    
    const [uploadForm, setUploadForm] = useState({
        bank_account_id: '',
        statement_date: new Date().toISOString().split('T')[0],
        file: null,
        parsedData: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statementsRes, accountsRes, summaryRes] = await Promise.all([
                api.get('/accounting/bank-statements'),
                api.get('/accounting/accounts'),
                api.get('/accounting/reconciliation/summary')
            ]);
            setStatements(statementsRes.data || []);
            // Filter for bank accounts only
            setAccounts((accountsRes.data || []).filter(a => a.subtype === 'bank'));
            setSummary(summaryRes.data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Parse CSV
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    if (values.length >= 2) {
                        const row = {};
                        headers.forEach((h, idx) => {
                            row[h] = values[idx]?.trim() || '';
                        });
                        data.push(row);
                    }
                }
                
                setUploadForm(prev => ({
                    ...prev,
                    file: file,
                    parsedData: data
                }));
                
                toast.success(`Parsed ${data.length} transactions from file`);
            } catch (err) {
                toast.error('Failed to parse CSV file');
            }
        };
        reader.readAsText(file);
    };

    const handleUpload = async () => {
        if (!uploadForm.bank_account_id || uploadForm.parsedData.length === 0) {
            toast.error('Select a bank account and upload a valid CSV file');
            return;
        }
        
        try {
            setUploading(true);
            const response = await api.post('/accounting/bank-statements/upload', {
                bank_account_id: uploadForm.bank_account_id,
                statement_date: uploadForm.statement_date,
                file_name: uploadForm.file?.name,
                statement_data: uploadForm.parsedData
            });
            
            toast.success(response.data.message);
            setShowUploadModal(false);
            setUploadForm({
                bank_account_id: '',
                statement_date: new Date().toISOString().split('T')[0],
                file: null,
                parsedData: []
            });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleAutoReconcile = async (statementId) => {
        try {
            const response = await api.post(`/accounting/bank-statements/${statementId}/auto-reconcile`);
            toast.success(response.data.message);
            fetchData();
            if (selectedStatement?.id === statementId) {
                viewStatementDetails(statementId);
            }
        } catch (error) {
            toast.error('Auto-reconciliation failed');
        }
    };

    const viewStatementDetails = async (statementId) => {
        try {
            const response = await api.get(`/accounting/bank-statements/${statementId}`);
            setSelectedStatement(response.data);
            setShowDetailModal(true);
        } catch (error) {
            toast.error('Failed to load statement details');
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            pending: { variant: 'secondary', label: 'Pending' },
            in_progress: { variant: 'outline', label: 'In Progress' },
            completed: { variant: 'default', label: 'Completed' }
        };
        const config = variants[status] || variants.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getLineStatusIcon = (status) => {
        if (status === 'matched') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        if (status === 'excluded') return <XCircle className="h-4 w-4 text-gray-400" />;
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    };

    return (
        <div className="space-y-6" data-testid="reconciliation-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
                    <p className="text-muted-foreground">Import and reconcile bank statements</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Button onClick={() => setShowUploadModal(true)} data-testid="upload-statement-btn">
                        <Upload className="h-4 w-4 mr-2" />Import Statement
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    <FileSpreadsheet className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary.total_statements}</p>
                                    <p className="text-sm text-muted-foreground">Total Statements</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary.pending_reconciliation}</p>
                                    <p className="text-sm text-muted-foreground">Pending Reconciliation</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary.completed_statements}</p>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                    <Link2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary.total_unmatched_lines}</p>
                                    <p className="text-sm text-muted-foreground">Unmatched Items</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Statements List */}
            <Card>
                <CardHeader>
                    <CardTitle>Bank Statements</CardTitle>
                    <CardDescription>Imported statements for reconciliation</CardDescription>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Bank Account</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead className="text-right">Debits</TableHead>
                            <TableHead className="text-right">Credits</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {statements.map((stmt) => (
                            <TableRow key={stmt.id}>
                                <TableCell>{stmt.statement_date}</TableCell>
                                <TableCell className="font-medium">{stmt.bank_account_name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{stmt.file_name || '-'}</TableCell>
                                <TableCell className="text-right font-mono text-red-500">
                                    {formatCurrency(stmt.total_debits)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-green-500">
                                    {formatCurrency(stmt.total_credits)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Progress 
                                            value={stmt.line_count > 0 ? (stmt.reconciled_count / stmt.line_count) * 100 : 0} 
                                            className="w-20 h-2"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {stmt.reconciled_count}/{stmt.line_count}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(stmt.status)}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => viewStatementDetails(stmt.id)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleAutoReconcile(stmt.id)}
                                            disabled={stmt.status === 'completed'}
                                        >
                                            <Wand2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {statements.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                    No bank statements imported yet. Click "Import Statement" to begin.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Upload Modal */}
            <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Import Bank Statement</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file from your bank to reconcile transactions
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Bank Account *</Label>
                            <Select 
                                value={uploadForm.bank_account_id} 
                                onValueChange={(v) => setUploadForm({ ...uploadForm, bank_account_id: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Statement Date</Label>
                            <Input 
                                type="date"
                                value={uploadForm.statement_date}
                                onChange={(e) => setUploadForm({ ...uploadForm, statement_date: e.target.value })}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>CSV File *</Label>
                            <div 
                                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                {uploadForm.file ? (
                                    <p className="text-sm">{uploadForm.file.name} ({uploadForm.parsedData.length} rows)</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Click to select CSV file</p>
                                )}
                            </div>
                            <input 
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <p className="text-xs text-muted-foreground">
                                CSV should have columns: date, description, amount, balance, reference
                            </p>
                        </div>

                        {uploadForm.parsedData.length > 0 && (
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium">Preview ({uploadForm.parsedData.length} transactions)</p>
                                <div className="mt-2 text-xs space-y-1 max-h-32 overflow-auto">
                                    {uploadForm.parsedData.slice(0, 5).map((row, i) => (
                                        <div key={i} className="flex justify-between">
                                            <span>{row.date || row.transaction_date}</span>
                                            <span className="truncate max-w-[150px]">{row.description || row.narration}</span>
                                            <span className={parseFloat(row.amount) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                {formatCurrency(parseFloat(row.amount) || 0)}
                                            </span>
                                        </div>
                                    ))}
                                    {uploadForm.parsedData.length > 5 && (
                                        <p className="text-muted-foreground">... and {uploadForm.parsedData.length - 5} more</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={uploading || uploadForm.parsedData.length === 0}>
                            {uploading ? 'Uploading...' : 'Import Statement'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Statement Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>
                            Statement: {selectedStatement?.bank_account_name} - {selectedStatement?.statement_date}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedStatement?.reconciled_count || 0} matched, {selectedStatement?.unmatched_count || 0} unmatched
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[500px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8">#</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedStatement?.lines?.map((line) => (
                                    <TableRow key={line.id} className={line.status === 'matched' ? 'bg-green-50/50 dark:bg-green-900/10' : ''}>
                                        <TableCell className="text-muted-foreground">{line.line_number}</TableCell>
                                        <TableCell>{line.transaction_date}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{line.description}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{line.reference || '-'}</TableCell>
                                        <TableCell className={`text-right font-mono ${line.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(line.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getLineStatusIcon(line.status)}
                                                <span className="text-sm">{line.status}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
                        <Button 
                            onClick={() => handleAutoReconcile(selectedStatement?.id)}
                            disabled={selectedStatement?.status === 'completed'}
                        >
                            <Wand2 className="h-4 w-4 mr-2" />Auto-Reconcile
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReconciliationPage;

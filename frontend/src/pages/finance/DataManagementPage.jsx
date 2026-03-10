import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DATA_TYPES = [
    { id: 'clt_payables', name: 'CLT Payables', entity: 'CLT' },
    { id: 'clt_receivables', name: 'CLT Receivables', entity: 'CLT' },
    { id: 'expenses', name: 'Operational Expenses', entity: 'CLT' },
    { id: 'treasury_balances', name: 'Treasury Balances', entity: 'Treasury' },
    { id: 'budget', name: 'Budget Data', entity: 'Budgeting' },
    { id: 'chart_of_accounts', name: 'Chart of Accounts', entity: 'Settings' },
    { id: 'cost_centers', name: 'Cost Centers', entity: 'Settings' },
    { id: 'payment_methods', name: 'Payment Methods', entity: 'Settings' },
    { id: 'payment_gateways', name: 'Payment Gateways', entity: 'Settings' }
];

const TEMPLATES = {
    clt_payables: ['date', 'amount', 'currency', 'account_name', 'cost_center', 'sub_cost_center', 'source'],
    clt_receivables: ['date', 'account_name', 'amount', 'currency', 'payment_method', 'payment_for'],
    expenses: ['date', 'category', 'description', 'amount', 'currency', 'vendor', 'cost_center'],
    treasury_balances: ['date', 'account', 'opening_balance', 'currency'],
    budget: ['cost_center', 'year', 'entity', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    chart_of_accounts: ['code', 'name', 'type', 'parent_code', 'description'],
    cost_centers: ['code', 'name', 'department', 'description'],
    payment_methods: ['code', 'name', 'type', 'requires_proof', 'description'],
    payment_gateways: ['code', 'name', 'provider_type', 'settlement_days', 'settlement_day_of_week', 'processing_fee_percent', 'processing_fee_fixed', 'currency']
};

const DataManagementPage = () => {
    const [selectedType, setSelectedType] = useState('');
    const [uploadResults, setUploadResults] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const token = localStorage.getItem('clt_token');

    const handleDownloadTemplate = () => {
        if (!selectedType) {
            toast.error('Please select a data type');
            return;
        }

        try {
            const columns = TEMPLATES[selectedType];
            const csv = columns.join(',') + '\n' + columns.map(() => '').join(',');
            const filename = `${selectedType}_template.csv`;
            
            // Use data URL approach for better browser compatibility
            const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
            
            const link = document.createElement('a');
            link.setAttribute('href', csvContent);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            link.style.position = 'absolute';
            link.style.left = '-9999px';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success(`Template "${filename}" downloaded`);
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download template');
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!selectedType) {
            toast.error('Please select a data type first');
            return;
        }

        setUploading(true);
        setUploadResults(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', selectedType);

        try {
            const response = await fetch(`${API_URL}/api/finance/data/import`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                setUploadResults({
                    success: true,
                    imported: result.imported || 0,
                    errors: result.errors || [],
                    message: result.message || 'Import successful'
                });
                toast.success(`Successfully imported ${result.imported} records`);
            } else {
                setUploadResults({
                    success: false,
                    imported: 0,
                    errors: [result.detail || 'Import failed'],
                    message: 'Import failed'
                });
                toast.error('Import failed');
            }
        } catch (error) {
            setUploadResults({
                success: false,
                imported: 0,
                errors: ['Network error occurred'],
                message: 'Import failed'
            });
            toast.error('Error uploading file');
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExportData = async () => {
        if (!selectedType) {
            toast.error('Please select a data type');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/finance/data/export?type=${selectedType}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${selectedType}_export.csv`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 150);
                toast.success('Data exported successfully');
            } else {
                toast.error('Export failed');
            }
        } catch (error) {
            toast.error('Error exporting data');
        }
    };

    return (
        <div className="space-y-6" data-testid="data-management-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-500">Data Management</h1>
                    <p className="text-muted-foreground">Import and export financial data</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Import Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Import Data
                        </CardTitle>
                        <CardDescription>Upload CSV files to import financial data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Data Type</label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select data type to import" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DATA_TYPES.map(dt => (
                                        <SelectItem key={dt.id} value={dt.id}>
                                            {dt.name} ({dt.entity})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={handleDownloadTemplate}
                                disabled={!selectedType}
                            >
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Download Template
                            </Button>
                            <div className="relative">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".csv"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={!selectedType || uploading}
                                />
                                <Button disabled={!selectedType || uploading}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    {uploading ? 'Uploading...' : 'Upload CSV'}
                                </Button>
                            </div>
                        </div>

                        {uploadResults && (
                            <div className={`p-4 rounded-lg ${uploadResults.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {uploadResults.success 
                                        ? <CheckCircle className="h-5 w-5 text-green-500" />
                                        : <AlertCircle className="h-5 w-5 text-red-500" />
                                    }
                                    <span className={`font-medium ${uploadResults.success ? 'text-green-500' : 'text-red-500'}`}>
                                        {uploadResults.message}
                                    </span>
                                </div>
                                {uploadResults.success && (
                                    <p className="text-sm">Imported {uploadResults.imported} records</p>
                                )}
                                {uploadResults.errors.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm font-medium">Errors:</p>
                                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                                            {uploadResults.errors.slice(0, 5).map((err, idx) => (
                                                <li key={idx}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Export Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5" />
                            Export Data
                        </CardTitle>
                        <CardDescription>Download financial data as CSV</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Data Type</label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select data type to export" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DATA_TYPES.map(dt => (
                                        <SelectItem key={dt.id} value={dt.id}>
                                            {dt.name} ({dt.entity})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button 
                            onClick={handleExportData}
                            disabled={!selectedType}
                            className="w-full"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export to CSV
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Template Reference */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        CSV Template Reference
                    </CardTitle>
                    <CardDescription>Required columns for each data type</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data Type</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Required Columns</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {DATA_TYPES.map(dt => (
                                <TableRow key={dt.id}>
                                    <TableCell className="font-medium">{dt.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{dt.entity}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {TEMPLATES[dt.id]?.join(', ')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default DataManagementPage;

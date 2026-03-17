import React, { useState, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, FileText, ExternalLink } from 'lucide-react';

const TYPE_CONFIG = {
    leads: { title: 'Leads', endpoint: '/import/leads', useJson: true },
    historical_leads: { title: 'Historical Leads', endpoint: '/import/historical-leads', useJson: true },
    'historical-sales-xlsx': { title: 'Import Historical Sales', endpoint: '/import/historical-sales-xlsx', useJson: false, acceptXlsx: true },
    comprehensive_students: { title: 'Comprehensive Students', endpoint: '/import/comprehensive-students', useJson: true },
    historical_students_xlsx: { title: 'Historical Students (XLSX)', endpoint: '/import/historical-students-xlsx', useJson: false, acceptXlsx: true },
    customers: { title: 'Customers', endpoint: '/import/customers', useJson: true },
    students_cs: { title: 'CS Students', endpoint: '/import/students/cs', useJson: true },
    students_mentor: { title: 'Mentor Students', endpoint: '/import/students/mentor', useJson: true },
    mentor_redeposits: { title: 'Mentor Redeposits', endpoint: '/import/mentor-redeposits', useJson: true },
    cs_upgrades: { title: 'CS Upgrades', endpoint: '/import/cs-upgrades', useJson: true },
    mentor_withdrawals: { title: 'Mentor Withdrawals', endpoint: '/import/mentor-withdrawals', useJson: true },
    employees: { title: 'Employees', endpoint: '/import/employees', useJson: true },
    courses: { title: 'Courses', endpoint: '/import/courses', useJson: false },
    users: { title: 'Users', endpoint: '/import/users', useJson: false },
};

function FieldBadges({ fields, required }) {
    if (!fields || fields.length === 0) return null;
    const badges = [];
    for (let i = 0; i < fields.length; i++) {
        if (required) {
            badges.push(<Badge key={fields[i]} className="bg-red-500 mr-1 mb-1">{fields[i]}*</Badge>);
        } else {
            badges.push(<Badge key={fields[i]} variant="outline" className="mr-1 mb-1">{fields[i]}</Badge>);
        }
    }
    return <div className="flex flex-wrap">{badges}</div>;
}

function ErrorList({ errors }) {
    if (!errors || errors.length === 0) return null;
    const items = [];
    for (let i = 0; i < errors.length; i++) {
        items.push(<li key={i} className="text-muted-foreground">{errors[i]}</li>);
    }
    return <ul className="text-xs space-y-1">{items}</ul>;
}

function ImportButton({ type, templateType, onSuccess }) {
    const actualType = type || templateType || 'leads';
    // Template type can be different from import type (e.g., historical-sales-xlsx uses historical-sales template)
    const templateActualType = templateType || type || 'leads';
    const config = TYPE_CONFIG[actualType] || { title: actualType, endpoint: `/import/${actualType}`, useJson: true };
    const [open, setOpen] = useState(false);
    const [template, setTemplate] = useState(null);
    const [file, setFile] = useState(null);
    const [data, setData] = useState(null);
    const [results, setResults] = useState(null);
    const [busy, setBusy] = useState(false);

    async function loadTemplate() {
        setBusy(true);
        try {
            const r = await apiClient.get(`/import/templates/${templateActualType}`);
            setTemplate(r.data);
            setOpen(true);
        } catch (e) {
            toast.error('Failed to load template');
        }
        setBusy(false);
    }

    function download() {
        // Use direct backend download endpoint
        const API_URL = process.env.REACT_APP_BACKEND_URL || '';
        const token = localStorage.getItem('clt_token');
        const downloadUrl = `${API_URL}/api/import/templates/${templateActualType}/download`;
        
        // Open in new window/tab to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl + `?token=${token}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Download started - check your Downloads folder');
    }
    
    function openTemplateInNewTab() {
        // Use direct backend download endpoint
        const API_URL = process.env.REACT_APP_BACKEND_URL || '';
        const token = localStorage.getItem('clt_token');
        const downloadUrl = `${API_URL}/api/import/templates/${templateActualType}/download?token=${token}`;
        window.open(downloadUrl, '_blank');
        toast.info('Template opened in new tab');
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
    }

    function handleFileSelect(e) {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        
        if (config.acceptXlsx) {
            // For XLSX files, just track file info without parsing
            setData({ rowCount: '(XLSX)', fileName: f.name });
            toast.success('XLSX file selected: ' + f.name);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const lines = evt.target.result.trim().split('\n');
                if (config.useJson) {
                    const headers = lines[0].split(',').map(function(h) { return h.trim().replace(/^"|"$/g, '').replace('*', ''); });
                    const rows = [];
                    for (let i = 1; i < lines.length; i++) {
                        const vals = parseCSVLine(lines[i]);
                        const obj = {};
                        for (let j = 0; j < headers.length; j++) {
                            if (vals[j] && vals[j].trim()) obj[headers[j]] = vals[j].trim();
                        }
                        if (Object.keys(obj).length > 0) rows.push(obj);
                    }
                    setData(rows);
                    toast.success(rows.length + ' rows parsed');
                } else {
                    setData({ rowCount: lines.length - 1 });
                    toast.success((lines.length - 1) + ' rows ready');
                }
            } catch (err) {
                toast.error('Failed to parse CSV');
            }
        };
        reader.readAsText(f);
    }

    async function doImport() {
        if (!data && !file) return;
        setBusy(true);
        try {
            let r;
            if (config.useJson) {
                r = await apiClient.post(config.endpoint, data);
            } else {
                const formData = new FormData();
                formData.append('file', file);
                r = await apiClient.post(config.endpoint, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setResults(r.data.results || r.data);
            toast.success(r.data.message || 'Import complete');
            if (onSuccess) onSuccess();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Import failed');
        }
        setBusy(false);
    }

    function close() {
        setOpen(false);
        setResults(null);
        setData(null);
        setFile(null);
        setTemplate(null);
    }

    const requiredFields = template?.fields?.required || [];
    const optionalFields = template?.fields?.optional || [];

    return (
        <>
            <Button onClick={loadTemplate} variant="outline" disabled={busy} data-testid={`import-${actualType}-btn`}>
                <Upload className="h-4 w-4 mr-2" />Import
            </Button>

            <Dialog open={open} onOpenChange={close}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Import {config.title}</DialogTitle>
                        <DialogDescription>Upload a CSV file to bulk import</DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh]">
                        {template && !results && (
                            <div className="space-y-4 pr-4">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm">Required Fields</CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2">
                                        <FieldBadges fields={requiredFields} required={true} />
                                    </CardContent>
                                </Card>
                                
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm">Optional Fields</CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2">
                                        <FieldBadges fields={optionalFields} required={false} />
                                    </CardContent>
                                </Card>

                                {template.instructions && (
                                    <Card>
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-sm">Instructions</CardTitle>
                                        </CardHeader>
                                        <CardContent className="py-2">
                                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-3 rounded">
                                                {template.instructions}
                                            </pre>
                                        </CardContent>
                                    </Card>
                                )}

                                <Button onClick={download} variant="secondary" className="w-full">
                                    <Download className="h-4 w-4 mr-2" />Download Template
                                </Button>
                                
                                <Button onClick={openTemplateInNewTab} variant="outline" size="sm" className="w-full text-xs">
                                    <ExternalLink className="h-3 w-3 mr-1" />Open Template in New Tab (if download doesn't work)
                                </Button>

                                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                    <input type="file" accept={config.acceptXlsx ? ".xlsx,.xls" : ".csv"} onChange={handleFileSelect} className="hidden" id={`csv-file-${actualType}`} />
                                    <label htmlFor={`csv-file-${actualType}`} className="cursor-pointer">
                                        <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm font-medium">Click to select {config.acceptXlsx ? 'XLSX' : 'CSV'} file</p>
                                        <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                                    </label>
                                </div>

                                {data && (
                                    <div className="bg-emerald-500/10 rounded-lg p-4 flex items-center gap-3">
                                        <FileText className="h-6 w-6 text-emerald-500" />
                                        <div>
                                            <p className="font-medium text-emerald-500">
                                                {config.useJson ? data.length : data.rowCount} rows ready
                                            </p>
                                            <p className="text-xs text-muted-foreground">{file?.name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {results && (
                            <div className="space-y-4 pr-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <Card className="bg-emerald-500/10">
                                        <CardContent className="pt-6 text-center">
                                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                                            <p className="text-2xl font-bold text-emerald-500">
                                                {results.created || results.success || 0}
                                            </p>
                                            <p className="text-sm">Created</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-blue-500/10">
                                        <CardContent className="pt-6 text-center">
                                            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                                            <p className="text-2xl font-bold text-blue-500">
                                                {results.updated || results.skipped || 0}
                                            </p>
                                            <p className="text-sm">{results.updated !== undefined ? 'Updated' : 'Skipped'}</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-red-500/10">
                                        <CardContent className="pt-6 text-center">
                                            <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                                            <p className="text-2xl font-bold text-red-500">
                                                {results.errors?.length || results.failed || 0}
                                            </p>
                                            <p className="text-sm">Errors</p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {results.errors && results.errors.length > 0 && (
                                    <Card className="border-red-500/50">
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-sm text-red-500">Error Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="py-2">
                                            <ScrollArea className="h-32">
                                                <ErrorList errors={results.errors} />
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    <DialogFooter>
                        {!results ? (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={close}>Cancel</Button>
                                <Button onClick={doImport} disabled={!data || busy}>
                                    {busy ? 'Importing...' : 'Import'}
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={close}>Close</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default ImportButton;

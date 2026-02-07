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
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const ImportButton = ({ templateType, title, onSuccess }) => {
    const [showModal, setShowModal] = useState(false);
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [results, setResults] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const fileInputRef = useRef(null);

    const fetchTemplate = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/import/templates/' + templateType);
            setTemplate(res.data);
            setShowModal(true);
        } catch (err) {
            toast.error('Failed to load template');
        }
        setLoading(false);
    };

    const downloadTemplate = () => {
        if (!template) return;
        const headers = template.headers.join(',');
        const example = Object.values(template.example_row).join(',');
        const csv = headers + '\n' + example;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = template.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Template downloaded');
    };

    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace('*', ''));
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                if (values[j]) row[headers[j]] = values[j];
            }
            if (Object.keys(row).length > 0) data.push(row);
        }
        return data;
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = parseCSV(event.target.result);
            setParsedData(data);
            toast.success(data.length + ' rows found');
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!parsedData) return;
        setImporting(true);
        try {
            let endpoint = '/import/' + templateType;
            if (templateType === 'students_cs') endpoint = '/import/students/cs';
            if (templateType === 'students_mentor') endpoint = '/import/students/mentor';
            const res = await apiClient.post(endpoint, parsedData);
            setResults(res.data);
            if (res.data.success > 0) {
                toast.success('Imported ' + res.data.success + ' records');
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            toast.error('Import failed');
        }
        setImporting(false);
    };

    const resetModal = () => {
        setShowModal(false);
        setResults(null);
        setParsedData(null);
    };

    const renderRequired = () => {
        if (!template) return null;
        return template.required_fields.map(f => (
            <Badge key={f} className="bg-red-500 mr-1 mb-1">{f} *</Badge>
        ));
    };

    const renderOptional = () => {
        if (!template) return null;
        return template.optional_fields.map(f => (
            <Badge key={f} variant="outline" className="mr-1 mb-1">{f}</Badge>
        ));
    };

    const renderInstructions = () => {
        if (!template) return null;
        return template.instructions.map((inst, idx) => (
            <li key={idx}>{inst}</li>
        ));
    };

    const renderErrors = () => {
        if (!results || !results.errors) return null;
        return results.errors.slice(0, 10).map((err, idx) => (
            <li key={idx} className="text-red-400">{err}</li>
        ));
    };

    return (
        <>
            <Button onClick={fetchTemplate} variant="outline" disabled={loading}>
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : title}
            </Button>

            <Dialog open={showModal} onOpenChange={resetModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5" />
                            Import {title}
                        </DialogTitle>
                        <DialogDescription>Upload CSV file to import data</DialogDescription>
                    </DialogHeader>

                    {template && !results && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm">Required Fields</CardTitle>
                                </CardHeader>
                                <CardContent className="py-2">{renderRequired()}</CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm">Optional Fields</CardTitle>
                                </CardHeader>
                                <CardContent className="py-2">{renderOptional()}</CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm">Instructions</CardTitle>
                                </CardHeader>
                                <CardContent className="py-2">
                                    <ul className="text-sm list-disc list-inside text-muted-foreground">
                                        {renderInstructions()}
                                    </ul>
                                </CardContent>
                            </Card>

                            <Button onClick={downloadTemplate} variant="secondary" className="w-full">
                                <Download className="h-4 w-4 mr-2" />Download Template
                            </Button>

                            <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="csv-upload"
                                />
                                <label htmlFor="csv-upload" className="cursor-pointer">
                                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Click to select CSV file</p>
                                </label>
                            </div>

                            {parsedData && (
                                <div className="bg-muted/50 rounded-lg p-4">
                                    <p className="font-medium">Ready: {parsedData.length} records</p>
                                </div>
                            )}
                        </div>
                    )}

                    {results && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <Card className="bg-emerald-500/10">
                                    <CardContent className="pt-6 text-center">
                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                                        <p className="text-2xl font-bold text-emerald-500">{results.success}</p>
                                        <p className="text-sm">Success</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-yellow-500/10">
                                    <CardContent className="pt-6 text-center">
                                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                                        <p className="text-2xl font-bold text-yellow-500">{results.skipped}</p>
                                        <p className="text-sm">Skipped</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-red-500/10">
                                    <CardContent className="pt-6 text-center">
                                        <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                                        <p className="text-2xl font-bold text-red-500">{results.failed}</p>
                                        <p className="text-sm">Failed</p>
                                    </CardContent>
                                </Card>
                            </div>
                            {results.errors && results.errors.length > 0 && (
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm text-red-500">Errors</CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2">
                                        <ul className="text-sm">{renderErrors()}</ul>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {!results ? (
                            <>
                                <Button variant="outline" onClick={resetModal}>Cancel</Button>
                                <Button onClick={handleImport} disabled={!parsedData || importing}>
                                    {importing ? 'Importing...' : 'Import'}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={resetModal}>Close</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ImportButton;

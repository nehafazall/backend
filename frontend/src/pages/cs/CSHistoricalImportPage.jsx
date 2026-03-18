import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, Eye, ArrowRight } from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

const STATUS_STYLES = {
    valid: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', badge: 'bg-emerald-500', label: 'Valid' },
    error: { bg: 'bg-red-500/10', text: 'text-red-600', badge: 'bg-red-500', label: 'Error' },
};

export default function CSHistoricalImportPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [preview, setPreview] = useState(null);
    const [results, setResults] = useState(null);

    const handleDownloadTemplate = () => {
        const API_URL = process.env.REACT_APP_BACKEND_URL || '';
        const token = localStorage.getItem('clt_token');
        window.open(`${API_URL}/api/import/templates/cs-historical/download?token=${token}`, '_blank');
    };

    const handlePreview = async () => {
        if (!file) return toast.error('Please select a file first');
        setUploading(true);
        setPreview(null);
        setResults(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiClient.post('/import/cs-historical/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });
            setPreview(res.data);
            if (res.data.valid > 0) toast.success(`${res.data.valid} rows ready to import`);
            if (res.data.errors > 0) toast.warning(`${res.data.errors} rows have errors`);
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Preview failed');
        }
        setUploading(false);
    };

    const handleConfirmImport = async () => {
        if (!preview?.preview_id) return;
        setConfirming(true);
        try {
            const res = await apiClient.post(`/import/cs-historical/confirm/${preview.preview_id}`);
            setResults(res.data);
            setPreview(null);
            if (res.data.success > 0) toast.success(`Imported ${res.data.success} upgrade records`);
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Import failed');
        }
        setConfirming(false);
    };

    const handleReset = () => { setFile(null); setPreview(null); setResults(null); };

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto" data-testid="cs-historical-import-page">
            <div>
                <h1 className="text-2xl font-bold">CS Historical Import</h1>
                <p className="text-muted-foreground mt-1">Upload historical customer service upgrade records</p>
            </div>

            {/* Step 1: Download Template */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center justify-center">1</span>
                        Download Template
                    </CardTitle>
                    <CardDescription>3 sheets: Import Data, CS Agents, Upgrade Courses</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={handleDownloadTemplate} data-testid="cs-download-template-btn">
                        <Download className="h-4 w-4 mr-2" />Download Excel Template
                    </Button>
                    <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        <p><strong>Sheet 1:</strong> Fill — Full Name, Phone, Course Upgrade, Course Amount, CS Agent Name, Date, Email</p>
                        <p><strong>Sheet 2:</strong> Reference — CS Agent names</p>
                        <p><strong>Sheet 3:</strong> Reference — Upgrade course names & prices</p>
                    </div>
                </CardContent>
            </Card>

            {/* Step 2: Upload & Preview */}
            {!results && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center justify-center">2</span>
                            Upload & Preview
                        </CardTitle>
                        <CardDescription>No data is saved until you confirm.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <label className="block cursor-pointer" data-testid="cs-file-upload-area">
                            <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(e) => { setFile(e.target.files[0]); setPreview(null); setResults(null); }} />
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-emerald-500/50 transition-colors">
                                <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                {file ? (
                                    <p className="text-sm font-medium">{file.name} <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span></p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Click to select Excel file</p>
                                )}
                            </div>
                        </label>
                        <Button onClick={handlePreview} disabled={!file || uploading} className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="cs-preview-btn">
                            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validating...</> : <><Eye className="h-4 w-4 mr-2" />Upload & Preview</>}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Preview Results */}
            {preview && !results && (
                <Card data-testid="cs-preview-results">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center justify-center">3</span>
                            Review Data
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-2xl font-bold">{preview.total_rows}</p>
                                <p className="text-xs text-muted-foreground">Total Rows</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-emerald-500">{preview.valid}</p>
                                <p className="text-xs text-muted-foreground">Ready to Import</p>
                            </div>
                            <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-red-500">{preview.errors}</p>
                                <p className="text-xs text-muted-foreground">Errors</p>
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden max-h-[420px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 sticky top-0 z-10">
                                        <TableHead className="w-14">Row</TableHead>
                                        <TableHead className="w-20">Status</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Course Upgrade</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>CS Agent</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Issues</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.rows?.map((row) => {
                                        const style = STATUS_STYLES[row.status] || STATUS_STYLES.error;
                                        return (
                                            <TableRow key={row.row_num} className={style.bg} data-testid={`cs-preview-row-${row.row_num}`}>
                                                <TableCell className="text-xs font-mono">{row.row_num}</TableCell>
                                                <TableCell>
                                                    <Badge className={`${style.badge} text-white text-xs`}>{style.label}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{row.data?.full_name || '-'}</TableCell>
                                                <TableCell className="text-xs font-mono">{row.data?.phone || '-'}</TableCell>
                                                <TableCell className="text-sm">{row.data?.course_upgrade || '-'}</TableCell>
                                                <TableCell className="text-sm">{row.data?.course_amount || '-'}</TableCell>
                                                <TableCell className="text-sm">
                                                    {row.resolved?.agent_name || <span className="text-red-500">{row.data?.cs_agent_name || '-'}</span>}
                                                </TableCell>
                                                <TableCell className="text-xs">{row.data?.date || '-'}</TableCell>
                                                <TableCell>
                                                    {row.errors?.length > 0 && (
                                                        <div className="space-y-0.5">
                                                            {row.errors.map((err, idx) => (
                                                                <p key={idx} className="text-xs text-red-600">{err}</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Button variant="outline" onClick={handleReset} data-testid="cs-reset-btn">Re-upload File</Button>
                            <div className="flex-1" />
                            {preview.valid > 0 ? (
                                <Button onClick={handleConfirmImport} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-700" data-testid="cs-confirm-btn">
                                    {confirming ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                                    ) : (
                                        <><CheckCircle className="h-4 w-4 mr-2" />Confirm Import ({preview.valid} rows)<ArrowRight className="h-4 w-4 ml-2" /></>
                                    )}
                                </Button>
                            ) : (
                                <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                                    <XCircle className="h-4 w-4" /> No valid rows. Fix errors and re-upload.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Results */}
            {results && (
                <Card data-testid="cs-import-results">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-500" />Import Complete
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-2xl font-bold">{results.total_rows}</p>
                                <p className="text-xs text-muted-foreground">Processed</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-emerald-500">{results.success}</p>
                                <p className="text-xs text-muted-foreground">Imported</p>
                            </div>
                            <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-red-500">{results.failed}</p>
                                <p className="text-xs text-muted-foreground">Failed</p>
                            </div>
                        </div>
                        {results.errors?.length > 0 && (
                            <div className="max-h-48 overflow-y-auto space-y-1 text-xs bg-muted/20 rounded-lg p-3">
                                {results.errors.map((err, idx) => (
                                    <p key={idx} className="text-muted-foreground">{err}</p>
                                ))}
                            </div>
                        )}
                        <Button variant="outline" onClick={handleReset} data-testid="cs-import-again-btn">Import More Data</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

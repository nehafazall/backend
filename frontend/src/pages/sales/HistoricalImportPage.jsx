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
    duplicate: { bg: 'bg-amber-500/10', text: 'text-amber-600', badge: 'bg-amber-500', label: 'Duplicate' },
};

export default function HistoricalImportPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [preview, setPreview] = useState(null);
    const [results, setResults] = useState(null);

    const handleDownloadTemplate = () => {
        const API_URL = process.env.REACT_APP_BACKEND_URL || '';
        const token = localStorage.getItem('clt_token');
        window.open(`${API_URL}/api/import/templates/historical-sales/download?token=${token}`, '_blank');
    };

    const handlePreview = async () => {
        if (!file) return toast.error('Please select a file first');
        setUploading(true);
        setPreview(null);
        setResults(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiClient.post('/import/historical-sales-xlsx/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });
            setPreview(res.data);
            if (res.data.valid > 0) toast.success(`${res.data.valid} rows are valid and ready to import`);
            if (res.data.errors > 0) toast.warning(`${res.data.errors} rows have errors`);
            if (res.data.duplicates > 0) toast.info(`${res.data.duplicates} duplicate rows will be skipped`);
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Preview failed');
        }
        setUploading(false);
    };

    const handleConfirmImport = async () => {
        if (!preview?.preview_id) return;
        setConfirming(true);
        try {
            const res = await apiClient.post(`/import/historical-sales-xlsx/confirm/${preview.preview_id}`);
            setResults(res.data);
            setPreview(null);
            if (res.data.success > 0) toast.success(`Successfully imported ${res.data.success} records`);
            if (res.data.failed > 0) toast.error(`${res.data.failed} rows failed during import`);
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Import failed');
        }
        setConfirming(false);
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResults(null);
    };

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto" data-testid="historical-import-page">
            <div>
                <h1 className="text-2xl font-bold">Import Historical Sales Data</h1>
                <p className="text-muted-foreground mt-1">Upload past enrollment records — preview before pushing to database</p>
            </div>

            {/* Step 1: Download Template */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                        Download Template
                    </CardTitle>
                    <CardDescription>Excel template with 4 sheets: Import Data, Courses & Prices, Add-ons & Prices, Teams & Agents</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={handleDownloadTemplate} data-testid="download-template-btn">
                        <Download className="h-4 w-4 mr-2" />Download Excel Template
                    </Button>
                    <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        <p><strong>Sheet 1:</strong> Fill data — Full Name, Phone, Course, Course Amount, Add-ons, Add-on Amount, Agent, Team, Enrolled Amount, Date, Email, Country, City, Source</p>
                        <p><strong>Sheet 2:</strong> Reference — Courses & Prices with commissions</p>
                        <p><strong>Sheet 3:</strong> Reference — Add-ons & Prices</p>
                        <p><strong>Sheet 4:</strong> Reference — Sales agents with team names</p>
                    </div>
                </CardContent>
            </Card>

            {/* Step 2: Upload & Preview */}
            {!results && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                            Upload & Preview
                        </CardTitle>
                        <CardDescription>File will be validated row-by-row. No data is saved until you confirm.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="flex-1 relative cursor-pointer" data-testid="file-upload-area">
                                <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(e) => { setFile(e.target.files[0]); setPreview(null); setResults(null); }} />
                                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                    <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    {file ? (
                                        <p className="text-sm font-medium">{file.name} <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span></p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Click to select Excel file (.xlsx)</p>
                                    )}
                                </div>
                            </label>
                        </div>
                        <Button onClick={handlePreview} disabled={!file || uploading} className="w-full" data-testid="preview-btn">
                            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validating...</> : <><Eye className="h-4 w-4 mr-2" />Upload & Preview</>}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Preview Results */}
            {preview && !results && (
                <Card data-testid="preview-results">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                            Review Data
                        </CardTitle>
                        <CardDescription>Review each row below. Only valid rows will be imported on confirmation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Summary stats */}
                        <div className="grid grid-cols-4 gap-3">
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
                            <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-amber-500">{preview.duplicates}</p>
                                <p className="text-xs text-muted-foreground">Duplicates</p>
                            </div>
                        </div>

                        {/* Row-by-row preview table */}
                        <div className="border rounded-lg overflow-hidden max-h-[420px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 sticky top-0 z-10">
                                        <TableHead className="w-14">Row</TableHead>
                                        <TableHead className="w-20">Status</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Add-ons</TableHead>
                                        <TableHead>Agent</TableHead>
                                        <TableHead>Team</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Issues</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.rows?.map((row) => {
                                        const style = STATUS_STYLES[row.status] || STATUS_STYLES.error;
                                        return (
                                            <TableRow key={row.row_num} className={style.bg} data-testid={`preview-row-${row.row_num}`}>
                                                <TableCell className="text-xs font-mono">{row.row_num}</TableCell>
                                                <TableCell>
                                                    <Badge className={`${style.badge} text-white text-xs`}>{style.label}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm max-w-[120px] truncate">{row.data?.full_name || '-'}</TableCell>
                                                <TableCell className="text-xs font-mono">{row.data?.phone || '-'}</TableCell>
                                                <TableCell className="text-sm max-w-[120px] truncate">{row.data?.course_enrolled || '-'}</TableCell>
                                                <TableCell className="text-xs max-w-[100px] truncate">{row.data?.addons || '-'}</TableCell>
                                                <TableCell className="text-sm">
                                                    {row.resolved?.agent_name || <span className="text-red-500">{row.data?.agent_name || '-'}</span>}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {row.resolved?.team_name || <span className="text-red-500">{row.data?.team_name || '-'}</span>}
                                                </TableCell>
                                                <TableCell className="text-sm">{row.data?.enrolled_amount || '-'}</TableCell>
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

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <Button variant="outline" onClick={handleReset} data-testid="reset-btn">
                                Re-upload File
                            </Button>
                            <div className="flex-1" />
                            {preview.valid > 0 ? (
                                <Button onClick={handleConfirmImport} disabled={confirming} data-testid="confirm-import-btn">
                                    {confirming ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing {preview.valid} rows...</>
                                    ) : (
                                        <><CheckCircle className="h-4 w-4 mr-2" />Confirm Import ({preview.valid} valid rows)<ArrowRight className="h-4 w-4 ml-2" /></>
                                    )}
                                </Button>
                            ) : (
                                <p className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                                    <XCircle className="h-4 w-4" /> No valid rows to import. Fix the errors and re-upload.
                                </p>
                            )}
                        </div>

                        {/* Assignment info */}
                        <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
                            <div className="bg-muted/30 rounded-lg p-3">
                                <p className="font-medium mb-1">CS Assignment (Weighted Round-Robin)</p>
                                <p className="text-muted-foreground">Falja, Della, Karthika, Nasida: 2 each | Angel: 1</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3">
                                <p className="font-medium mb-1">Mentor Assignment (Equal Round-Robin)</p>
                                <p className="text-muted-foreground">Edwin, Mathson, Ashwin, Nihal, Sriram</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Final Results */}
            {results && (
                <Card data-testid="import-results">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                            Import Complete
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-2xl font-bold">{results.total_rows}</p>
                                <p className="text-xs text-muted-foreground">Processed</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-emerald-500">{results.success}</p>
                                <p className="text-xs text-muted-foreground">Imported</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-emerald-500">{results.students_created}</p>
                                <p className="text-xs text-muted-foreground">Students Created</p>
                            </div>
                            <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-red-500">{results.failed}</p>
                                <p className="text-xs text-muted-foreground">Failed</p>
                            </div>
                        </div>

                        {results.cs_assignments && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium mb-2">CS Agent Assignments</p>
                                    <div className="space-y-1">
                                        {Object.entries(results.cs_assignments).map(([name, count]) => (
                                            <div key={name} className="flex justify-between text-sm bg-muted/30 rounded px-3 py-1.5">
                                                <span>{name}</span><Badge variant="secondary">{count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-2">Mentor Assignments</p>
                                    <div className="space-y-1">
                                        {Object.entries(results.mentor_assignments).map(([name, count]) => (
                                            <div key={name} className="flex justify-between text-sm bg-muted/30 rounded px-3 py-1.5">
                                                <span>{name}</span><Badge variant="secondary">{count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {results.errors?.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                                    <AlertCircle className="h-4 w-4 text-amber-500" />Issues ({results.errors.length})
                                </p>
                                <div className="max-h-48 overflow-y-auto space-y-1 text-xs bg-muted/20 rounded-lg p-3">
                                    {results.errors.map((err, idx) => (
                                        <p key={idx} className="text-muted-foreground">{err}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button variant="outline" onClick={handleReset} data-testid="import-again-btn">
                            Import More Data
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

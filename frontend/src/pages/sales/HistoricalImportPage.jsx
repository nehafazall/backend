import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

export default function HistoricalImportPage() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState(null);

    const handleDownloadTemplate = () => {
        const API_URL = process.env.REACT_APP_BACKEND_URL || '';
        const token = localStorage.getItem('clt_token');
        window.open(`${API_URL}/api/import/templates/historical-sales/download?token=${token}`, '_blank');
    };

    const handleUpload = async () => {
        if (!file) return toast.error('Please select a file first');
        setUploading(true);
        setResults(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiClient.post('/import/historical-sales-xlsx', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });
            setResults(res.data);
            if (res.data.success > 0) toast.success(`Successfully imported ${res.data.success} records`);
            if (res.data.failed > 0) toast.error(`${res.data.failed} rows failed`);
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Import failed');
        }
        setUploading(false);
    };

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto" data-testid="historical-import-page">
            <div>
                <h1 className="text-2xl font-bold">Import Historical Sales Data</h1>
                <p className="text-muted-foreground mt-1">Upload past enrollment records to populate Sales, CS, and Mentor dashboards</p>
            </div>

            {/* Step 1: Download Template */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                        Download Template
                    </CardTitle>
                    <CardDescription>Excel template with 3 sheets: Import Data, Courses & Prices, Teams & Agents</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={handleDownloadTemplate} data-testid="download-template-btn">
                        <Download className="h-4 w-4 mr-2" />Download Excel Template
                    </Button>
                    <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        <p><strong>Sheet 1:</strong> Fill in student data (required: full_name, phone, course_enrolled, agent_name, team_name)</p>
                        <p><strong>Sheet 2:</strong> Reference — All courses with prices</p>
                        <p><strong>Sheet 3:</strong> Reference — All sales agents with team names</p>
                    </div>
                </CardContent>
            </Card>

            {/* Step 2: Upload */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                        Upload Filled Data
                    </CardTitle>
                    <CardDescription>Each row creates: Enrolled Lead + Activated Student + CS Assignment + Mentor Assignment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <label className="flex-1 relative cursor-pointer" data-testid="file-upload-area">
                            <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(e) => { setFile(e.target.files[0]); setResults(null); }} />
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
                    <Button onClick={handleUpload} disabled={!file || uploading} className="w-full" data-testid="upload-btn">
                        {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : <><Upload className="h-4 w-4 mr-2" />Import Data</>}
                    </Button>

                    {/* Assignment info */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-muted/30 rounded-lg p-3">
                            <p className="font-medium mb-1">CS Assignment (Weighted Round-Robin)</p>
                            <p className="text-muted-foreground">Falja, Della, Karthika, Nasida: 2 each cycle</p>
                            <p className="text-muted-foreground">Angel: 1 per cycle (50% capacity)</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3">
                            <p className="font-medium mb-1">Mentor Assignment (Equal Round-Robin)</p>
                            <p className="text-muted-foreground">Edwin, Mathson, Ashwin, Nihal, Sriram</p>
                            <p className="text-muted-foreground">Equal distribution across all</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Step 3: Results */}
            {results && (
                <Card data-testid="import-results">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                            Import Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-2xl font-bold">{results.total_rows}</p>
                                <p className="text-xs text-muted-foreground">Total Rows</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-emerald-500">{results.success}</p>
                                <p className="text-xs text-muted-foreground">Imported</p>
                            </div>
                            <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-amber-500">{results.skipped}</p>
                                <p className="text-xs text-muted-foreground">Skipped (duplicates)</p>
                            </div>
                            <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                <p className="text-2xl font-bold text-red-500">{results.failed}</p>
                                <p className="text-xs text-muted-foreground">Failed</p>
                            </div>
                        </div>

                        {/* Assignment breakdown */}
                        {results.cs_assignments && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium mb-2">CS Agent Assignments</p>
                                    <div className="space-y-1">
                                        {Object.entries(results.cs_assignments).map(([name, count]) => (
                                            <div key={name} className="flex justify-between text-sm bg-muted/30 rounded px-3 py-1.5">
                                                <span>{name}</span>
                                                <Badge variant="secondary">{count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-2">Mentor Assignments</p>
                                    <div className="space-y-1">
                                        {Object.entries(results.mentor_assignments).map(([name, count]) => (
                                            <div key={name} className="flex justify-between text-sm bg-muted/30 rounded px-3 py-1.5">
                                                <span>{name}</span>
                                                <Badge variant="secondary">{count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Errors */}
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
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

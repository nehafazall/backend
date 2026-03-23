import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Database, Filter, Download, Play, Loader2, X, GripVertical,
} from 'lucide-react';

export default function ReportBuilderPage() {
    const { user } = useAuth();
    const [collections, setCollections] = useState({});
    const [selectedCollection, setSelectedCollection] = useState('');
    const [availableFields, setAvailableFields] = useState([]);
    const [selectedFields, setSelectedFields] = useState([]);
    const [filters, setFilters] = useState({});
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [limit, setLimit] = useState(100);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiClient.get('/reports/collections').then(r => setCollections(r.data || {})).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedCollection && collections[selectedCollection]) {
            const fields = collections[selectedCollection].fields || [];
            setAvailableFields(fields);
            setSelectedFields(fields.slice(0, 6));
            setFilters({});
            setResults(null);
        }
    }, [selectedCollection]);

    const toggleField = (field) => {
        setSelectedFields(prev =>
            prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
        );
    };

    const handleRun = async () => {
        if (!selectedCollection || selectedFields.length === 0) {
            toast.error('Select a collection and at least one field');
            return;
        }
        setLoading(true);
        try {
            const res = await apiClient.post('/reports/generate', {
                collection: selectedCollection,
                fields: selectedFields,
                filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
                sort_field: sortField,
                sort_direction: sortDir,
                limit,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            });
            setResults(res.data);
            toast.success(`Report generated: ${res.data.total} records found`);
        } catch { toast.error('Failed to generate report'); }
        setLoading(false);
    };

    const handleExport = () => {
        if (!results || !results.rows.length) return;
        const headers = selectedFields.join(',');
        const rows = results.rows.map(r => selectedFields.map(f => {
            const val = r[f];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','));
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `report_${selectedCollection}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        toast.success('CSV exported');
    };

    const formatLabel = (field) => field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="space-y-6" data-testid="report-builder-page">
            <div>
                <h1 className="text-2xl font-bold">Custom Report Builder</h1>
                <p className="text-muted-foreground text-sm">Build reports by selecting data source, fields, and filters</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                {/* Left Sidebar - Configuration */}
                <div className="md:col-span-1 space-y-4">
                    {/* Data Source */}
                    <Card data-testid="report-source-card">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Database className="h-4 w-4" /> Data Source
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                                <SelectTrigger data-testid="report-collection-select"><SelectValue placeholder="Select collection..." /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(collections).map(([key, val]) => (
                                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {/* Fields */}
                    {selectedCollection && (
                        <Card data-testid="report-fields-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center justify-between">
                                    <span className="flex items-center gap-2"><GripVertical className="h-4 w-4" /> Fields</span>
                                    <Badge variant="secondary" className="text-xs">{selectedFields.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="max-h-[200px]">
                                    <div className="space-y-2">
                                        {availableFields.map(field => (
                                            <label key={field} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                                                <Checkbox checked={selectedFields.includes(field)} onCheckedChange={() => toggleField(field)} />
                                                {formatLabel(field)}
                                            </label>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}

                    {/* Filters */}
                    {selectedCollection && (
                        <Card data-testid="report-filters-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Filter className="h-4 w-4" /> Filters
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label className="text-xs">Date From</Label>
                                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
                                </div>
                                <div>
                                    <Label className="text-xs">Date To</Label>
                                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
                                </div>
                                {selectedFields.slice(0, 3).map(field => (
                                    <div key={field}>
                                        <Label className="text-xs">{formatLabel(field)}</Label>
                                        <Input className="h-8 text-xs" placeholder={`Filter ${formatLabel(field)}...`}
                                            value={filters[field] || ''}
                                            onChange={e => setFilters(p => ({ ...p, [field]: e.target.value }))} />
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <Select value={String(limit)} onValueChange={v => setLimit(Number(v))}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {[50, 100, 250, 500, 1000].map(n => <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={sortDir} onValueChange={setSortDir}>
                                        <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="desc">Newest</SelectItem>
                                            <SelectItem value="asc">Oldest</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleRun} disabled={loading} className="w-full" data-testid="report-run-btn">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-2" /> Run Report</>}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right - Results */}
                <div className="md:col-span-3">
                    <Card data-testid="report-results-card" className="h-full">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                    {results ? `Results (${results.total} records)` : 'Results'}
                                </CardTitle>
                                {results && results.rows.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={handleExport} data-testid="report-export-btn">
                                        <Download className="h-4 w-4 mr-2" /> Export CSV
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!results ? (
                                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                                    <div className="text-center">
                                        <Database className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">Select a data source and run a report</p>
                                    </div>
                                </div>
                            ) : results.rows.length === 0 ? (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                    <p>No results found</p>
                                </div>
                            ) : (
                                <ScrollArea className="max-h-[500px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs w-10">#</TableHead>
                                                {selectedFields.map(f => (
                                                    <TableHead key={f} className="text-xs whitespace-nowrap">{formatLabel(f)}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {results.rows.map((row, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                                                    {selectedFields.map(f => (
                                                        <TableCell key={f} className="text-xs max-w-[200px] truncate">
                                                            {row[f] != null ? String(row[f]) : '—'}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

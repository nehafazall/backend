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
import { Upload, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

function RequiredFields({ fields }) {
    if (!fields) return null;
    const items = [];
    for (let i = 0; i < fields.length; i++) {
        items.push(<Badge key={fields[i]} className="bg-red-500 mr-1 mb-1">{fields[i]} *</Badge>);
    }
    return <div>{items}</div>;
}

function OptionalFields({ fields }) {
    if (!fields) return null;
    const items = [];
    for (let i = 0; i < fields.length; i++) {
        items.push(<Badge key={fields[i]} variant="outline" className="mr-1 mb-1">{fields[i]}</Badge>);
    }
    return <div>{items}</div>;
}

function Instructions({ list }) {
    if (!list) return null;
    const items = [];
    for (let i = 0; i < list.length; i++) {
        items.push(<li key={i}>{list[i]}</li>);
    }
    return <ul className="text-sm list-disc list-inside text-muted-foreground">{items}</ul>;
}

function ImportButton({ templateType, title, onSuccess }) {
    const [open, setOpen] = useState(false);
    const [template, setTemplate] = useState(null);
    const [data, setData] = useState(null);
    const [results, setResults] = useState(null);
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null);

    async function loadTemplate() {
        setBusy(true);
        try {
            const r = await apiClient.get('/import/templates/' + templateType);
            setTemplate(r.data);
            setOpen(true);
        } catch (e) {
            toast.error('Failed');
        }
        setBusy(false);
    }

    function download() {
        if (!template) return;
        const h = template.headers.join(',');
        const v = Object.values(template.example_row).join(',');
        const blob = new Blob([h + '\n' + v], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = template.filename;
        a.click();
    }

    function parseFile(e) {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const lines = evt.target.result.trim().split('\n');
            const headers = lines[0].split(',').map(function(h) { return h.trim().replace('*', ''); });
            const rows = [];
            for (let i = 1; i < lines.length; i++) {
                const vals = lines[i].split(',');
                const obj = {};
                for (let j = 0; j < headers.length; j++) {
                    if (vals[j] && vals[j].trim()) obj[headers[j]] = vals[j].trim();
                }
                if (Object.keys(obj).length > 0) rows.push(obj);
            }
            setData(rows);
            toast.success(rows.length + ' rows');
        };
        reader.readAsText(f);
    }

    async function doImport() {
        if (!data) return;
        setBusy(true);
        try {
            let url = '/import/' + templateType;
            if (templateType === 'students_cs') url = '/import/students/cs';
            if (templateType === 'students_mentor') url = '/import/students/mentor';
            const r = await apiClient.post(url, data);
            setResults(r.data);
            if (r.data.success > 0 && onSuccess) onSuccess();
        } catch (e) {
            toast.error('Failed');
        }
        setBusy(false);
    }

    function close() {
        setOpen(false);
        setResults(null);
        setData(null);
        setTemplate(null);
    }

    return (
        <div>
            <Button onClick={loadTemplate} variant="outline" disabled={busy}>
                <Upload className="h-4 w-4 mr-2" />{title}
            </Button>

            <Dialog open={open} onOpenChange={close}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Import {title}</DialogTitle>
                        <DialogDescription>Upload CSV</DialogDescription>
                    </DialogHeader>

                    {template && !results && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="py-3"><CardTitle className="text-sm">Required</CardTitle></CardHeader>
                                <CardContent className="py-2"><RequiredFields fields={template.required_fields} /></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="py-3"><CardTitle className="text-sm">Optional</CardTitle></CardHeader>
                                <CardContent className="py-2"><OptionalFields fields={template.optional_fields} /></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="py-3"><CardTitle className="text-sm">Instructions</CardTitle></CardHeader>
                                <CardContent className="py-2"><Instructions list={template.instructions} /></CardContent>
                            </Card>
                            <Button onClick={download} variant="secondary" className="w-full">
                                <Download className="h-4 w-4 mr-2" />Download Template
                            </Button>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                <input ref={inputRef} type="file" accept=".csv" onChange={parseFile} className="hidden" id="csv-file" />
                                <label htmlFor="csv-file" className="cursor-pointer">
                                    <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-sm">Select CSV</p>
                                </label>
                            </div>
                            {data && <div className="bg-muted/50 rounded-lg p-4"><p>{data.length} rows ready</p></div>}
                        </div>
                    )}

                    {results && (
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
                    )}

                    <DialogFooter>
                        {!results ? (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={close}>Cancel</Button>
                                <Button onClick={doImport} disabled={!data || busy}>Import</Button>
                            </div>
                        ) : (
                            <Button onClick={close}>Close</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ImportButton;

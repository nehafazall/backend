import React, { useState } from 'react';
import { useAuth, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Award, Download, FileText, Loader2 } from 'lucide-react';

const CERT_TYPES = [
    'Course Completion',
    'Star Performer of the Year',
    'Excellence Award',
    'Best Trader',
    'Achievement Award',
];

export default function CertificatePage() {
    const { user } = useAuth();
    const [form, setForm] = useState({
        student_name: '',
        certificate_type: 'Course Completion',
        course_name: '',
        award_date: new Date().toISOString().slice(0, 10),
        custom_text: '',
        student_id: '',
    });
    const [generating, setGenerating] = useState(false);
    const [preview, setPreview] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    const handleGenerate = async () => {
        if (!form.student_name.trim()) { toast.error('Student name is required'); return; }
        setGenerating(true);
        try {
            const res = await apiClient.post('/certificates/generate', form);
            setPreview(res.data.pdf_base64);
            toast.success('Certificate generated!');
        } catch { toast.error('Failed to generate certificate'); }
        setGenerating(false);
    };

    const handleDownload = () => {
        if (!preview) return;
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${preview}`;
        link.download = `certificate_${form.student_name.replace(/\s+/g, '_')}.pdf`;
        link.click();
    };

    const fetchHistory = async () => {
        try {
            const res = await apiClient.get('/certificates');
            setCertificates(res.data || []);
            setShowHistory(true);
        } catch { toast.error('Failed to load certificates'); }
    };

    return (
        <div className="space-y-6" data-testid="certificate-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Certificate Generator</h1>
                    <p className="text-muted-foreground text-sm">Generate professional certificates for students</p>
                </div>
                <Button variant="outline" onClick={fetchHistory} data-testid="cert-history-btn">
                    <FileText className="h-4 w-4 mr-2" /> History ({certificates.length})
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Form */}
                <Card data-testid="cert-form">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-500" /> Certificate Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Student Name *</Label>
                            <Input value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))}
                                placeholder="Enter student full name" data-testid="cert-student-name" />
                        </div>
                        <div>
                            <Label>Certificate Type</Label>
                            <Select value={form.certificate_type} onValueChange={v => setForm(p => ({ ...p, certificate_type: v }))}>
                                <SelectTrigger data-testid="cert-type-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CERT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Course Name</Label>
                            <Input value={form.course_name} onChange={e => setForm(p => ({ ...p, course_name: e.target.value }))}
                                placeholder="e.g. Forex Trading Mastery" data-testid="cert-course-name" />
                        </div>
                        <div>
                            <Label>Award Date</Label>
                            <Input type="date" value={form.award_date} onChange={e => setForm(p => ({ ...p, award_date: e.target.value }))}
                                data-testid="cert-date" />
                        </div>
                        <div>
                            <Label>Custom Description (optional)</Label>
                            <Textarea value={form.custom_text} onChange={e => setForm(p => ({ ...p, custom_text: e.target.value }))}
                                placeholder="Override the default description text..." rows={2} data-testid="cert-custom-text" />
                        </div>
                        <Button onClick={handleGenerate} disabled={generating || !form.student_name.trim()} className="w-full"
                            data-testid="cert-generate-btn">
                            {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Award className="h-4 w-4 mr-2" /> Generate Certificate</>}
                        </Button>
                    </CardContent>
                </Card>

                {/* Preview */}
                <Card data-testid="cert-preview">
                    <CardHeader>
                        <CardTitle className="text-base">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {preview ? (
                            <div className="space-y-4">
                                <iframe
                                    src={`data:application/pdf;base64,${preview}`}
                                    className="w-full h-[400px] rounded border border-border"
                                    title="Certificate Preview"
                                />
                                <Button onClick={handleDownload} className="w-full" data-testid="cert-download-btn">
                                    <Download className="h-4 w-4 mr-2" /> Download PDF
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[400px] border-2 border-dashed rounded-lg text-muted-foreground">
                                <div className="text-center">
                                    <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Fill in the details and click Generate</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* History */}
            {showHistory && certificates.length > 0 && (
                <Card data-testid="cert-history-table">
                    <CardHeader>
                        <CardTitle className="text-base">Generated Certificates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-border">
                            {certificates.map(cert => (
                                <div key={cert.id} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium text-sm">{cert.student_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {cert.certificate_type} {cert.course_name && `— ${cert.course_name}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="text-xs">{cert.award_date}</Badge>
                                        <p className="text-[10px] text-muted-foreground mt-1">by {cert.generated_by_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

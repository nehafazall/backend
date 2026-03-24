import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { GitMerge, ArrowRight, Check, AlertTriangle, User, Phone, Mail, BookOpen, Shield } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

const FieldRow = ({ label, primary, secondary, merged, icon: Icon }) => {
    const isDifferent = primary && secondary && String(primary).toLowerCase() !== String(secondary).toLowerCase();
    const isNewFromSecondary = !primary && secondary;
    return (
        <div className="grid grid-cols-12 gap-2 items-center py-1.5 text-sm">
            <div className="col-span-3 text-muted-foreground flex items-center gap-1.5">
                {Icon && <Icon className="h-3 w-3" />}{label}
            </div>
            <div className="col-span-3 font-mono text-xs truncate">{primary || <span className="text-muted-foreground/50">—</span>}</div>
            <div className="col-span-3 font-mono text-xs truncate">{secondary || <span className="text-muted-foreground/50">—</span>}</div>
            <div className="col-span-3 font-mono text-xs truncate font-medium">
                {merged || <span className="text-muted-foreground/50">—</span>}
                {isDifferent && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">both kept</Badge>}
                {isNewFromSecondary && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 text-blue-500 border-blue-500/30">added</Badge>}
            </div>
        </div>
    );
};

const StepIndicator = ({ step, current }) => (
    <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s <= current ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {s < current ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${s < current ? 'bg-emerald-500' : 'bg-muted'}`} />}
            </React.Fragment>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
            {current === 1 ? 'Select Duplicate' : current === 2 ? 'Review Merge' : 'Submit'}
        </span>
    </div>
);

export default function MergeStudentModal({ open, onClose, student, onMergeSubmitted }) {
    const [step, setStep] = useState(1);
    const [duplicates, setDuplicates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDuplicate, setSelectedDuplicate] = useState(null);
    const [preview, setPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open && student?.id) {
            setStep(1);
            setSelectedDuplicate(null);
            setPreview(null);
            fetchDuplicates();
        }
    }, [open, student?.id]);

    const fetchDuplicates = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/students/${student.id}/duplicates`);
            setDuplicates(res.data.duplicates || []);
        } catch { toast.error('Failed to detect duplicates'); }
        finally { setLoading(false); }
    };

    const fetchPreview = async (dup) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/students/merge/preview', {
                primary_id: student.id,
                secondary_id: dup.id,
            });
            setPreview(res.data);
            setStep(2);
        } catch { toast.error('Failed to generate merge preview'); }
        finally { setLoading(false); }
    };

    const submitMerge = async () => {
        setSubmitting(true);
        try {
            await apiClient.post('/students/merge/request', {
                primary_id: student.id,
                secondary_id: selectedDuplicate.id,
                merged_data: preview.merged_preview,
            });
            toast.success('Merge request submitted for approval');
            onMergeSubmitted?.();
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Failed to submit merge request');
        } finally { setSubmitting(false); }
    };

    const p = preview?.primary || {};
    const s = preview?.secondary || {};
    const m = preview?.merged_preview || {};
    const sf = preview?.secondary_fields_added || {};
    const ts = preview?.transactions_summary || {};

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="merge-student-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitMerge className="h-5 w-5 text-primary" />
                        Merge Student Records
                    </DialogTitle>
                    <DialogDescription>Merge duplicate student cards into one. Requires CS Head + CEO approval.</DialogDescription>
                </DialogHeader>

                <StepIndicator current={step} />

                {/* Step 1: Select Duplicate */}
                {step === 1 && (
                    <div className="space-y-3 mt-2">
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-sm font-medium">Primary Card (Keep)</p>
                            <p className="text-lg font-bold">{student?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{student?.phone} &middot; {student?.email || 'No email'}</p>
                        </div>

                        <Separator />
                        <p className="text-sm font-medium">Select the duplicate to merge into this card:</p>

                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">Scanning for duplicates...</div>
                        ) : duplicates.length === 0 ? (
                            <div className="text-center py-8">
                                <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No duplicates detected for this student</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {duplicates.map(dup => (
                                    <Card key={dup.id}
                                        className={`cursor-pointer transition-all hover:border-primary/50 ${selectedDuplicate?.id === dup.id ? 'border-primary ring-1 ring-primary/30' : ''}`}
                                        onClick={() => setSelectedDuplicate(dup)}
                                        data-testid={`duplicate-card-${dup.id}`}>
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{dup.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{dup.phone} &middot; {dup.email || 'No email'}</p>
                                                    <p className="text-xs text-muted-foreground">Stage: {dup.stage} &middot; Agent: {dup.cs_agent_name || 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={dup.match_score >= 50 ? 'destructive' : 'secondary'} className="text-xs">
                                                        {dup.match_score}% match
                                                    </Badge>
                                                    <div className="mt-1 space-y-0.5">
                                                        {dup.match_reasons?.map((r, i) => (
                                                            <p key={i} className="text-[10px] text-muted-foreground">{r}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Review Merged Preview */}
                {step === 2 && preview && (
                    <div className="space-y-4 mt-2">
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                Review the merged record below. Primary data overwrites. Where data differs, the secondary value is kept as an additional field. All transactions will be combined.
                            </p>
                        </div>

                        {/* Comparison Header */}
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                            <div className="col-span-3">Field</div>
                            <div className="col-span-3 text-emerald-500">Primary (Keep)</div>
                            <div className="col-span-3 text-amber-500">Secondary (Merge)</div>
                            <div className="col-span-3 text-primary">Merged Result</div>
                        </div>

                        <FieldRow label="Name" icon={User} primary={p.full_name} secondary={s.full_name} merged={m.full_name} />
                        {sf.secondary_full_name && <FieldRow label="Secondary Name" primary="" secondary="" merged={sf.secondary_full_name} />}
                        <FieldRow label="Phone" icon={Phone} primary={p.phone} secondary={s.phone} merged={m.phone} />
                        {sf.secondary_phone && <FieldRow label="Secondary Phone" primary="" secondary="" merged={sf.secondary_phone} />}
                        <FieldRow label="Email" icon={Mail} primary={p.email} secondary={s.email} merged={m.email} />
                        {sf.additional_email && <FieldRow label="Additional Email" primary="" secondary="" merged={sf.additional_email} />}
                        <FieldRow label="Country" primary={p.country} secondary={s.country} merged={m.country} />
                        {sf.additional_country && <FieldRow label="Alt Country" primary="" secondary="" merged={sf.additional_country} />}
                        <FieldRow label="Package" icon={BookOpen} primary={p.package_bought} secondary={s.package_bought} merged={m.package_bought} />
                        <FieldRow label="Course" primary={p.current_course_name} secondary={s.current_course_name} merged={m.current_course_name} />
                        <FieldRow label="CS Agent" icon={Shield} primary={p.cs_agent_name} secondary={s.cs_agent_name} merged={m.cs_agent_name} />
                        <FieldRow label="Mentor" primary={p.mentor_name} secondary={s.mentor_name} merged={m.mentor_name} />
                        <FieldRow label="Stage" primary={p.stage} secondary={s.stage} merged={m.stage} />
                        <FieldRow label="Classes" primary={p.classes_attended} secondary={s.classes_attended} merged={m.classes_attended} />
                        <FieldRow label="Onboarded" primary={p.onboarding_complete ? 'Yes' : 'No'} secondary={s.onboarding_complete ? 'Yes' : 'No'} merged={m.onboarding_complete ? 'Yes' : 'No'} />

                        <Separator />

                        {/* Transaction Summary */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Transactions to Merge</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-lg bg-muted/50 text-center">
                                    <p className="text-2xl font-bold font-mono">{ts.total_ltv}</p>
                                    <p className="text-[10px] text-muted-foreground">LTV Transactions ({ts.primary_ltv} + {ts.secondary_ltv})</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/50 text-center">
                                    <p className="text-2xl font-bold font-mono">{ts.total_upgrades}</p>
                                    <p className="text-[10px] text-muted-foreground">CS Upgrades ({ts.primary_upgrades} + {ts.secondary_upgrades})</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/50 text-center">
                                    <p className="text-2xl font-bold font-mono">{ts.total_notes}</p>
                                    <p className="text-[10px] text-muted-foreground">Notes ({ts.primary_notes} + {ts.secondary_notes})</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                    <div className="space-y-4 mt-2 text-center py-6">
                        <GitMerge className="h-12 w-12 text-primary mx-auto" />
                        <h3 className="text-lg font-semibold">Ready to Submit</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            This merge request will be sent for approval:
                        </p>
                        <div className="flex items-center justify-center gap-3 text-sm">
                            <Badge variant="outline">1. CS Head Review</Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline">2. CEO Approval</Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Badge className="bg-emerald-500">Merge Executed</Badge>
                        </div>
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                            <p><strong>{selectedDuplicate?.full_name}</strong> will be merged into <strong>{student?.full_name}</strong></p>
                            <p className="text-xs text-muted-foreground mt-1">The secondary record will be archived after approval.</p>
                        </div>
                    </div>
                )}

                <DialogFooter className="flex gap-2">
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={submitting}>
                            Back
                        </Button>
                    )}
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
                    {step === 1 && selectedDuplicate && (
                        <Button onClick={() => fetchPreview(selectedDuplicate)} disabled={loading} data-testid="merge-next-btn">
                            {loading ? 'Loading...' : 'Next: Review Merge'}
                        </Button>
                    )}
                    {step === 2 && (
                        <Button onClick={() => setStep(3)} data-testid="merge-confirm-btn">
                            Looks Good — Proceed
                        </Button>
                    )}
                    {step === 3 && (
                        <Button onClick={submitMerge} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="merge-submit-btn">
                            {submitting ? 'Submitting...' : 'Submit for Approval'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

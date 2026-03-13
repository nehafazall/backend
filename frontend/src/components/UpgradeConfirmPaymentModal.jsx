import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import {
    Check, ArrowRight, Upload, ImageIcon, X, Loader2,
    CreditCard, Building2, Wallet, Smartphone, DollarSign, CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { UPGRADE_PATHS } from './UpgradePricingModal';

const PAYMENT_METHODS = [
    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
    { id: 'credit_card', label: 'Credit/Debit Card', icon: CreditCard },
    { id: 'cash', label: 'Cash', icon: Wallet },
    { id: 'tabby', label: 'Tabby (BNPL)', icon: Smartphone },
    { id: 'tamara', label: 'Tamara (BNPL)', icon: Smartphone },
    { id: 'network', label: 'Network', icon: CreditCard },
    { id: 'upi', label: 'UPI / Mobile', icon: Smartphone },
    { id: 'cheque', label: 'Cheque', icon: DollarSign },
];

const UpgradeConfirmPaymentModal = ({ open, onClose, student, onConfirmComplete }) => {
    const [step, setStep] = useState(1); // 1: confirm package, 2: payment
    const [changeType, setChangeType] = useState('same'); // same, upgraded, downgraded
    const [finalPath, setFinalPath] = useState(student?.pitched_upgrade_path || '');
    const [finalPrice, setFinalPrice] = useState(student?.pitched_upgrade_price || 0);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [proofPreview, setProofPreview] = useState(null);
    const [proofBase64, setProofBase64] = useState(null);
    const [proofFilename, setProofFilename] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Reset on open
    React.useEffect(() => {
        if (open && student) {
            setStep(1);
            setChangeType('same');
            setFinalPath(student.pitched_upgrade_path || '');
            setFinalPrice(student.pitched_upgrade_price || 0);
            setPaymentMethod('');
            setTransactionId('');
            setPaymentNotes('');
            setProofPreview(null);
            setProofBase64(null);
            setProofFilename('');
        }
    }, [open, student]);

    const pitchedPath = UPGRADE_PATHS.find(p => p.id === student?.pitched_upgrade_path);
    const activePath = UPGRADE_PATHS.find(p => p.id === finalPath);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File too large (max 5MB)');
            return;
        }
        setProofFilename(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setProofBase64(ev.target.result);
            setProofPreview(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!paymentMethod) {
            toast.error('Please select a payment method');
            return;
        }
        setSubmitting(true);
        try {
            const res = await apiClient.post(`/cs/confirm-upgrade/${student.id}`, {
                upgrade_path: finalPath,
                selected_price: finalPrice,
                change_type: changeType,
                payment_method: paymentMethod,
                payment_proof: proofBase64,
                payment_proof_filename: proofFilename,
                payment_notes: paymentNotes,
                transaction_id: transactionId,
            });
            const commissions = res.data.commissions;
            toast.success(
                `Upgrade confirmed! Agent: AED ${commissions.agent.amount}, Head: AED ${commissions.head.amount}`
            );
            onConfirmComplete(res.data.student);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to confirm upgrade');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl" data-testid="upgrade-confirm-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        Confirm Upgrade — {student?.full_name}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Verify the upgrade package' : 'Add payment details & proof'}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Confirm Package */}
                {step === 1 && (
                    <div className="space-y-4 py-2">
                        {/* What was pitched */}
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Originally Pitched</p>
                                <div className="flex items-center gap-3">
                                    <Badge className={pitchedPath?.badgeClass}>{pitchedPath?.label || 'N/A'}</Badge>
                                    <span className="text-xl font-bold font-mono">AED {student?.pitched_upgrade_price?.toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Same or changed? */}
                        <div className="space-y-3">
                            <Label>Was the final package the same as pitched?</Label>
                            <RadioGroup value={changeType} onValueChange={setChangeType} className="space-y-2">
                                <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
                                    <RadioGroupItem value="same" id="same" />
                                    <Label htmlFor="same" className="cursor-pointer flex-1">
                                        Same as pitched
                                    </Label>
                                    <Check className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
                                    <RadioGroupItem value="upgraded" id="upgraded" />
                                    <Label htmlFor="upgraded" className="cursor-pointer flex-1">
                                        Student upgraded to a higher package
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
                                    <RadioGroupItem value="downgraded" id="downgraded" />
                                    <Label htmlFor="downgraded" className="cursor-pointer flex-1">
                                        Student opted for a lower package
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* If changed, allow re-selecting */}
                        {changeType !== 'same' && (
                            <div className="space-y-3 pt-2">
                                <Label>Select the actual upgrade package:</Label>
                                {/* Path selection */}
                                <div className="grid grid-cols-3 gap-2">
                                    {UPGRADE_PATHS.map(path => (
                                        <Card
                                            key={path.id}
                                            className={`cursor-pointer border-2 transition-all text-center ${finalPath === path.id ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}
                                            onClick={() => { setFinalPath(path.id); setFinalPrice(0); }}
                                        >
                                            <CardContent className="p-3">
                                                <p className="text-xs font-medium">{path.label}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {/* Price selection */}
                                {activePath && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {activePath.prices.map(p => (
                                            <Card
                                                key={p.amount}
                                                className={`cursor-pointer border-2 transition-all text-center ${finalPrice === p.amount ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}
                                                onClick={() => setFinalPrice(p.amount)}
                                            >
                                                <CardContent className="p-3">
                                                    <p className="text-lg font-bold font-mono">AED {p.amount.toLocaleString()}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!finalPath || !finalPrice}
                                data-testid="next-to-payment-btn"
                            >
                                Next: Payment Details <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 2: Payment Details */}
                {step === 2 && (
                    <div className="space-y-4 py-2">
                        {/* Summary */}
                        <Card className="bg-emerald-500/10 border-emerald-500/30">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Final Package</p>
                                    <p className="font-semibold">{activePath?.label}</p>
                                </div>
                                <p className="text-2xl font-bold font-mono text-emerald-500">AED {finalPrice?.toLocaleString()}</p>
                            </CardContent>
                        </Card>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <Label>Payment Method *</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {PAYMENT_METHODS.map(m => {
                                    const Icon = m.icon;
                                    const isActive = paymentMethod === m.id;
                                    return (
                                        <Card
                                            key={m.id}
                                            className={`cursor-pointer border-2 transition-all ${isActive ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}
                                            onClick={() => setPaymentMethod(m.id)}
                                            data-testid={`pay-${m.id}`}
                                        >
                                            <CardContent className="p-2 text-center">
                                                <Icon className={`h-4 w-4 mx-auto mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <p className="text-xs">{m.label}</p>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Transaction ID */}
                        <div className="space-y-2">
                            <Label>Transaction / Reference ID</Label>
                            <Input
                                value={transactionId}
                                onChange={e => setTransactionId(e.target.value)}
                                placeholder="Enter transaction reference"
                                data-testid="txn-id-input"
                            />
                        </div>

                        {/* Payment Proof */}
                        <div className="space-y-2">
                            <Label>Payment Screenshot / Proof</Label>
                            <div
                                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                                data-testid="upload-proof"
                            >
                                {proofPreview ? (
                                    <div className="relative inline-block">
                                        <img src={proofPreview} alt="proof" className="max-h-32 rounded-lg mx-auto" />
                                        <button
                                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                                            onClick={(e) => { e.stopPropagation(); setProofPreview(null); setProofBase64(null); setProofFilename(''); }}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        <p className="text-xs text-muted-foreground mt-2">{proofFilename}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Click to upload payment proof</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={paymentNotes}
                                onChange={e => setPaymentNotes(e.target.value)}
                                placeholder="Any additional notes..."
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || !paymentMethod}
                                className="bg-emerald-600 hover:bg-emerald-700"
                                data-testid="confirm-upgrade-btn"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirm Upgrade & Submit
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default UpgradeConfirmPaymentModal;

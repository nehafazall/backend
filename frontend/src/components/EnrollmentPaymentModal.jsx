import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
    CreditCard, 
    Upload, 
    Building2, 
    Wallet,
    Smartphone,
    DollarSign,
    CheckCircle2,
    ImageIcon,
    X,
    Loader2,
    Plus,
    Trash2,
    Phone,
    SplitSquareVertical
} from 'lucide-react';

const PAYMENT_METHODS = [
    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Direct bank transfer', settlement: 'immediate', requiresProof: true },
    { id: 'credit_card', label: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, etc.', settlement: 'immediate', requiresProof: true },
    { id: 'cash', label: 'Cash', icon: Wallet, description: 'In-person cash', settlement: 'immediate', requiresProof: false },
    { id: 'tabby', label: 'Tabby', icon: Smartphone, description: 'BNPL - Settles Monday', settlement: 'weekly_monday', requiresProof: true, isBNPL: true },
    { id: 'tamara', label: 'Tamara', icon: Smartphone, description: 'BNPL - Settles 7 days', settlement: '7_days', requiresProof: true, isBNPL: true },
    { id: 'network', label: 'Network', icon: CreditCard, description: 'Settles T+1', settlement: 't_plus_1', requiresProof: true },
    { id: 'upi', label: 'UPI / Mobile', icon: Smartphone, description: 'Google Pay, PhonePe', settlement: 'immediate', requiresProof: true },
    { id: 'cheque', label: 'Cheque', icon: DollarSign, description: 'Manual settlement', settlement: 'manual', requiresProof: true },
];

const EMPTY_PAYMENT_SPLIT = {
    method: '',
    amount: '',
    transaction_id: '',
    phone_number: '',
    is_same_number: true,
    proof: null,
    proof_preview: null,
};

const EnrollmentPaymentModal = ({ 
    open, 
    onClose, 
    lead,
    course,
    onComplete 
}) => {
    const [isSplitPayment, setIsSplitPayment] = useState(false);
    const [paymentSplits, setPaymentSplits] = useState([{ ...EMPTY_PAYMENT_SPLIT }]);
    
    // Single payment mode
    const [formData, setFormData] = useState({
        payment_method: '',
        transaction_id: '',
        payment_amount: course?.base_price || lead?.estimated_value || 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_notes: '',
        bnpl_phone: lead?.phone || '',
        bnpl_same_number: true,
    });
    const [paymentProof, setPaymentProof] = useState(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const fileInputRef = useRef(null);
    const splitFileInputRefs = useRef([]);

    const totalAmount = course?.base_price || lead?.estimated_value || 0;

    const handleFileChange = (e, splitIndex = null) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file (JPG, PNG, etc.)');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size must be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                if (splitIndex !== null) {
                    const newSplits = [...paymentSplits];
                    newSplits[splitIndex].proof = file;
                    newSplits[splitIndex].proof_preview = reader.result;
                    setPaymentSplits(newSplits);
                } else {
                    setPaymentProof(file);
                    setPaymentProofPreview(reader.result);
                }
            };
            reader.readAsDataURL(file);
            
            if (errors.payment_proof) {
                setErrors(prev => ({ ...prev, payment_proof: null }));
            }
        }
    };

    const removePaymentProof = (splitIndex = null) => {
        if (splitIndex !== null) {
            const newSplits = [...paymentSplits];
            newSplits[splitIndex].proof = null;
            newSplits[splitIndex].proof_preview = null;
            setPaymentSplits(newSplits);
        } else {
            setPaymentProof(null);
            setPaymentProofPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const addPaymentSplit = () => {
        setPaymentSplits([...paymentSplits, { ...EMPTY_PAYMENT_SPLIT }]);
    };

    const removePaymentSplit = (index) => {
        if (paymentSplits.length > 1) {
            const newSplits = paymentSplits.filter((_, i) => i !== index);
            setPaymentSplits(newSplits);
        }
    };

    const updatePaymentSplit = (index, field, value) => {
        const newSplits = [...paymentSplits];
        newSplits[index][field] = value;
        setPaymentSplits(newSplits);
    };

    const getSplitTotal = () => {
        return paymentSplits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
    };

    const getMethodConfig = (methodId) => {
        return PAYMENT_METHODS.find(m => m.id === methodId) || {};
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (isSplitPayment) {
            // Validate split payments
            const splitTotal = getSplitTotal();
            if (Math.abs(splitTotal - totalAmount) > 0.01) {
                newErrors.split_total = `Split total (AED ${splitTotal.toLocaleString()}) must equal total amount (AED ${totalAmount.toLocaleString()})`;
            }
            
            paymentSplits.forEach((split, idx) => {
                if (!split.method) {
                    newErrors[`split_${idx}_method`] = 'Select payment method';
                }
                if (!split.amount || parseFloat(split.amount) <= 0) {
                    newErrors[`split_${idx}_amount`] = 'Enter valid amount';
                }
                const config = getMethodConfig(split.method);
                if (config.requiresProof && !split.proof) {
                    newErrors[`split_${idx}_proof`] = 'Upload payment proof';
                }
                if (config.isBNPL && !split.is_same_number && !split.phone_number) {
                    newErrors[`split_${idx}_phone`] = 'Enter BNPL phone number';
                }
            });
        } else {
            // Single payment validation
            if (!formData.payment_method) {
                newErrors.payment_method = 'Please select a payment method';
            }
            if (!formData.payment_amount || formData.payment_amount <= 0) {
                newErrors.payment_amount = 'Please enter a valid payment amount';
            }
            
            const config = getMethodConfig(formData.payment_method);
            if (config.requiresProof && !paymentProof) {
                newErrors.payment_proof = 'Payment screenshot/proof is required';
            }
            if (config.isBNPL && !formData.bnpl_same_number && !formData.bnpl_phone) {
                newErrors.bnpl_phone = 'Enter BNPL phone number';
            }
            if (!formData.payment_date) {
                newErrors.payment_date = 'Please select the payment date';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            toast.error('Please complete all required fields');
            return;
        }
        
        setUploading(true);
        
        try {
            if (isSplitPayment) {
                // Process split payments
                const processedSplits = await Promise.all(paymentSplits.map(async (split) => {
                    let proofBase64 = null;
                    if (split.proof) {
                        proofBase64 = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(split.proof);
                        });
                    }
                    return {
                        method: split.method,
                        amount: parseFloat(split.amount),
                        transaction_id: split.transaction_id,
                        phone_number: split.phone_number,
                        is_same_number: split.is_same_number,
                        proof: proofBase64,
                    };
                }));
                
                onComplete({
                    is_split_payment: true,
                    payment_splits: processedSplits,
                    payment_amount: totalAmount,
                    payment_date: formData.payment_date,
                    payment_notes: formData.payment_notes,
                    payment_method: processedSplits.map(s => s.method).join('+'),
                });
            } else {
                // Single payment
                let paymentProofBase64 = null;
                if (paymentProof) {
                    paymentProofBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(paymentProof);
                    });
                }
                
                onComplete({
                    is_split_payment: false,
                    payment_method: formData.payment_method,
                    transaction_id: formData.transaction_id,
                    payment_amount: parseFloat(formData.payment_amount),
                    payment_date: formData.payment_date,
                    payment_notes: formData.payment_notes,
                    payment_proof: paymentProofBase64,
                    payment_proof_filename: paymentProof?.name || null,
                    bnpl_phone: formData.bnpl_phone,
                    bnpl_same_number: formData.bnpl_same_number,
                });
            }
        } catch (error) {
            toast.error('Failed to process payment details');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            payment_method: '',
            transaction_id: '',
            payment_amount: course?.base_price || lead?.estimated_value || 0,
            payment_date: new Date().toISOString().split('T')[0],
            payment_notes: '',
            bnpl_phone: lead?.phone || '',
            bnpl_same_number: true,
        });
        setPaymentProof(null);
        setPaymentProofPreview(null);
        setPaymentSplits([{ ...EMPTY_PAYMENT_SPLIT }]);
        setIsSplitPayment(false);
        setErrors({});
        onClose();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const selectedMethodConfig = getMethodConfig(formData.payment_method);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh]" data-testid="enrollment-payment-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <DollarSign className="h-6 w-6 text-emerald-500" />
                        Payment Details for Enrollment
                    </DialogTitle>
                    <DialogDescription>
                        Complete payment details for <strong>{lead?.full_name}</strong> enrolling in <strong>{course?.name || lead?.interested_course_name || 'Course'}</strong>
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6 py-4">
                        {/* Course & Amount Summary */}
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Course</p>
                                    <p className="font-medium">{course?.name || lead?.interested_course_name || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Amount</p>
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {formatCurrency(totalAmount)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Split Payment Toggle */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                                <SplitSquareVertical className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Split Payment</p>
                                    <p className="text-xs text-muted-foreground">Use multiple payment methods</p>
                                </div>
                            </div>
                            <Checkbox
                                checked={isSplitPayment}
                                onCheckedChange={(checked) => setIsSplitPayment(checked)}
                                data-testid="split-payment-toggle"
                            />
                        </div>

                        {isSplitPayment ? (
                            /* Split Payment Mode */
                            <div className="space-y-4">
                                {paymentSplits.map((split, idx) => {
                                    const methodConfig = getMethodConfig(split.method);
                                    const Icon = methodConfig.icon || CreditCard;
                                    
                                    return (
                                        <div key={idx} className="p-4 border rounded-lg space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Payment {idx + 1}</span>
                                                {paymentSplits.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removePaymentSplit(idx)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Payment Method *</Label>
                                                    <select
                                                        value={split.method}
                                                        onChange={(e) => updatePaymentSplit(idx, 'method', e.target.value)}
                                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                                    >
                                                        <option value="">Select method</option>
                                                        {PAYMENT_METHODS.map(m => (
                                                            <option key={m.id} value={m.id}>{m.label}</option>
                                                        ))}
                                                    </select>
                                                    {errors[`split_${idx}_method`] && (
                                                        <p className="text-xs text-red-500">{errors[`split_${idx}_method`]}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Amount (AED) *</Label>
                                                    <Input
                                                        type="number"
                                                        value={split.amount}
                                                        onChange={(e) => updatePaymentSplit(idx, 'amount', e.target.value)}
                                                        placeholder="Enter amount"
                                                    />
                                                    {errors[`split_${idx}_amount`] && (
                                                        <p className="text-xs text-red-500">{errors[`split_${idx}_amount`]}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label>Transaction ID</Label>
                                                <Input
                                                    value={split.transaction_id}
                                                    onChange={(e) => updatePaymentSplit(idx, 'transaction_id', e.target.value)}
                                                    placeholder="Enter transaction reference"
                                                />
                                            </div>
                                            
                                            {/* BNPL Phone Verification */}
                                            {methodConfig.isBNPL && (
                                                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-4 w-4 text-amber-600" />
                                                        <span className="text-sm font-medium text-amber-600">BNPL Phone Verification</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            checked={split.is_same_number}
                                                            onCheckedChange={(checked) => updatePaymentSplit(idx, 'is_same_number', checked)}
                                                        />
                                                        <Label className="text-sm">Same as customer phone ({lead?.phone})</Label>
                                                    </div>
                                                    {!split.is_same_number && (
                                                        <div className="space-y-1">
                                                            <Input
                                                                value={split.phone_number}
                                                                onChange={(e) => updatePaymentSplit(idx, 'phone_number', e.target.value)}
                                                                placeholder="Enter BNPL phone number"
                                                            />
                                                            {errors[`split_${idx}_phone`] && (
                                                                <p className="text-xs text-red-500">{errors[`split_${idx}_phone`]}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Payment Proof */}
                                            {methodConfig.requiresProof && (
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        Payment Proof
                                                        <Badge variant="destructive" className="text-xs">Required</Badge>
                                                    </Label>
                                                    {!split.proof_preview ? (
                                                        <div 
                                                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                                                                errors[`split_${idx}_proof`] ? 'border-red-500' : 'border-muted-foreground/30 hover:border-emerald-500/50'
                                                            }`}
                                                            onClick={() => splitFileInputRefs.current[idx]?.click()}
                                                        >
                                                            <input
                                                                ref={el => splitFileInputRefs.current[idx] = el}
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleFileChange(e, idx)}
                                                                className="hidden"
                                                            />
                                                            <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                                                            <p className="text-xs">Upload proof</p>
                                                        </div>
                                                    ) : (
                                                        <div className="relative border rounded p-2">
                                                            <img src={split.proof_preview} alt="Proof" className="max-h-24 mx-auto rounded" />
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                className="absolute top-1 right-1 h-5 w-5"
                                                                onClick={() => removePaymentProof(idx)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {errors[`split_${idx}_proof`] && (
                                                        <p className="text-xs text-red-500">{errors[`split_${idx}_proof`]}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                
                                <Button
                                    variant="outline"
                                    onClick={addPaymentSplit}
                                    className="w-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Another Payment Method
                                </Button>
                                
                                {/* Split Total */}
                                <div className={`p-3 rounded-lg flex justify-between items-center ${
                                    Math.abs(getSplitTotal() - totalAmount) < 0.01 
                                        ? 'bg-emerald-500/10 border border-emerald-500/30' 
                                        : 'bg-red-500/10 border border-red-500/30'
                                }`}>
                                    <span className="font-medium">Split Total:</span>
                                    <span className={`font-bold ${
                                        Math.abs(getSplitTotal() - totalAmount) < 0.01 ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                        {formatCurrency(getSplitTotal())} / {formatCurrency(totalAmount)}
                                    </span>
                                </div>
                                {errors.split_total && (
                                    <p className="text-sm text-red-500">{errors.split_total}</p>
                                )}
                            </div>
                        ) : (
                            /* Single Payment Mode */
                            <div className="space-y-4">
                                {/* Payment Method Selection */}
                                <div className="space-y-3">
                                    <Label>Payment Method *</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PAYMENT_METHODS.map((method) => {
                                            const Icon = method.icon;
                                            const isSelected = formData.payment_method === method.id;
                                            return (
                                                <div 
                                                    key={method.id}
                                                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                        isSelected 
                                                            ? 'border-emerald-500 bg-emerald-500/10' 
                                                            : 'border-border hover:border-emerald-500/50'
                                                    }`}
                                                    onClick={() => setFormData(prev => ({ ...prev, payment_method: method.id }))}
                                                >
                                                    <Icon className={`h-4 w-4 ${isSelected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-600' : ''}`}>
                                                            {method.label}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">{method.description}</p>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {errors.payment_method && (
                                        <p className="text-xs text-red-500">{errors.payment_method}</p>
                                    )}
                                </div>

                                {/* BNPL Phone Verification */}
                                {selectedMethodConfig.isBNPL && (
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-5 w-5 text-amber-600" />
                                            <span className="font-medium text-amber-600">BNPL Phone Verification</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Verify if the {selectedMethodConfig.label} account uses the same phone number
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={formData.bnpl_same_number}
                                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bnpl_same_number: checked }))}
                                            />
                                            <Label className="text-sm">Same as customer phone ({lead?.phone})</Label>
                                        </div>
                                        {!formData.bnpl_same_number && (
                                            <div className="space-y-1">
                                                <Label className="text-sm">BNPL Phone Number *</Label>
                                                <Input
                                                    value={formData.bnpl_phone}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, bnpl_phone: e.target.value }))}
                                                    placeholder="Enter phone number used for BNPL"
                                                />
                                                {errors.bnpl_phone && (
                                                    <p className="text-xs text-red-500">{errors.bnpl_phone}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Payment Details */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Payment Amount (AED) *</Label>
                                        <Input
                                            type="number"
                                            value={formData.payment_amount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: e.target.value }))}
                                            placeholder="Enter amount"
                                            className={errors.payment_amount ? 'border-red-500' : ''}
                                        />
                                        {errors.payment_amount && (
                                            <p className="text-xs text-red-500">{errors.payment_amount}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payment Date *</Label>
                                        <Input
                                            type="date"
                                            value={formData.payment_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                                            className={errors.payment_date ? 'border-red-500' : ''}
                                        />
                                        {errors.payment_date && (
                                            <p className="text-xs text-red-500">{errors.payment_date}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Transaction ID */}
                                <div className="space-y-2">
                                    <Label>Transaction ID / Reference Number</Label>
                                    <Input
                                        value={formData.transaction_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, transaction_id: e.target.value }))}
                                        placeholder="Enter transaction reference (optional)"
                                    />
                                </div>

                                {/* Payment Proof Upload */}
                                {selectedMethodConfig.requiresProof && (
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            Payment Screenshot / Proof
                                            <Badge variant="destructive" className="text-xs">Required</Badge>
                                        </Label>
                                        
                                        {!paymentProofPreview ? (
                                            <div 
                                                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                                    errors.payment_proof 
                                                        ? 'border-red-500 bg-red-500/5' 
                                                        : 'border-muted-foreground/30 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                                                }`}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange(e)}
                                                    className="hidden"
                                                />
                                                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                                <p className="text-sm font-medium">Click to upload payment proof</p>
                                                <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</p>
                                            </div>
                                        ) : (
                                            <div className="relative border rounded-lg p-2">
                                                <img src={paymentProofPreview} alt="Payment proof" className="max-h-48 mx-auto rounded" />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6"
                                                    onClick={() => removePaymentProof()}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                                    <ImageIcon className="h-4 w-4" />
                                                    {paymentProof?.name}
                                                </div>
                                            </div>
                                        )}
                                        {errors.payment_proof && (
                                            <p className="text-xs text-red-500">{errors.payment_proof}</p>
                                        )}
                                    </div>
                                )}

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label>Additional Notes</Label>
                                    <Textarea
                                        value={formData.payment_notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, payment_notes: e.target.value }))}
                                        placeholder="Any additional payment notes..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Common: Payment Date & Notes for Split */}
                        {isSplitPayment && (
                            <div className="space-y-4 pt-4 border-t">
                                <div className="space-y-2">
                                    <Label>Payment Date *</Label>
                                    <Input
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Additional Notes</Label>
                                    <Textarea
                                        value={formData.payment_notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, payment_notes: e.target.value }))}
                                        placeholder="Any additional payment notes..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="flex gap-2 border-t pt-4">
                    <Button variant="outline" onClick={handleClose} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={uploading}
                        data-testid="confirm-enrollment-btn"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Confirm Enrollment & Submit for Verification
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EnrollmentPaymentModal;

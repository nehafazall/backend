import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
    Loader2
} from 'lucide-react';

const PAYMENT_METHODS = [
    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Direct bank transfer or wire' },
    { id: 'credit_card', label: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, etc.' },
    { id: 'cash', label: 'Cash', icon: Wallet, description: 'In-person cash payment' },
    { id: 'upi', label: 'UPI / Mobile Payment', icon: Smartphone, description: 'Google Pay, PhonePe, etc.' },
    { id: 'cheque', label: 'Cheque', icon: DollarSign, description: 'Post-dated or current cheque' },
];

const EnrollmentPaymentModal = ({ 
    open, 
    onClose, 
    lead,
    course,
    onComplete 
}) => {
    const [formData, setFormData] = useState({
        payment_method: '',
        transaction_id: '',
        payment_amount: course?.base_price || lead?.estimated_value || 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_notes: '',
    });
    const [paymentProof, setPaymentProof] = useState(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file (JPG, PNG, etc.)');
                return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size must be less than 5MB');
                return;
            }
            
            setPaymentProof(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentProofPreview(reader.result);
            };
            reader.readAsDataURL(file);
            
            if (errors.payment_proof) {
                setErrors(prev => ({ ...prev, payment_proof: null }));
            }
        }
    };

    const removePaymentProof = () => {
        setPaymentProof(null);
        setPaymentProofPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.payment_method) {
            newErrors.payment_method = 'Please select a payment method';
        }
        
        if (!formData.payment_amount || formData.payment_amount <= 0) {
            newErrors.payment_amount = 'Please enter a valid payment amount';
        }
        
        // Payment proof is required for non-cash payments
        if (formData.payment_method !== 'cash' && !paymentProof) {
            newErrors.payment_proof = 'Payment screenshot/proof is required';
        }
        
        if (!formData.payment_date) {
            newErrors.payment_date = 'Please select the payment date';
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
            // Convert image to base64 for storage
            let paymentProofBase64 = null;
            if (paymentProof) {
                paymentProofBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(paymentProof);
                });
            }
            
            onComplete({
                payment_method: formData.payment_method,
                transaction_id: formData.transaction_id,
                payment_amount: parseFloat(formData.payment_amount),
                payment_date: formData.payment_date,
                payment_notes: formData.payment_notes,
                payment_proof: paymentProofBase64,
                payment_proof_filename: paymentProof?.name || null,
            });
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
        });
        setPaymentProof(null);
        setPaymentProofPreview(null);
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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="enrollment-payment-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <DollarSign className="h-6 w-6 text-emerald-500" />
                        Payment Details for Enrollment
                    </DialogTitle>
                    <DialogDescription>
                        Complete payment details for <strong>{lead?.full_name}</strong> enrolling in <strong>{course?.name || lead?.interested_course_name || 'Course'}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Course & Amount Summary */}
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Course</p>
                                <p className="font-medium">{course?.name || lead?.interested_course_name || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Amount</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {formatCurrency(formData.payment_amount)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">
                            Payment Method *
                        </Label>
                        <RadioGroup 
                            value={formData.payment_method}
                            onValueChange={(v) => {
                                setFormData(prev => ({ ...prev, payment_method: v }));
                                if (errors.payment_method) {
                                    setErrors(prev => ({ ...prev, payment_method: null }));
                                }
                            }}
                            className="grid grid-cols-2 gap-3"
                        >
                            {PAYMENT_METHODS.map((method) => {
                                const Icon = method.icon;
                                const isSelected = formData.payment_method === method.id;
                                return (
                                    <div 
                                        key={method.id}
                                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'border-emerald-500 bg-emerald-500/10' 
                                                : 'border-border hover:border-emerald-500/50'
                                        }`}
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, payment_method: method.id }));
                                            if (errors.payment_method) {
                                                setErrors(prev => ({ ...prev, payment_method: null }));
                                            }
                                        }}
                                    >
                                        <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                                        <Icon className={`h-5 w-5 ${isSelected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                        <div>
                                            <p className={`font-medium text-sm ${isSelected ? 'text-emerald-600' : ''}`}>
                                                {method.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{method.description}</p>
                                        </div>
                                        {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />}
                                    </div>
                                );
                            })}
                        </RadioGroup>
                        {errors.payment_method && (
                            <p className="text-xs text-red-500">{errors.payment_method}</p>
                        )}
                    </div>

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
                                data-testid="payment-amount-input"
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
                                data-testid="payment-date-input"
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
                            data-testid="transaction-id-input"
                        />
                    </div>

                    {/* Payment Proof Upload */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            Payment Screenshot / Proof
                            {formData.payment_method !== 'cash' && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
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
                                    onChange={handleFileChange}
                                    className="hidden"
                                    data-testid="payment-proof-input"
                                />
                                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm font-medium">Click to upload payment proof</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    JPG, PNG up to 5MB
                                </p>
                            </div>
                        ) : (
                            <div className="relative border rounded-lg p-2">
                                <img 
                                    src={paymentProofPreview} 
                                    alt="Payment proof" 
                                    className="max-h-48 mx-auto rounded"
                                />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={removePaymentProof}
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

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Additional Notes</Label>
                        <Textarea
                            value={formData.payment_notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, payment_notes: e.target.value }))}
                            placeholder="Any additional payment notes..."
                            rows={2}
                            data-testid="payment-notes-input"
                        />
                    </div>
                </div>

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

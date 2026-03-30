import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
    CheckCircle2, 
    AlertCircle, 
    User, 
    Building2, 
    BookOpen, 
    Shield, 
    FileCheck 
} from 'lucide-react';

const INITIAL_STATE = {
    // Section 1: Account Opening & Verification
    trading_account_status: '',
    broker_name: 'MILES CAPITALS',
    trading_account_number: '',
    kyc_completed: '',
    
    // Section 2: Access & Onboarding Confirmation
    student_id_issued: false,
    community_whatsapp: false,
    community_trade_group: false,
    community_announcement: false,
    timetable_shared: false,
    demo_video_shared: false,
    guided_demo_booking: '',
    
    // Section 3: Profiling (Safety & Compliance)
    trading_experience: '',
    previous_education: '',
    previous_losses: '',
    
    // Section 4: Compliance Confirmation
    risk_disclosure_explained: false,
    no_profit_guarantee_confirmed: false,
    
    // Final Confirmation
    cs_confirmation: false,
};

const ActivationQuestionnaireModal = ({ 
    open, 
    onClose, 
    student, 
    onComplete 
}) => {
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [errors, setErrors] = useState({});

    const handleCheckboxChange = (field) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleRadioChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Required fields validation
        if (!formData.trading_account_status) {
            newErrors.trading_account_status = 'Please select trading account status';
        }
        
        if (!formData.trading_account_number?.trim()) {
            // MT5 account number is optional - can be added later
            // No validation error
        }
        
        if (!formData.kyc_completed) {
            newErrors.kyc_completed = 'Please select KYC status';
        }
        
        // Community groups - all required
        if (!formData.community_whatsapp || !formData.community_trade_group || !formData.community_announcement) {
            newErrors.communities = 'All community groups must be checked to activate';
        }
        
        if (!formData.timetable_shared) {
            newErrors.timetable_shared = 'Class timetable must be shared';
        }
        
        if (!formData.demo_video_shared) {
            newErrors.demo_video_shared = 'Demo class booking video must be shared';
        }
        
        if (!formData.guided_demo_booking) {
            newErrors.guided_demo_booking = 'Please confirm demo class booking guidance';
        }
        
        if (!formData.trading_experience) {
            newErrors.trading_experience = 'Please select trading experience level';
        }
        
        if (!formData.previous_education) {
            newErrors.previous_education = 'Please select previous education status';
        }
        
        if (!formData.previous_losses) {
            newErrors.previous_losses = 'Please select previous losses status';
        }
        
        if (!formData.risk_disclosure_explained) {
            newErrors.risk_disclosure_explained = 'Risk disclosure must be explained';
        }
        
        if (!formData.no_profit_guarantee_confirmed) {
            newErrors.no_profit_guarantee_confirmed = 'Student must confirm understanding of no profit guarantee';
        }
        
        if (!formData.cs_confirmation) {
            newErrors.cs_confirmation = 'Final confirmation is required to proceed';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onComplete({
                ...formData,
                completed_at: new Date().toISOString(),
            });
        } else {
            toast.error('Please complete all required fields');
        }
    };

    const handleClose = () => {
        setFormData(INITIAL_STATE);
        setErrors({});
        onClose();
    };

    const allCommunitiesChecked = formData.community_whatsapp && 
                                   formData.community_trade_group && 
                                   formData.community_announcement;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh]" data-testid="activation-questionnaire-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FileCheck className="h-6 w-6 text-emerald-500" />
                        Student Activation Questionnaire
                    </DialogTitle>
                    <DialogDescription>
                        Complete this checklist to activate <strong>{student?.full_name}</strong>. 
                        All required fields must be completed within the 30-minute SLA.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-8 pb-4">
                        
                        {/* SECTION 1: Account Opening & Verification */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/30">
                                <Building2 className="h-5 w-5 text-emerald-500" />
                                <h3 className="font-semibold text-emerald-500">
                                    SECTION 1: Account Opening & Verification
                                </h3>
                            </div>
                            
                            {/* Trading Account Status */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    1. Trading Account Status *
                                </Label>
                                <RadioGroup 
                                    value={formData.trading_account_status}
                                    onValueChange={(v) => handleRadioChange('trading_account_status', v)}
                                    className="flex flex-col gap-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="opened" id="acc-opened" />
                                        <Label htmlFor="acc-opened" className="cursor-pointer">
                                            Account opened successfully
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="pending" id="acc-pending" />
                                        <Label htmlFor="acc-pending" className="cursor-pointer">
                                            Pending – In process
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="not_opened" id="acc-not-opened" />
                                        <Label htmlFor="acc-not-opened" className="cursor-pointer">
                                            Not opened
                                        </Label>
                                    </div>
                                </RadioGroup>
                                {errors.trading_account_status && (
                                    <p className="text-xs text-red-500">{errors.trading_account_status}</p>
                                )}
                            </div>
                            
                            {/* Broker Name */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">2. Broker Name</Label>
                                <Input
                                    value={formData.broker_name}
                                    onChange={(e) => handleInputChange('broker_name', e.target.value)}
                                    placeholder="Enter broker name"
                                    data-testid="broker-name-input"
                                />
                            </div>
                            
                            {/* Trading Account Number */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    3. Trading Account Number (MT5)
                                    <Badge variant="outline" className="ml-2 text-xs">Optional — can be added later</Badge>
                                </Label>
                                <Input
                                    value={formData.trading_account_number}
                                    onChange={(e) => handleInputChange('trading_account_number', e.target.value)}
                                    placeholder="Enter MT5 account number (optional)"
                                    className={errors.trading_account_number ? 'border-red-500' : ''}
                                    data-testid="trading-account-input"
                                />
                                {errors.trading_account_number && (
                                    <p className="text-xs text-red-500">{errors.trading_account_number}</p>
                                )}
                            </div>
                            
                            {/* KYC Verification */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    4. Has KYC / Broker Verification been completed? *
                                </Label>
                                <RadioGroup 
                                    value={formData.kyc_completed}
                                    onValueChange={(v) => handleRadioChange('kyc_completed', v)}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="kyc-yes" />
                                        <Label htmlFor="kyc-yes" className="cursor-pointer">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="pending" id="kyc-pending" />
                                        <Label htmlFor="kyc-pending" className="cursor-pointer">Pending</Label>
                                    </div>
                                </RadioGroup>
                                {errors.kyc_completed && (
                                    <p className="text-xs text-red-500">{errors.kyc_completed}</p>
                                )}
                            </div>
                        </div>

                        {/* SECTION 2: Access & Onboarding Confirmation */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-500/30">
                                <BookOpen className="h-5 w-5 text-blue-500" />
                                <h3 className="font-semibold text-blue-500">
                                    SECTION 2: Access & Onboarding Confirmation
                                </h3>
                            </div>
                            
                            {/* Student ID Issued */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="student-id"
                                    checked={formData.student_id_issued}
                                    onCheckedChange={() => handleCheckboxChange('student_id_issued')}
                                />
                                <Label htmlFor="student-id" className="cursor-pointer">
                                    5. Student ID Issued
                                </Label>
                            </div>
                            
                            {/* Community Groups */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    6. Student Added to Official CLT Communities *
                                    <Badge variant="secondary" className="ml-2 text-xs">All required</Badge>
                                </Label>
                                <div className="space-y-2 ml-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="community-whatsapp"
                                            checked={formData.community_whatsapp}
                                            onCheckedChange={() => handleCheckboxChange('community_whatsapp')}
                                        />
                                        <Label htmlFor="community-whatsapp" className="cursor-pointer">
                                            WhatsApp Community
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="community-trade"
                                            checked={formData.community_trade_group}
                                            onCheckedChange={() => handleCheckboxChange('community_trade_group')}
                                        />
                                        <Label htmlFor="community-trade" className="cursor-pointer">
                                            Trade Group
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="community-announcement"
                                            checked={formData.community_announcement}
                                            onCheckedChange={() => handleCheckboxChange('community_announcement')}
                                        />
                                        <Label htmlFor="community-announcement" className="cursor-pointer">
                                            Announcement Group
                                        </Label>
                                    </div>
                                </div>
                                {errors.communities && (
                                    <p className="text-xs text-red-500 ml-4">{errors.communities}</p>
                                )}
                                {allCommunitiesChecked && (
                                    <div className="flex items-center gap-1 ml-4 text-emerald-500 text-sm">
                                        <CheckCircle2 className="h-4 w-4" />
                                        All communities added
                                    </div>
                                )}
                            </div>
                            
                            {/* Timetable Shared */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="timetable"
                                    checked={formData.timetable_shared}
                                    onCheckedChange={() => handleCheckboxChange('timetable_shared')}
                                />
                                <Label htmlFor="timetable" className="cursor-pointer">
                                    7. Class Timetable Shared *
                                </Label>
                            </div>
                            {errors.timetable_shared && (
                                <p className="text-xs text-red-500 ml-6">{errors.timetable_shared}</p>
                            )}
                            
                            {/* Demo Video Shared */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="demo-video"
                                    checked={formData.demo_video_shared}
                                    onCheckedChange={() => handleCheckboxChange('demo_video_shared')}
                                />
                                <Label htmlFor="demo-video" className="cursor-pointer">
                                    8. Demo Class Booking Video Shared *
                                </Label>
                            </div>
                            {errors.demo_video_shared && (
                                <p className="text-xs text-red-500 ml-6">{errors.demo_video_shared}</p>
                            )}
                            
                            {/* Demo Booking Guidance */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    9. CS Guided Student on How to Book Demo Class *
                                </Label>
                                <RadioGroup 
                                    value={formData.guided_demo_booking}
                                    onValueChange={(v) => handleRadioChange('guided_demo_booking', v)}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="guided" id="demo-guided" />
                                        <Label htmlFor="demo-guided" className="cursor-pointer">
                                            Yes – Guided on call
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="not_yet" id="demo-not-yet" />
                                        <Label htmlFor="demo-not-yet" className="cursor-pointer">
                                            Not yet
                                        </Label>
                                    </div>
                                </RadioGroup>
                                {errors.guided_demo_booking && (
                                    <p className="text-xs text-red-500">{errors.guided_demo_booking}</p>
                                )}
                            </div>
                        </div>

                        {/* SECTION 3: Profiling (Safety & Compliance) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-amber-500/30">
                                <User className="h-5 w-5 text-amber-500" />
                                <h3 className="font-semibold text-amber-500">
                                    SECTION 3: Profiling (Safety & Compliance)
                                </h3>
                            </div>
                            
                            {/* Trading Experience */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    10. Student Trading Experience *
                                </Label>
                                <RadioGroup 
                                    value={formData.trading_experience}
                                    onValueChange={(v) => handleRadioChange('trading_experience', v)}
                                    className="flex flex-col gap-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no_experience" id="exp-none" />
                                        <Label htmlFor="exp-none" className="cursor-pointer">No experience</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="beginner" id="exp-beginner" />
                                        <Label htmlFor="exp-beginner" className="cursor-pointer">
                                            Beginner (&lt;6 months)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="intermediate" id="exp-intermediate" />
                                        <Label htmlFor="exp-intermediate" className="cursor-pointer">
                                            Intermediate
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="experienced" id="exp-experienced" />
                                        <Label htmlFor="exp-experienced" className="cursor-pointer">
                                            Experienced
                                        </Label>
                                    </div>
                                </RadioGroup>
                                {errors.trading_experience && (
                                    <p className="text-xs text-red-500">{errors.trading_experience}</p>
                                )}
                            </div>
                            
                            {/* Previous Education */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    11. Has the student taken trading education before? *
                                </Label>
                                <RadioGroup 
                                    value={formData.previous_education}
                                    onValueChange={(v) => handleRadioChange('previous_education', v)}
                                    className="flex flex-col gap-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="edu-no" />
                                        <Label htmlFor="edu-no" className="cursor-pointer">No</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes_course" id="edu-course" />
                                        <Label htmlFor="edu-course" className="cursor-pointer">
                                            Yes – Course
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="signals_only" id="edu-signals" />
                                        <Label htmlFor="edu-signals" className="cursor-pointer">
                                            Only signals/groups
                                        </Label>
                                    </div>
                                </RadioGroup>
                                {errors.previous_education && (
                                    <p className="text-xs text-red-500">{errors.previous_education}</p>
                                )}
                            </div>
                            
                            {/* Previous Losses */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    12. Has the student faced major losses previously? *
                                </Label>
                                <RadioGroup 
                                    value={formData.previous_losses}
                                    onValueChange={(v) => handleRadioChange('previous_losses', v)}
                                    className="flex flex-col gap-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="loss-no" />
                                        <Label htmlFor="loss-no" className="cursor-pointer">No</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="minor" id="loss-minor" />
                                        <Label htmlFor="loss-minor" className="cursor-pointer">
                                            Minor losses
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="significant" id="loss-significant" />
                                        <Label htmlFor="loss-significant" className="cursor-pointer">
                                            Significant losses
                                        </Label>
                                    </div>
                                </RadioGroup>
                                {errors.previous_losses && (
                                    <p className="text-xs text-red-500">{errors.previous_losses}</p>
                                )}
                            </div>
                        </div>

                        {/* SECTION 4: Compliance Confirmation */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-red-500/30">
                                <Shield className="h-5 w-5 text-red-500" />
                                <h3 className="font-semibold text-red-500">
                                    SECTION 4: Compliance Confirmation
                                </h3>
                            </div>
                            
                            {/* Risk Disclosure */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="risk-disclosure"
                                    checked={formData.risk_disclosure_explained}
                                    onCheckedChange={() => handleCheckboxChange('risk_disclosure_explained')}
                                />
                                <Label htmlFor="risk-disclosure" className="cursor-pointer">
                                    13. Risk Disclosure Explained to Student – Yes, Explained clearly *
                                </Label>
                            </div>
                            {errors.risk_disclosure_explained && (
                                <p className="text-xs text-red-500 ml-6">{errors.risk_disclosure_explained}</p>
                            )}
                            
                            {/* No Profit Guarantee */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="no-profit-guarantee"
                                    checked={formData.no_profit_guarantee_confirmed}
                                    onCheckedChange={() => handleCheckboxChange('no_profit_guarantee_confirmed')}
                                />
                                <Label htmlFor="no-profit-guarantee" className="cursor-pointer">
                                    14. Student Confirmed Understanding of No Profit Guarantee – Yes, Confirmed verbally *
                                </Label>
                            </div>
                            {errors.no_profit_guarantee_confirmed && (
                                <p className="text-xs text-red-500 ml-6">{errors.no_profit_guarantee_confirmed}</p>
                            )}
                        </div>

                        {/* FINAL ACTIVATION CONFIRMATION */}
                        <div className="space-y-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                <h3 className="font-semibold text-emerald-500">
                                    FINAL ACTIVATION CONFIRMATION
                                </h3>
                            </div>
                            
                            <div className="flex items-start space-x-2">
                                <Checkbox
                                    id="cs-confirmation"
                                    checked={formData.cs_confirmation}
                                    onCheckedChange={() => handleCheckboxChange('cs_confirmation')}
                                    className="mt-1"
                                />
                                <Label htmlFor="cs-confirmation" className="cursor-pointer text-sm">
                                    <strong>15. CS Confirmation:</strong> I confirm that the student's account is opened, 
                                    onboarding is completed, profiling is done, and all required access has been shared.
                                </Label>
                            </div>
                            {errors.cs_confirmation && (
                                <p className="text-xs text-red-500 ml-6">{errors.cs_confirmation}</p>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="flex gap-2 border-t pt-4">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        data-testid="confirm-activation-btn"
                    >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm & Proceed to Activation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ActivationQuestionnaireModal;

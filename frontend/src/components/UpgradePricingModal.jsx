import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TrendingUp, ArrowRight, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

const UPGRADE_PATHS = [
    {
        id: 'basic_to_intermediate',
        label: 'Basic / Intermediate',
        description: 'One-level upgrade',
        fromLabel: 'Basic',
        toLabel: 'Intermediate',
        color: 'from-orange-500/20 to-yellow-500/20 border-orange-400/40',
        badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        prices: [
            { amount: 1600, commission: 75 },
            { amount: 1999, commission: 100 },
            { amount: 2105, commission: 150 },
        ],
    },
    {
        id: 'intermediate_to_advanced',
        label: 'Intermediate to Advanced',
        description: 'Upgrade from Intermediate',
        fromLabel: 'Intermediate',
        toLabel: 'Advanced',
        color: 'from-yellow-500/20 to-green-500/20 border-yellow-400/40',
        badgeClass: 'bg-green-500/20 text-green-300 border-green-500/40',
        prices: [
            { amount: 3599, commission: 75 },
            { amount: 3899, commission: 150 },
            { amount: 4100, commission: 200 },
        ],
    },
    {
        id: 'basic_to_advanced',
        label: 'Basic to Advanced',
        description: 'Direct jump upgrade',
        fromLabel: 'Basic',
        toLabel: 'Advanced',
        color: 'from-orange-500/20 to-emerald-500/20 border-emerald-400/40',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        prices: [
            { amount: 5600, commission: 150 },
            { amount: 6000, commission: 250 },
            { amount: 6500, commission: 350 },
        ],
    },
];

const UpgradePricingModal = ({ open, onClose, student, onPitchComplete }) => {
    const [selectedPath, setSelectedPath] = useState(null);
    const [selectedPrice, setSelectedPrice] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleReset = () => {
        setSelectedPath(null);
        setSelectedPrice(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleSubmit = async () => {
        if (!selectedPath || !selectedPrice) return;
        setSubmitting(true);
        try {
            const res = await apiClient.post(`/cs/pitch-upgrade/${student.id}`, {
                upgrade_path: selectedPath,
                selected_price: selectedPrice,
            });
            toast.success(`Upgrade pitched: AED ${selectedPrice.toLocaleString()}`);
            onPitchComplete(res.data.student);
            handleReset();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to pitch upgrade');
        } finally {
            setSubmitting(false);
        }
    };

    const activePath = UPGRADE_PATHS.find(p => p.id === selectedPath);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl" data-testid="upgrade-pricing-modal">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                        Pitch Upgrade — {student?.full_name}
                    </DialogTitle>
                    <DialogDescription>
                        {student?.student_code && <span className="font-mono text-xs mr-2">ID: {student.student_code}</span>}
                        Select an upgrade path and price package
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Current info */}
                    <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/50">
                        <span className="text-muted-foreground">Current Package:</span>
                        <Badge variant="outline">{student?.current_course_name || student?.package_bought || 'N/A'}</Badge>
                        {student?.upgrade_count > 0 && (
                            <Badge variant="secondary" className="text-xs">x{student.upgrade_count} upgrades</Badge>
                        )}
                    </div>

                    {/* Step 1: Pick upgrade path */}
                    {!selectedPath && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">Choose upgrade path:</p>
                            {UPGRADE_PATHS.map(path => (
                                <Card
                                    key={path.id}
                                    className={`cursor-pointer border transition-all hover:scale-[1.01] bg-gradient-to-r ${path.color}`}
                                    onClick={() => setSelectedPath(path.id)}
                                    data-testid={`path-${path.id}`}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="text-xs">{path.fromLabel}</Badge>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            <Badge className={path.badgeClass}>{path.toLabel}</Badge>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold">
                                                AED {path.prices[0].amount.toLocaleString()} — {path.prices[path.prices.length - 1].amount.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{path.description}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Pick price within path */}
                    {selectedPath && activePath && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Select package for <span className="text-foreground font-semibold">{activePath.label}</span>:
                                </p>
                                <Button variant="ghost" size="sm" onClick={handleReset}>Change Path</Button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {activePath.prices.map((price, idx) => {
                                    const isSelected = selectedPrice === price.amount;
                                    return (
                                        <Card
                                            key={price.amount}
                                            className={`cursor-pointer transition-all border-2 ${isSelected ? 'border-primary ring-2 ring-primary/30 scale-[1.02]' : 'border-border hover:border-primary/40'}`}
                                            onClick={() => setSelectedPrice(price.amount)}
                                            data-testid={`price-${price.amount}`}
                                        >
                                            <CardContent className="p-4 text-center space-y-2">
                                                {isSelected && <Check className="h-4 w-4 text-primary mx-auto" />}
                                                <p className="text-2xl font-bold font-mono">
                                                    AED {price.amount.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Agent commission: <span className="text-emerald-500 font-semibold">AED {price.commission}</span>
                                                </p>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedPath || !selectedPrice || submitting}
                        data-testid="confirm-pitch-btn"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirm Pitch — AED {selectedPrice?.toLocaleString() || '...'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UpgradePricingModal;
export { UPGRADE_PATHS };

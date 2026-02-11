import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import { formatCurrency } from './utils';

// Simple journal entry - no dynamic lines for now
export const JournalModal = ({ open, onOpenChange, form, setForm, accounts, onSubmit }) => {
    const debitVal = parseFloat(form.debit) || 0;
    const creditVal = parseFloat(form.credit) || 0;
    const isBalanced = Math.abs(debitVal - creditVal) < 0.01 && debitVal > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Create Journal Entry</DialogTitle>
                    <DialogDescription>Simple double-entry journal</DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Entry description" />
                        </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Debit Account</Label>
                            <Select value={form.debit_account_id} onValueChange={(v) => setForm({ ...form, debit_account_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <AccountOptions accounts={accounts} />
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Debit Amount</Label>
                            <Input type="number" step="0.01" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value, credit: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Credit Account</Label>
                            <Select value={form.credit_account_id} onValueChange={(v) => setForm({ ...form, credit_account_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <AccountOptions accounts={accounts} />
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Credit Amount</Label>
                            <Input type="number" step="0.01" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Balance: {isBalanced ? <Badge className="bg-green-500">OK</Badge> : <Badge variant="destructive">Unbalanced</Badge>}</span>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!isBalanced}>Create Entry</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// Separate component for account options to avoid map in parent JSX
const AccountOptions = ({ accounts }) => {
    if (!accounts || accounts.length === 0) return null;
    return accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>);
};

const SimpleOptions = ({ accounts }) => {
    if (!accounts || accounts.length === 0) return null;
    return accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>);
};

export const ExpenseModal = ({ open, onOpenChange, form, setForm, expenseAccounts, bankAccounts, onSubmit }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Record Expense</DialogTitle>
                <DialogDescription>Create expense with automatic journal posting</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Amount (AED)</Label>
                        <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Vendor</Label>
                    <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Expense Category</Label>
                        <Select value={form.expense_account_id} onValueChange={(v) => setForm({ ...form, expense_account_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SimpleOptions accounts={expenseAccounts} />
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Paid From</Label>
                        <Select value={form.paid_from_account_id} onValueChange={(v) => setForm({ ...form, paid_from_account_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SimpleOptions accounts={bankAccounts} />
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" rows={2} />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">Record Expense</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
);

export const TransferModal = ({ open, onOpenChange, form, setForm, assetAccounts, onSubmit }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Account Transfer</DialogTitle>
                <DialogDescription>Transfer between accounts with automatic journal posting</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Amount (AED)</Label>
                        <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>From Account</Label>
                        <Select value={form.source_account_id} onValueChange={(v) => setForm({ ...form, source_account_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SimpleOptions accounts={assetAccounts} />
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>To Account</Label>
                        <Select value={form.destination_account_id} onValueChange={(v) => setForm({ ...form, destination_account_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SimpleOptions accounts={assetAccounts} />
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" rows={2} />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">Create Transfer</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
);

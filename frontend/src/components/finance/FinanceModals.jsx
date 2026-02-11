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

// Render account options outside JSX
const renderAccountOptions = (accounts) => {
    const items = [];
    for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        items.push(<SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>);
    }
    return items;
};

const renderSimpleOptions = (accounts) => {
    const items = [];
    for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        items.push(<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>);
    }
    return items;
};

// Journal Line Row
const JournalLineRow = ({ line, index, accounts, onUpdate }) => (
    <tr>
        <td className="p-2">
            <Select value={line.account_id} onValueChange={(v) => onUpdate(index, 'account_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="z-[9999]">{renderAccountOptions(accounts)}</SelectContent>
            </Select>
        </td>
        <td className="p-2">
            <Input type="number" step="0.01" value={line.debit_amount || ''} onChange={(e) => onUpdate(index, 'debit_amount', e.target.value)} className="text-right" />
        </td>
        <td className="p-2">
            <Input type="number" step="0.01" value={line.credit_amount || ''} onChange={(e) => onUpdate(index, 'credit_amount', e.target.value)} className="text-right" />
        </td>
        <td className="p-2">
            <Input value={line.memo || ''} onChange={(e) => onUpdate(index, 'memo', e.target.value)} placeholder="Optional" />
        </td>
    </tr>
);

// Render journal lines outside JSX
const renderJournalLines = (lines, accounts, updateLine) => {
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
        rows.push(<JournalLineRow key={i} line={lines[i]} index={i} accounts={accounts} onUpdate={updateLine} />);
    }
    return rows;
};

export const JournalModal = ({ open, onOpenChange, form, setForm, accounts, onSubmit, addLine, updateLine }) => {
    const totals = {
        debit: form.lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0),
        credit: form.lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0)
    };
    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Journal Entry</DialogTitle>
                    <DialogDescription>Double-entry accounting journal</DialogDescription>
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
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Journal Lines</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                <Plus className="h-3 w-3 mr-1" />Add Line
                            </Button>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Account</th>
                                    <th className="text-right p-2">Debit</th>
                                    <th className="text-right p-2">Credit</th>
                                    <th className="text-left p-2">Memo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderJournalLines(form.lines, accounts, updateLine)}
                                <tr className="font-bold border-t">
                                    <td className="p-2">Total</td>
                                    <td className="text-right p-2">{formatCurrency(totals.debit)}</td>
                                    <td className="text-right p-2">{formatCurrency(totals.credit)}</td>
                                    <td className="p-2">
                                        {isBalanced ? <Badge className="bg-green-500">Balanced</Badge> : <Badge variant="destructive">Unbalanced</Badge>}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
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
                            <SelectContent className="z-[9999]">{renderSimpleOptions(expenseAccounts)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Paid From</Label>
                        <Select value={form.paid_from_account_id} onValueChange={(v) => setForm({ ...form, paid_from_account_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent className="z-[9999]">{renderSimpleOptions(bankAccounts)}</SelectContent>
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
                            <SelectContent className="z-[9999]">{renderSimpleOptions(assetAccounts)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>To Account</Label>
                        <Select value={form.destination_account_id} onValueChange={(v) => setForm({ ...form, destination_account_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                            <SelectContent className="z-[9999]">{renderSimpleOptions(assetAccounts)}</SelectContent>
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

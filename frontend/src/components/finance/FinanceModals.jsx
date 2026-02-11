import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import { formatCurrency } from './utils';

// Journal Entry Modal
export const JournalModal = ({ 
    open, 
    onOpenChange, 
    form, 
    setForm, 
    accounts, 
    onSubmit,
    addLine,
    updateLine
}) => {
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
                            <Input 
                                type="date" 
                                value={form.entry_date} 
                                onChange={(e) => setForm({ ...form, entry_date: e.target.value })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input 
                                value={form.description} 
                                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                                placeholder="Entry description" 
                            />
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead>Memo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {form.lines.map((line, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Select 
                                                value={line.account_id} 
                                                onValueChange={(v) => updateLine(index, 'account_id', v)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                                                <SelectContent className="z-[9999]">
                                                    {accounts.map((acc) => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            {acc.code} - {acc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                value={line.debit_amount || ''} 
                                                onChange={(e) => updateLine(index, 'debit_amount', e.target.value)} 
                                                className="text-right" 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                value={line.credit_amount || ''} 
                                                onChange={(e) => updateLine(index, 'credit_amount', e.target.value)} 
                                                className="text-right" 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                value={line.memo || ''} 
                                                onChange={(e) => updateLine(index, 'memo', e.target.value)} 
                                                placeholder="Optional" 
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold">
                                    <TableCell>Total</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals.debit)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals.credit)}</TableCell>
                                    <TableCell>
                                        {isBalanced ? (
                                            <Badge className="bg-green-500">Balanced</Badge>
                                        ) : (
                                            <Badge variant="destructive">Unbalanced</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
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

// Expense Modal
export const ExpenseModal = ({
    open,
    onOpenChange,
    form,
    setForm,
    expenseAccounts,
    bankAccounts,
    onSubmit
}) => {
    return (
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
                            <Input 
                                type="date" 
                                value={form.date} 
                                onChange={(e) => setForm({ ...form, date: e.target.value })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (AED)</Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                value={form.amount} 
                                onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                                placeholder="0.00" 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Vendor</Label>
                        <Input 
                            value={form.vendor} 
                            onChange={(e) => setForm({ ...form, vendor: e.target.value })} 
                            placeholder="Vendor name" 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Expense Category</Label>
                            <Select 
                                value={form.expense_account_id} 
                                onValueChange={(v) => setForm({ ...form, expense_account_id: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    {expenseAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Paid From</Label>
                            <Select 
                                value={form.paid_from_account_id} 
                                onValueChange={(v) => setForm({ ...form, paid_from_account_id: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    {bankAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea 
                            value={form.notes} 
                            onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                            placeholder="Optional notes" 
                            rows={2} 
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Record Expense</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// Transfer Modal
export const TransferModal = ({
    open,
    onOpenChange,
    form,
    setForm,
    assetAccounts,
    onSubmit
}) => {
    return (
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
                            <Input 
                                type="date" 
                                value={form.date} 
                                onChange={(e) => setForm({ ...form, date: e.target.value })} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (AED)</Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                value={form.amount} 
                                onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                                placeholder="0.00" 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>From Account</Label>
                            <Select 
                                value={form.source_account_id} 
                                onValueChange={(v) => setForm({ ...form, source_account_id: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    {assetAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>To Account</Label>
                            <Select 
                                value={form.destination_account_id} 
                                onValueChange={(v) => setForm({ ...form, destination_account_id: v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    {assetAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea 
                            value={form.notes} 
                            onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                            placeholder="Optional notes" 
                            rows={2} 
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Create Transfer</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

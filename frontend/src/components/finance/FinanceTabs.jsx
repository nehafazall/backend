import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, Send, Check, Plus, ChevronRight, Building2 } from 'lucide-react';
import { formatCurrency, formatDate } from './utils';

// Journal Entries Tab
export const JournalTab = ({ entries, onNewEntry, onAction }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Journal Entries</h2>
            <Button onClick={onNewEntry} data-testid="new-journal-btn">
                <Plus className="h-4 w-4 mr-2" />New Entry
            </Button>
        </div>
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.map((entry) => (
                        <TableRow key={entry.id}>
                            <TableCell>{formatDate(entry.entry_date)}</TableCell>
                            <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                            <TableCell><Badge variant="outline">{entry.source_module}</Badge></TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(entry.total_debit)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(entry.total_credit)}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <Badge variant={entry.status === 'Approved' ? 'default' : entry.status === 'Submitted' ? 'secondary' : 'outline'}>
                                        {entry.status}
                                    </Badge>
                                    {entry.lock_status === 'LOCKED' && <Lock className="h-3 w-3 text-muted-foreground" />}
                                </div>
                            </TableCell>
                            <TableCell>
                                {entry.status === 'Draft' && (
                                    <Button size="sm" variant="outline" onClick={() => onAction(entry.id, 'submit')}>
                                        <Send className="h-3 w-3 mr-1" />Submit
                                    </Button>
                                )}
                                {entry.status === 'Submitted' && (
                                    <Button size="sm" variant="default" onClick={() => onAction(entry.id, 'approve')}>
                                        <Check className="h-3 w-3 mr-1" />Approve
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {entries.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No journal entries yet
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    </div>
);

// Settlements Tab
export const SettlementsTab = ({ settlements }) => (
    <div className="space-y-4">
        <h2 className="text-xl font-semibold">Settlement Batches</h2>
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="text-right">Fees</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {settlements.map((batch) => (
                        <TableRow key={batch.id} className={batch.is_overdue ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                            <TableCell className="font-medium">{batch.provider}</TableCell>
                            <TableCell>{formatDate(batch.period_start)} - {formatDate(batch.period_end)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(batch.gross_amount)}</TableCell>
                            <TableCell className="text-right font-mono">{batch.net_received ? formatCurrency(batch.net_received) : '-'}</TableCell>
                            <TableCell className="text-right font-mono text-red-600">{batch.fees_withheld ? formatCurrency(batch.fees_withheld) : '-'}</TableCell>
                            <TableCell>{formatDate(batch.expected_settlement_date)}</TableCell>
                            <TableCell>
                                <Badge variant={batch.status === 'Settled' ? 'default' : batch.is_overdue ? 'destructive' : 'secondary'}>
                                    {batch.is_overdue ? 'Overdue' : batch.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    {settlements.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No settlement batches yet
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    </div>
);

// Expenses Tab
export const ExpensesTab = ({ expenses, onNewExpense }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Expenses</h2>
            <Button onClick={onNewExpense} data-testid="new-expense-btn">
                <Plus className="h-4 w-4 mr-2" />Record Expense
            </Button>
        </div>
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Paid From</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                            <TableCell>{formatDate(expense.date)}</TableCell>
                            <TableCell className="font-medium">{expense.vendor}</TableCell>
                            <TableCell>{expense.expense_account_name}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                            <TableCell>{expense.paid_from_account_name}</TableCell>
                            <TableCell>
                                <Badge variant={expense.status === 'Approved' ? 'default' : 'secondary'}>{expense.status}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    {expenses.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                No expenses recorded yet
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    </div>
);

// Transfers Tab  
export const TransfersTab = ({ transfers, onNewTransfer }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Account Transfers</h2>
            <Button onClick={onNewTransfer} data-testid="new-transfer-btn">
                <Plus className="h-4 w-4 mr-2" />New Transfer
            </Button>
        </div>
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead></TableHead>
                        <TableHead>To</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                            <TableCell>{formatDate(transfer.date)}</TableCell>
                            <TableCell className="font-medium">{transfer.source_account_name}</TableCell>
                            <TableCell><ChevronRight className="h-4 w-4" /></TableCell>
                            <TableCell className="font-medium">{transfer.destination_account_name}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(transfer.amount, transfer.currency)}</TableCell>
                            <TableCell>
                                <Badge variant={transfer.status === 'Approved' ? 'default' : 'secondary'}>{transfer.status}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    {transfers.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                No transfers recorded yet
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    </div>
);

// Accounts Tab
export const AccountsTab = ({ accounts, onSeedAccounts }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Chart of Accounts</h2>
            {accounts.length === 0 && (
                <Button onClick={onSeedAccounts}>
                    <Plus className="h-4 w-4 mr-2" />Seed Default Accounts
                </Button>
            )}
        </div>
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Subtype</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {accounts.map((account) => (
                        <TableRow key={account.id}>
                            <TableCell className="font-mono">{account.code}</TableCell>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell><Badge variant="outline">{account.account_type}</Badge></TableCell>
                            <TableCell>{account.subtype}</TableCell>
                            <TableCell>{account.currency}</TableCell>
                            <TableCell>
                                <Badge variant={account.active ? 'default' : 'secondary'}>
                                    {account.active ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    </div>
);

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }) {
    if (total === 0) return null;

    return (
        <div className="flex items-center justify-between py-3 px-1 border-t border-border mt-4" data-testid="pagination-controls">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{total} records</span>
                <span className="mx-1">|</span>
                <span>Show</span>
                <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
                    <SelectTrigger className="w-[70px] h-8 text-xs" data-testid="page-size-select">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(size => (
                            <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span>per page</span>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1}
                    onClick={() => onPageChange(1)} data-testid="page-first">
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)} data-testid="page-prev">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3 font-medium">
                    Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)} data-testid="page-next">
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages}
                    onClick={() => onPageChange(totalPages)} data-testid="page-last">
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

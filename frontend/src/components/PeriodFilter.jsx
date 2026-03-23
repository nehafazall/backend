import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, addDays } from 'date-fns';

const PERIOD_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
];

function getDateRange(period) {
    const now = new Date();
    switch (period) {
        case 'today':
            return { from: startOfDay(now), to: endOfDay(now) };
        case 'tomorrow':
            return { from: startOfDay(addDays(now, 1)), to: endOfDay(addDays(now, 1)) };
        case 'this_week':
            return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
        case 'last_week': {
            const lw = subWeeks(now, 1);
            return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }) };
        }
        case 'this_month':
            return { from: startOfMonth(now), to: endOfMonth(now) };
        case 'last_month': {
            const lm = subMonths(now, 1);
            return { from: startOfMonth(lm), to: endOfMonth(lm) };
        }
        case 'this_quarter':
            return { from: startOfQuarter(now), to: endOfQuarter(now) };
        case 'last_quarter': {
            const lq = subQuarters(now, 1);
            return { from: startOfQuarter(lq), to: endOfQuarter(lq) };
        }
        case 'this_year':
            return { from: startOfYear(now), to: endOfYear(now) };
        default:
            return null;
    }
}

export const PeriodFilter = ({ onChange, dateFields, className = '' }) => {
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [selectedField, setSelectedField] = useState(dateFields?.[0]?.value || null);
    const [customRange, setCustomRange] = useState({ from: null, to: null });
    const [open, setOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);

    const handlePeriodSelect = (period) => {
        if (period === 'custom') {
            setShowCustom(true);
            setSelectedPeriod('custom');
            return;
        }
        setShowCustom(false);
        setSelectedPeriod(period);
        const range = getDateRange(period);
        if (range && onChange) {
            onChange({
                period,
                date_from: format(range.from, 'yyyy-MM-dd'),
                date_to: format(range.to, 'yyyy-MM-dd'),
                date_field: selectedField,
            });
        }
        setOpen(false);
    };

    const handleCustomApply = () => {
        if (customRange.from && onChange) {
            onChange({
                period: 'custom',
                date_from: format(customRange.from, 'yyyy-MM-dd'),
                date_to: customRange.to ? format(customRange.to, 'yyyy-MM-dd') : format(customRange.from, 'yyyy-MM-dd'),
                date_field: selectedField,
            });
        }
        setOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setSelectedPeriod(null);
        setShowCustom(false);
        setCustomRange({ from: null, to: null });
        if (onChange) onChange(null);
    };

    const handleFieldChange = (newField) => {
        setSelectedField(newField);
        if (selectedPeriod && selectedPeriod !== 'custom') {
            const range = getDateRange(selectedPeriod);
            if (range && onChange) {
                onChange({
                    period: selectedPeriod,
                    date_from: format(range.from, 'yyyy-MM-dd'),
                    date_to: format(range.to, 'yyyy-MM-dd'),
                    date_field: newField,
                });
            }
        } else if (selectedPeriod === 'custom' && customRange.from) {
            if (onChange) {
                onChange({
                    period: 'custom',
                    date_from: format(customRange.from, 'yyyy-MM-dd'),
                    date_to: customRange.to ? format(customRange.to, 'yyyy-MM-dd') : format(customRange.from, 'yyyy-MM-dd'),
                    date_field: newField,
                });
            }
        }
    };

    const displayLabel = useMemo(() => {
        if (!selectedPeriod) return 'Period';
        if (selectedPeriod === 'custom' && customRange.from) {
            const from = format(customRange.from, 'dd MMM');
            const to = customRange.to ? format(customRange.to, 'dd MMM') : from;
            return `${from} - ${to}`;
        }
        return PERIOD_OPTIONS.find(o => o.value === selectedPeriod)?.label || 'Period';
    }, [selectedPeriod, customRange]);

    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            {dateFields && dateFields.length > 1 && (
                <div className="flex bg-muted rounded-md p-0.5" data-testid="period-filter-field-toggle">
                    {dateFields.map(f => (
                        <button
                            key={f.value}
                            type="button"
                            className={`px-2 py-1 text-xs rounded transition-colors ${selectedField === f.value ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handleFieldChange(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        data-testid="period-filter-btn"
                    >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {displayLabel}
                        {selectedPeriod ? (
                            <X className="h-3 w-3 ml-1 hover:text-destructive" onClick={handleClear} />
                        ) : (
                            <ChevronDown className="h-3 w-3 ml-0.5" />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex">
                        <div className="border-r p-1 space-y-0.5 min-w-[140px]">
                            {PERIOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${selectedPeriod === opt.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                    onClick={() => handlePeriodSelect(opt.value)}
                                    data-testid={`period-option-${opt.value}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        {showCustom && (
                            <div className="p-2 flex flex-col gap-2">
                                <Calendar
                                    mode="range"
                                    selected={customRange}
                                    onSelect={(range) => setCustomRange(range || { from: null, to: null })}
                                    numberOfMonths={1}
                                    className="text-xs"
                                />
                                <Button size="sm" className="w-full" onClick={handleCustomApply} disabled={!customRange.from}>
                                    Apply
                                </Button>
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            {selectedPeriod && (
                <Badge variant="secondary" className="text-[10px] h-5">
                    {dateFields?.find(f => f.value === selectedField)?.label || ''}
                </Badge>
            )}
        </div>
    );
};

export default PeriodFilter;

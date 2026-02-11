// Finance utility functions

// Format currency
export const formatCurrency = (amount, currency = 'AED') => {
    return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: currency === 'USDT' ? 'USD' : currency,
        minimumFractionDigits: 2
    }).format(amount);
};

// Format date
export const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-AE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

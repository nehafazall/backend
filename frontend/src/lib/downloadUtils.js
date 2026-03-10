/**
 * Download utility functions for CSV and file downloads
 */

/**
 * Download content as a file
 * @param {string} content - The content to download
 * @param {string} filename - The filename for the download
 * @param {string} mimeType - The MIME type (default: text/csv)
 */
export function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        
        // Append to body, click, then remove
        document.body.appendChild(a);
        a.click();
        
        // Clean up after a short delay
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 150);
        
        return true;
    } catch (error) {
        console.error('Download error:', error);
        return false;
    }
}

/**
 * Download data as CSV
 * @param {Array} data - Array of objects to convert to CSV
 * @param {string} filename - The filename for the download
 * @param {Array} columns - Optional column headers (defaults to object keys)
 */
export function downloadCSV(data, filename, columns = null) {
    if (!data || data.length === 0) {
        console.warn('No data to download');
        return false;
    }
    
    const headers = columns || Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header] ?? '';
                // Escape quotes and wrap in quotes if contains comma or newline
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ];
    
    return downloadFile(csvRows.join('\n'), filename, 'text/csv;charset=utf-8;');
}

export default { downloadFile, downloadCSV };

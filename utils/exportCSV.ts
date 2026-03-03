interface ExportData {
  [key: string]: any;
}

export function exportCSV(data: ExportData[], filename: string = 'export'): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Extract headers from first object
  const headers: string[] = Object.keys(data[0]);
  
  // Convert data to CSV rows
  const csvRows: string[] = [
    headers.join(','), // Header row
    ...data.map((row: ExportData) => 
      headers.map((header: string) => {
        const value = row[header];
        
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) {
          return '';
        }
        
        const stringValue: string = String(value);
        
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',')
    )
  ];
  
  const csvString: string = csvRows.join('\n');
  
  // Create and trigger download
  const blob: Blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link: HTMLAnchorElement = document.createElement('a');
  const url: string = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL
  URL.revokeObjectURL(url);
}
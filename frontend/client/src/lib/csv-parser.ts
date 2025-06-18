import { CsvRow } from "@shared/schema";

export interface ParsedCsvData {
  rows: CsvRow[];
  errors: string[];
  totalRows: number;
}

export function parseCsvText(csvText: string): ParsedCsvData {
  const lines = csvText.split('\n').filter(line => line.trim());
  const errors: string[] = [];
  const rows: CsvRow[] = [];

  if (lines.length === 0) {
    return { rows: [], errors: ['Empty file'], totalRows: 0 };
  }

  // Parse header
  const header = lines[0].split(',').map(col => col.trim().toLowerCase().replace(/\s+/g, ''));
  
  // Validate required columns
  const requiredColumns = ['timestamp', 'tagid', 'taglabel', 'tagvalue', 'unit', 'minrange', 'maxrange'];
  const missingColumns = requiredColumns.filter(col => 
    !header.some(h => h.includes(col.replace('_', '')) || col.includes(h))
  );

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    return { rows: [], errors, totalRows: lines.length - 1 };
  }

  // Create column mapping
  const columnMap: Record<string, number> = {};
  requiredColumns.forEach(reqCol => {
    const headerIndex = header.findIndex(h => 
      h.includes(reqCol.replace('_', '')) || reqCol.includes(h) || 
      (reqCol === 'tagid' && (h === 'tag_id' || h === 'tagid')) ||
      (reqCol === 'taglabel' && (h === 'tag_label' || h === 'taglabel')) ||
      (reqCol === 'tagvalue' && (h === 'tag_value' || h === 'tagvalue' || h === 'value')) ||
      (reqCol === 'minrange' && (h === 'min_range' || h === 'minrange')) ||
      (reqCol === 'maxrange' && (h === 'max_range' || h === 'maxrange'))
    );
    
    if (headerIndex !== -1) {
      columnMap[reqCol] = headerIndex;
    }
  });

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = line.split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
      
      if (values.length !== header.length) {
        errors.push(`Row ${i}: Column count mismatch`);
        continue;
      }

      const row: CsvRow = {
        timestamp: values[columnMap.timestamp],
        tagId: values[columnMap.tagid],
        tagLabel: values[columnMap.taglabel],
        tagValue: parseFloat(values[columnMap.tagvalue]),
        unit: values[columnMap.unit],
        minRange: parseFloat(values[columnMap.minrange]),
        maxRange: parseFloat(values[columnMap.maxrange])
      };

      // Validate data types
      if (isNaN(row.tagValue)) {
        errors.push(`Row ${i}: Invalid tag value`);
        continue;
      }

      if (isNaN(row.minRange) || isNaN(row.maxRange)) {
        errors.push(`Row ${i}: Invalid range values`);
        continue;
      }

      if (new Date(row.timestamp).toString() === 'Invalid Date') {
        errors.push(`Row ${i}: Invalid timestamp`);
        continue;
      }

      rows.push(row);
    } catch (error) {
      errors.push(`Row ${i}: Parse error`);
    }
  }

  return {
    rows,
    errors,
    totalRows: lines.length - 1
  };
}

export function validateCsvStructure(file: File): Promise<{ isValid: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      resolve({ isValid: false, error: 'File must be a CSV file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      resolve({ isValid: false, error: 'File size must be less than 10MB' });
      return;
    }

    resolve({ isValid: true });
  });
}

export function generateSampleCsvData(): string {
  const header = 'Timestamp,Tag ID,Tag Label,Tag Value,Unit,Min Range,Max Range\n';
  const rows = [];
  
  const now = new Date();
  const tags = [
    { id: 'COND_01', label: 'Conductivity', unit: 'µS/cm', min: 100, max: 300 },
    { id: 'TEMP_01', label: 'Temperature', unit: '°C', min: 15, max: 35 },
    { id: 'PH_01', label: 'pH Level', unit: 'pH', min: 6, max: 8 },
    { id: 'FLOW_01', label: 'Flow Rate', unit: 'L/min', min: 0, max: 100 },
    { id: 'PRESS_01', label: 'Pressure', unit: 'bar', min: 0, max: 10 }
  ];

  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now.getTime() - (100 - i) * 60000).toISOString();
    
    tags.forEach(tag => {
      const value = tag.min + Math.random() * (tag.max - tag.min);
      rows.push(`${timestamp},${tag.id},${tag.label},${value.toFixed(2)},${tag.unit},${tag.min},${tag.max}`);
    });
  }

  return header + rows.join('\n');
}

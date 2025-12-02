/**
 * CSV Export Utility
 * Transforms processed pivot data into CSV format
 */

import type { Config, Column } from '../types';
import type { PivotDataResult } from './pivotHelper';

/**
 * Escape CSV value (handle quotes and commas)
 */
function escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Build custom header rows for CSV
 */
function buildCustomHeaders(
    config: Config,
    filters: any[],
    allFields: Column[]
): string[] {
    const headerLines: string[] = [];

    if (!config.headerRowSettings || config.headerRowSettings.length === 0) {
        return headerLines;
    }

    config.headerRowSettings.forEach(row => {
        let content = '';

        switch (row.type) {
            case 'text':
                content = row.text || '';
                break;
            case 'column':
                const field = allFields.find(f => f.id === row.column);
                const filter = filters.find(f => f.id === row.column);
                if (filter && filter.value && !filter.value.includes(',')) {
                    content = `${field?.name || row.column}: ${filter.value}`;
                } else {
                    content = `${field?.name || row.column}: (All)`;
                }
                break;
            case 'filters':
                if (row.selectedFilters && row.selectedFilters.length > 0) {
                    const filterTexts = row.selectedFilters.map((filterId: string) => {
                        const filter = filters.find(f => f.id === filterId);
                        return `${filter?.name || filterId}: ${filter?.value || 'All'}`;
                    });
                    content = filterTexts.join(' | ');
                }
                break;
            case 'refreshDate':
                content = `Data as of: ${new Date().toLocaleString()}`;
                break;
        }

        headerLines.push(escapeCSV(content));
    });

    return headerLines;
}

/**
 * Build CSV table from pivot result
 */
function buildCSVTable(pivotResult: PivotDataResult): string[] {
    const lines: string[] = [];

    // 1. Column headers
    const numGroupCols = pivotResult.rowHeaders[0]?.length || 0;

    pivotResult.headerRows.forEach(headerRow => {
        const csvRow: string[] = [];

        // Empty cells for row header columns
        for (let i = 0; i < numGroupCols; i++) {
            csvRow.push('');
        }

        // Column header labels
        headerRow.forEach(header => {
            csvRow.push(escapeCSV(header.label));
            // Add empty cells for colSpan > 1
            for (let i = 1; i < header.colSpan; i++) {
                csvRow.push('');
            }
        });

        lines.push(csvRow.join(','));
    });

    // 2. Data rows
    pivotResult.rowHeaders.forEach((rowHeaderCells, rowIdx) => {
        const csvRow: string[] = [];

        // Row headers
        rowHeaderCells.forEach(cell => {
            if (cell.isVisible) {
                csvRow.push(escapeCSV(cell.value));
            } else {
                csvRow.push(''); // Empty cell for merged rows
            }
        });

        // Data cells
        const dataRow = pivotResult.dataMatrix[rowIdx] || [];
        dataRow.forEach(cell => {
            csvRow.push(escapeCSV(cell?.value ?? ''));
        });

        lines.push(csvRow.join(','));
    });

    return lines;
}

/**
 * Main CSV export function
 */
/**
 * Main CSV export function
 * Returns the filename and CSV content string
 */
export async function exportToCSV(
    config: Config,
    pivotResult: PivotDataResult,
    filters: any[],
    allFields: Column[]
): Promise<{ filename: string, content: string }> {
    try {
        const lines: string[] = [];

        // 1. Add custom headers
        const customHeaders = buildCustomHeaders(config, filters, allFields);
        lines.push(...customHeaders);

        // Add blank line after custom headers if they exist
        if (customHeaders.length > 0) {
            lines.push('');
        }

        // 2. Add pivot table
        const tableLines = buildCSVTable(pivotResult);
        lines.push(...tableLines);

        // 3. Create CSV content
        const csvContent = lines.join('\n');

        // 4. Create filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const workbookName = config.workbookName || 'Report';
        const worksheetName = config.worksheetName || config.selectedWorksheet || 'Sheet';
        const filename = `${workbookName}_${worksheetName}_${timestamp}.csv`;

        return { filename, content: csvContent };
    } catch (error) {
        console.error('CSV export failed:', error);
        throw error;
    }
}

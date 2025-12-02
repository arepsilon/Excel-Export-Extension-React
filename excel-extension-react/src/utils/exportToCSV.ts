/**
 * CSV Export Utility
 * Transforms processed pivot data into CSV format
 * Optimized for large datasets using Blobs and chunked processing
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
 * Main CSV export function
 * Returns the filename and CSV content as a Blob
 */
export async function exportToCSV(
    config: Config,
    pivotResult: PivotDataResult,
    filters: any[],
    allFields: Column[]
): Promise<{ filename: string, content: Blob }> {
    try {
        const chunks: string[] = [];
        const CHUNK_SIZE = 2000; // Process 2000 rows at a time

        // 1. Add custom headers
        const customHeaders = buildCustomHeaders(config, filters, allFields);
        if (customHeaders.length > 0) {
            chunks.push(customHeaders.join('\n') + '\n');
            // Add blank line after custom headers
            chunks.push('\n');
        }

        // 2. Column headers
        const numGroupCols = pivotResult.rowHeaders[0]?.length || 0;
        const headerLines: string[] = [];

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

            headerLines.push(csvRow.join(','));
        });

        chunks.push(headerLines.join('\n') + '\n');

        // 3. Data rows (Chunked Processing)
        const totalRows = pivotResult.rowHeaders.length;

        for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
            const chunkLines: string[] = [];
            const end = Math.min(i + CHUNK_SIZE, totalRows);

            for (let rowIdx = i; rowIdx < end; rowIdx++) {
                const csvRow: string[] = [];
                const rowHeaderCells = pivotResult.rowHeaders[rowIdx];

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

                chunkLines.push(csvRow.join(','));
            }

            chunks.push(chunkLines.join('\n') + '\n');

            // Yield to main thread to prevent UI freeze
            if (i + CHUNK_SIZE < totalRows) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // 4. Create Blob
        const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8;' });

        // 5. Create filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const workbookName = config.workbookName || 'Report';
        const worksheetName = config.worksheetName || config.selectedWorksheet || 'Sheet';
        const filename = `${workbookName}_${worksheetName}_${timestamp}.csv`;

        return { filename, content: blob };
    } catch (error) {
        console.error('CSV export failed:', error);
        throw error;
    }
}

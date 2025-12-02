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

/**
 * Export raw Tableau data directly to CSV
 * Bypasses pivot processing for maximum performance
 */
export async function exportRawDataToCSV(
    config: Config,
    rawDataSource: any, // Tableau DataTable
    filters: any[],
    allFields: Column[]
): Promise<{ filename: string, content: Blob }> {
    try {
        const chunks: string[] = [];
        const CHUNK_SIZE = 2000;

        // 1. Add custom headers
        const customHeaders = buildCustomHeaders(config, filters, allFields);
        if (customHeaders.length > 0) {
            chunks.push(customHeaders.join('\n') + '\n');
            chunks.push('\n');
        }

        // 2. Column Headers
        const columns = rawDataSource.columns;
        const headerRow = columns.map((c: any) => escapeCSV(c.fieldName)).join(',');
        chunks.push(headerRow + '\n');

        // 3. Data Rows (Chunked)
        const data = rawDataSource.data;

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunkLines: string[] = [];
            const end = Math.min(i + CHUNK_SIZE, data.length);

            for (let rowIdx = i; rowIdx < end; rowIdx++) {
                const row = data[rowIdx];
                const csvRow: string[] = [];

                // Direct access to values, no object creation
                for (let colIdx = 0; colIdx < columns.length; colIdx++) {
                    csvRow.push(escapeCSV(row[colIdx].value));
                }

                chunkLines.push(csvRow.join(','));
            }

            chunks.push(chunkLines.join('\n') + '\n');

            // Yield to main thread
            if (i + CHUNK_SIZE < data.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // 4. Create Blob
        const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8;' });

        // 5. Create filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const workbookName = config.workbookName || 'Report';
        const worksheetName = config.worksheetName || config.selectedWorksheet || 'Sheet';
        const filename = `${workbookName}_${worksheetName}_${timestamp}_Raw.csv`;

        return { filename, content: blob };

    } catch (error) {
        console.error('Raw CSV export failed:', error);
        throw error;
    }
}

/**
 * Export Streaming Pivot to CSV
 * Performs a streaming pivot (Sort -> Group -> Emit) to handle large datasets with pivot structure.
 */
export async function exportStreamingPivotToCSV(
    config: Config,
    rawDataSource: any, // Tableau DataTable
    filters: any[],
    allFields: Column[]
): Promise<{ filename: string, content: Blob }> {
    try {
        const chunks: string[] = [];
        const CHUNK_SIZE = 2000;
        const data = rawDataSource.data;
        const columns = rawDataSource.columns;

        // Helper to get value from row by field ID
        const getVal = (row: any, fieldId: string) => {
            const colIdx = columns.findIndex((c: any) => c.fieldName === fieldId);
            return colIdx >= 0 ? row[colIdx].value : null;
        };

        // 1. Pre-pass: Identify Pivot Headers (if any)
        // We need unique combinations of pivot columns to build the header
        let pivotHeaders: string[] = ['']; // Default to one column if no pivot cols
        const pivotCols = config.pivotColumns;
        const valueCols = config.valueColumns;
        const groupCols = config.groupColumns;

        if (pivotCols.length > 0) {
            const pivotKeys = new Set<string>();
            // We have to scan all data to find all pivot keys.
            // For 1M rows, this is fast enough (just reading).
            for (const row of data) {
                const key = pivotCols.map(c => getVal(row, c.id)).join('|||');
                pivotKeys.add(key);
            }
            pivotHeaders = Array.from(pivotKeys).sort();
        }

        // 2. Build CSV Headers
        // Custom Headers
        const customHeaders = buildCustomHeaders(config, filters, allFields);
        if (customHeaders.length > 0) {
            chunks.push(customHeaders.join('\n') + '\n\n');
        }

        // Main Table Headers
        // Row 1: Pivot Labels (if pivot cols exist)
        // For simplicity in streaming export, we flatten the header to:
        // GroupCols... | PivotKey1 - ValueCol1 | PivotKey1 - ValueCol2 ...

        const headerRow: string[] = [];

        // Group Columns Headers
        groupCols.forEach(c => headerRow.push(escapeCSV(c.name)));

        // Pivot/Value Columns Headers
        pivotHeaders.forEach(pKey => {
            const pLabel = pKey ? pKey.replace(/\|\|\|/g, ' - ') : '';
            valueCols.forEach(vc => {
                const label = pLabel ? `${pLabel} - ${vc.name}` : vc.name;
                headerRow.push(escapeCSV(label));
            });
        });

        chunks.push(headerRow.join(',') + '\n');

        // 3. Sort Data by Group Columns
        // This is crucial for streaming aggregation
        // We create an index array to sort, to avoid moving heavy row objects
        const indices = new Uint32Array(data.length);
        for (let i = 0; i < data.length; i++) indices[i] = i;

        indices.sort((a, b) => {
            const rowA = data[a];
            const rowB = data[b];
            for (const col of groupCols) {
                const valA = getVal(rowA, col.id);
                const valB = getVal(rowB, col.id);
                if (valA < valB) return -1;
                if (valA > valB) return 1;
            }
            return 0;
        });

        // 4. Stream & Aggregate
        let currentRowKey: string | null = null;
        let currentRowData: Map<string, any> = new Map(); // Key: PivotKey|||ValueColId -> Value
        let currentRowGroupValues: string[] = [];

        // Buffer for CSV lines
        let chunkLines: string[] = [];

        for (let i = 0; i < indices.length; i++) {
            const rowIdx = indices[i];
            const row = data[rowIdx];

            // Construct Group Key
            const groupKey = groupCols.map(c => getVal(row, c.id)).join('|||');

            // Check if we moved to a new group
            if (currentRowKey !== null && groupKey !== currentRowKey) {
                // Flush previous row
                const csvRow: string[] = [...currentRowGroupValues.map(escapeCSV)];

                pivotHeaders.forEach(pKey => {
                    valueCols.forEach(vc => {
                        const valKey = `${pKey}|||${vc.id}`;
                        const val = currentRowData.get(valKey);
                        csvRow.push(escapeCSV(val ?? ''));
                    });
                });

                chunkLines.push(csvRow.join(','));

                // Reset
                currentRowData.clear();
            }

            // Update current state
            currentRowKey = groupKey;
            if (currentRowData.size === 0) {
                currentRowGroupValues = groupCols.map(c => getVal(row, c.id));
            }

            // Aggregate Value
            // Note: This assumes source data is already aggregated (Summary Data).
            // If we have multiple rows for the same Group+Pivot combination, we should probably take the last one or sum?
            // Summary Data usually implies uniqueness unless we are unpivoting Measure Names.
            // For safety, we'll overwrite (last wins) or we could sum if numeric.
            // Given it's "Summary Data", let's overwrite.

            const pivotKey = pivotCols.length > 0 ? pivotCols.map(c => getVal(row, c.id)).join('|||') : '';

            valueCols.forEach(vc => {
                const val = getVal(row, vc.id);
                // Handle Measure Names/Values special case if needed, but getVal handles ID lookup.
                // If the value column relies on Measure Values, getVal might need adjustment?
                // Actually, getVal looks up by fieldName. If valueCol.id is "Measure Values", it works.
                // But usually valueCols are specific measures. 
                // If using Measure Names/Values, the row has "Measure Names" = "Sales", "Measure Values" = 100.
                // We need to check if this row matches the value column.

                // Special handling for Measure Names/Values structure if present in data
                const measureNameCol = columns.find((c: any) => c.fieldName === 'Measure Names');
                const measureValueCol = columns.find((c: any) => c.fieldName === 'Measure Values');

                if (measureNameCol && measureValueCol) {
                    // This row represents ONE measure.
                    const rowMeasureName = row[measureNameCol.index]?.value;
                    const rowMeasureValue = row[measureValueCol.index]?.value;

                    if (rowMeasureName === vc.name) { // Match by name
                        currentRowData.set(`${pivotKey}|||${vc.id}`, rowMeasureValue);
                    }
                } else {
                    // Standard structure
                    currentRowData.set(`${pivotKey}|||${vc.id}`, val);
                }
            });

            // Flush chunk if full
            if (chunkLines.length >= CHUNK_SIZE) {
                chunks.push(chunkLines.join('\n') + '\n');
                chunkLines = [];
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Flush final row
        if (currentRowKey !== null) {
            const csvRow: string[] = [...currentRowGroupValues.map(escapeCSV)];
            pivotHeaders.forEach(pKey => {
                valueCols.forEach(vc => {
                    const valKey = `${pKey}|||${vc.id}`;
                    const val = currentRowData.get(valKey);
                    csvRow.push(escapeCSV(val ?? ''));
                });
            });
            chunkLines.push(csvRow.join(','));
        }

        // Flush final chunk
        if (chunkLines.length > 0) {
            chunks.push(chunkLines.join('\n') + '\n');
        }

        const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8;' });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const workbookName = config.workbookName || 'Report';
        const worksheetName = config.worksheetName || config.selectedWorksheet || 'Sheet';
        const filename = `${workbookName}_${worksheetName}_${timestamp}_Pivot.csv`;

        return { filename, content: blob };

    } catch (error) {
        console.error('Streaming Pivot Export failed:', error);
        throw error;
    }
}

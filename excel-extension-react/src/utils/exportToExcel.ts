/**
 * Excel Export Utility
 * Transforms processed pivot data into formatted Excel workbook using ExcelJS
 */

import ExcelJS from 'exceljs';
import type { Config, Column, NumberFormat, DateFormat } from '../types';
import type { PivotDataResult } from './pivotHelper';

/**
 * Convert CSS color to Excel ARGB format
 */
function cssToArgb(cssColor?: string): string {
    if (!cssColor) return 'FF000000';

    // Remove # if present
    let hex = cssColor.replace('#', '');

    // Convert 3-digit hex to 6-digit
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    // Add alpha channel (FF = fully opaque)
    return 'FF' + hex.toUpperCase();
}

/**
 * Get default border style with gray color (#808080)
 */
function getDefaultBorder(): Partial<ExcelJS.Borders> {
    const borderColor = { argb: cssToArgb('#808080') };
    const style: ExcelJS.BorderStyle = 'thin';
    return {
        top: { style, color: borderColor },
        left: { style, color: borderColor },
        right: { style, color: borderColor },
        bottom: { style, color: borderColor }
    };
}

/**
 * Calculate row height based on number of lines in text
 * Assumes ~15 points per line for default font size 10
 * Adds padding for better appearance
 */
function calculateRowHeight(text: string | null | undefined, defaultHeight: number = 15, padding: number = 6): number {
    if (!text) return defaultHeight + padding;
    const lines = String(text).split('\n').length;
    // Base height + additional height for each extra line + padding
    // Excel row height is in points (1 point ≈ 1.33 pixels)
    const calculatedHeight = Math.max(defaultHeight, defaultHeight + (lines - 1) * 12);
    return calculatedHeight + padding;
}

/**
 * Build Excel number format string
 */
function buildExcelNumberFormat(fmt: NumberFormat): string {
    const decimals = fmt.decimalPlaces ?? 2;
    const decimalStr = decimals > 0 ? '.' + '0'.repeat(decimals) : '';
    const separator = fmt.thousandSeparator ? '#,##0' : '0';

    let format = separator + decimalStr;

    if (fmt.displayType === 'currency') {
        const symbol = fmt.currencySymbol || '$';
        format = `${symbol}${format}`;
    } else if (fmt.displayType === 'percentage') {
        format = format + '%';
    } else if (fmt.displayType === 'scientific') {
        format = '0.00E+00';
    }

    // Handle negative format
    if (fmt.negativeFormat === 'parentheses') {
        format = `${format};(${format})`;
    } else if (fmt.negativeFormat === 'red') {
        format = `${format};[Red]-${format}`;
    }

    return format;
}

/**
 * Build Excel date format string
 */
function buildExcelDateFormat(fmt?: DateFormat): string {
    if (!fmt || !fmt.pattern) return 'mm/dd/yyyy';

    if (fmt.pattern === 'custom' && fmt.customPattern) {
        return fmt.customPattern;
    }

    // Convert common patterns to Excel format codes
    const patterns: Record<string, string> = {
        'MM/DD/YYYY': 'mm/dd/yyyy',
        'DD/MM/YYYY': 'dd/mm/yyyy',
        'YYYY-MM-DD': 'yyyy-mm-dd',
        'MMM D, YYYY': 'mmm d, yyyy',
        'MMMM D, YYYY': 'mmmm d, yyyy',
        'MM/DD/YYYY HH:mm': 'mm/dd/yyyy hh:mm',
        'YYYY-MM-DD HH:mm': 'yyyy-mm-dd hh:mm',
        'DD MMM YYYY HH:mm': 'dd mmm yyyy hh:mm'
    };

    return patterns[fmt.pattern] || 'mm/dd/yyyy';
}

/**
 * Add custom header rows to worksheet
 */
function addCustomHeaders(
    worksheet: ExcelJS.Worksheet,
    config: Config,
    filters: any[],
    allFields: Column[],
    totalColumns: number,
    startRow: number
): number {
    let currentRow = startRow;

    if (!config.headerRowSettings || config.headerRowSettings.length === 0) {
        return currentRow;
    }

    config.headerRowSettings.forEach(headerRow => {
        let content = '';

        // Build content based on type
        switch (headerRow.type) {
            case 'text':
                content = headerRow.text || '';
                break;
            case 'column':
                const field = allFields.find(f => f.id === headerRow.column);
                const filter = filters.find(f => f.id === headerRow.column);
                if (filter && filter.value && !filter.value.includes(',')) {
                    content = `${field?.name || headerRow.column}: ${filter.value}`;
                } else {
                    content = `${field?.name || headerRow.column}: (All)`;
                }
                break;
            case 'filters':
                if (headerRow.selectedFilters && headerRow.selectedFilters.length > 0) {
                    const filterTexts = headerRow.selectedFilters.map((filterId: string) => {
                        const filter = filters.find(f => f.id === filterId);
                        return `${filter?.name || filterId}: ${filter?.value || 'All'}`;
                    });
                    content = filterTexts.join('\n');
                }
                break;
            case 'refreshDate':
                content = `Data as of: ${new Date().toLocaleString()}`;
                break;
        }

        // Get the cell and set value
        const cell = worksheet.getCell(currentRow, 1);
        cell.value = content;

        // Merge cells if needed
        if (totalColumns > 1) {
            worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
        }

        // Apply formatting
        cell.alignment = {
            horizontal: headerRow.textAlign || 'left',
            vertical: 'middle',
            wrapText: true
        };
        cell.font = {
            bold: true,
            size: 11,
            color: { argb: cssToArgb(headerRow.fontColor) }
        };
        if (headerRow.bgColor) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: cssToArgb(headerRow.bgColor) }
            };
        }

        // Set row height based on number of lines (with padding)
        const rowHeight = calculateRowHeight(content, 15, 6);
        worksheet.getRow(currentRow).height = rowHeight;

        currentRow++;
    });

    return currentRow;
}

/**
 * Add pivot column headers to worksheet
 */
function addPivotHeaders(
    worksheet: ExcelJS.Worksheet,
    headerRows: { label: string, colSpan: number, style?: any }[][],
    config: Config,
    numGroupCols: number,
    startRow: number
): number {
    const startRowForMerge = startRow;
    let currentRow = startRow;

    // Track max height needed for each header row
    let maxRowHeight = 15;

    // Get configured styles
    const headerBgColor = config.pivotHeaderFormat?.bgColor ? cssToArgb(config.pivotHeaderFormat.bgColor) : 'FFE0E0E0';
    const headerFontColor = config.pivotHeaderFormat?.fontColor ? cssToArgb(config.pivotHeaderFormat.fontColor) : 'FF000000';
    const headerAlign = config.pivotHeaderFormat?.textAlign || 'center';

    headerRows.forEach((headerRow, headerRowIdx) => {
        // On the FIRST header row, add and merge the group column labels vertically
        if (headerRowIdx === 0) {
            config.groupColumns.forEach((groupCol, colIdx) => {
                const cell = worksheet.getCell(currentRow, colIdx + 1);
                const cellValue = groupCol.name || groupCol.id;
                cell.value = cellValue;

                // Apply header styling
                cell.font = { bold: true, size: 10, color: { argb: headerFontColor } };
                cell.alignment = { horizontal: headerAlign, vertical: 'middle', wrapText: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: headerBgColor }
                };
                cell.border = getDefaultBorder();

                // Calculate height for this cell
                const cellHeight = calculateRowHeight(cellValue, 15);
                maxRowHeight = Math.max(maxRowHeight, cellHeight);

                // Merge vertically across all header rows
                if (headerRows.length > 1) {
                    worksheet.mergeCells(
                        startRowForMerge,
                        colIdx + 1,
                        startRowForMerge + headerRows.length - 1,
                        colIdx + 1
                    );
                }
            });
        }

        // Add the pivot column headers
        let colIdx = numGroupCols + 1;
        headerRow.forEach(header => {
            const cell = worksheet.getCell(currentRow, colIdx);
            cell.value = header.label;

            // Apply basic header styling
            cell.font = { bold: true, size: 10, color: { argb: headerFontColor } };
            cell.alignment = { horizontal: headerAlign, vertical: 'middle', wrapText: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerBgColor }
            };
            cell.border = getDefaultBorder();

            // Calculate height for this cell
            const cellHeight = calculateRowHeight(header.label, 15);
            maxRowHeight = Math.max(maxRowHeight, cellHeight);

            // Apply custom styles if provided (override config)
            if (header.style) {
                if (header.style.backgroundColor) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: cssToArgb(header.style.backgroundColor) }
                    };
                }
                if (header.style.color) {
                    cell.font = {
                        ...cell.font,
                        color: { argb: cssToArgb(header.style.color) }
                    };
                }
            }

            // Handle column spanning
            if (header.colSpan > 1) {
                worksheet.mergeCells(currentRow, colIdx, currentRow, colIdx + header.colSpan - 1);
            }

            colIdx += header.colSpan;
        });

        // Set row height for this header row (with padding)
        worksheet.getRow(currentRow).height = maxRowHeight + 6;
        maxRowHeight = 15; // Reset for next row

        currentRow++;
    });

    return currentRow;
}

function addDataRows(
    worksheet: ExcelJS.Worksheet,
    pivotResult: PivotDataResult,
    config: Config,
    startRow: number
): void {
    let currentRow = startRow;

    console.log('addDataRows called with startRow:', startRow);
    console.log('Number of rows to add:', pivotResult.rowHeaders.length);

    pivotResult.rowHeaders.forEach((rowHeaderCells, rowIdx) => {
        console.log(`Processing row ${rowIdx} at Excel row ${currentRow}`);
        let colIdx = 1;

        // Add row headers
        rowHeaderCells.forEach((headerCell, headerIdx) => {
            const cell = worksheet.getCell(currentRow, colIdx);
            console.log(`  Row header col ${colIdx}: ${headerCell.value} (visible: ${headerCell.isVisible})`);

            if (headerCell.isVisible) {
                cell.value = headerCell.value;

                // Apply row spanning if needed
                if (headerCell.rowSpan > 1) {
                    worksheet.mergeCells(currentRow, colIdx, currentRow + headerCell.rowSpan - 1, colIdx);
                }

                // Apply styling
                cell.font = { bold: true, size: 10 };
                cell.alignment = { horizontal: 'left', vertical: 'middle' };

                // Indent based on level
                if (headerIdx > 0) {
                    cell.alignment = { ...cell.alignment, indent: headerIdx };
                }

                // Apply borders to row header cells
                cell.border = getDefaultBorder();

                // Apply custom style if provided
                if (headerCell.style) {
                    if (headerCell.style.backgroundColor) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: cssToArgb(headerCell.style.backgroundColor as string) }
                        };
                    }
                    if (headerCell.style.color) {
                        cell.font = {
                            ...cell.font,
                            color: { argb: cssToArgb(headerCell.style.color as string) }
                        };
                    }
                }
            } else {
                // Even invisible cells need borders for merged cells
                cell.border = getDefaultBorder();
            }

            colIdx++;
        });

        // Add data cells
        const dataRow = pivotResult.dataMatrix[rowIdx] || [];
        console.log(`  Data cells for row ${rowIdx}:`, dataRow.length, 'cells');

        dataRow.forEach((dataCell, dataIdx) => {
            const cell = worksheet.getCell(currentRow, colIdx);
            console.log(`    Data col ${colIdx}: ${dataCell?.value}`);

            // Determine which value column this cell belongs to
            // The data matrix structure is: [val1_pivot1, val2_pivot1, ..., val1_pivot2, val2_pivot2, ...]
            // So we use modulo to get the value column index
            const valueColIdx = dataIdx % config.valueColumns.length;
            const valueCol = config.valueColumns[valueColIdx];

            if (dataCell && dataCell.value !== null && dataCell.value !== undefined) {
                // Set value directly to avoid parsing issues
                cell.value = dataCell.value;

                // Determine if this is a numeric value
                const isNumeric = typeof dataCell.value === 'number' ||
                    (typeof dataCell.value === 'string' && !isNaN(parseFloat(dataCell.value)) && isFinite(Number(dataCell.value)));

                // Apply number formatting if this is a numeric value column
                if (valueCol && valueCol.numberFormat && isNumeric) {
                    const numFormat = buildExcelNumberFormat(valueCol.numberFormat);
                    cell.numFmt = numFormat;
                }

                // Apply date formatting if this is a date value column
                // Check both dataType and if the value looks like a date
                if (valueCol && valueCol.dateFormat) {
                    const isDateType = valueCol.dataType === 'date' || valueCol.dataType === 'datetime';
                    const looksLikeDate = typeof dataCell.value === 'string' &&
                        (dataCell.value.match(/^\d{4}-\d{2}-\d{2}/) ||
                            dataCell.value.match(/^\d{2}\/\d{2}\/\d{4}/) ||
                            !isNaN(Date.parse(dataCell.value)));

                    if (isDateType || looksLikeDate) {
                        const dateFormat = buildExcelDateFormat(valueCol.dateFormat);
                        cell.numFmt = dateFormat;
                        // Try to convert string dates to Date objects for Excel
                        if (typeof dataCell.value === 'string') {
                            const dateValue = new Date(dataCell.value);
                            if (!isNaN(dateValue.getTime())) {
                                cell.value = dateValue;
                            }
                        }
                    }
                }

                // Apply cell styling from pivot result (conditional formatting)
                // Build font object with all properties at once to avoid overwriting
                const fontProps: any = { size: 10 };

                if (dataCell.style) {
                    // Apply background color
                    if (dataCell.style.backgroundColor) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: cssToArgb(dataCell.style.backgroundColor as string) }
                        };
                    }

                    // Apply font color
                    if (dataCell.style.color) {
                        fontProps.color = { argb: cssToArgb(dataCell.style.color as string) };
                    }

                    // Apply font weight (bold)
                    if (dataCell.style.fontWeight === 'bold') {
                        fontProps.bold = true;
                    }

                    // Apply font style (italic)
                    if (dataCell.style.fontStyle === 'italic') {
                        fontProps.italic = true;
                    }
                }

                // Apply font properties
                cell.font = fontProps;
            } else {
                // Even for empty cells, set default font
                cell.font = { size: 10 };
            }

            // Apply borders
            cell.border = getDefaultBorder();

            // Set alignment for numeric values
            if (dataCell && dataCell.value !== null && dataCell.value !== undefined) {
                if (typeof dataCell.value === 'number') {
                    cell.alignment = { horizontal: 'right', vertical: 'middle' };
                } else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }
            } else {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }

            colIdx++;
        });

        currentRow++;
    });

    console.log('addDataRows completed. Final row:', currentRow);
}

/**
 * Main Excel export function
 */
/**
 * Main Excel export function
 * Returns the filename and Excel buffer
 */
export async function exportToExcel(
    exportData: Array<{
        config: Config,
        pivotResult: PivotDataResult,
        filters: any[],
        allFields: Column[],
        sheetName: string
    }>,
    workbookName: string = 'Report'
): Promise<{ filename: string, buffer: ExcelJS.Buffer }> {
    try {
        console.log('=== EXCEL EXPORT DEBUG ===');
        console.log(`Exporting ${exportData.length} sheets`);

        // Create workbook
        const workbook = new ExcelJS.Workbook();

        // Iterate through each sheet data
        exportData.forEach((sheetData, index) => {
            const { config, pivotResult, filters, allFields, sheetName } = sheetData;

            // Use the provided sheetName (from Tableau) or fallback
            const finalSheetName = sheetName || config.sheetName || `Sheet${index + 1}`;

            // Ensure unique sheet name if duplicate
            let uniqueName = finalSheetName;
            let counter = 1;
            while (workbook.getWorksheet(uniqueName)) {
                uniqueName = `${finalSheetName} (${counter++})`;
            }

            const worksheet = workbook.addWorksheet(uniqueName);

            // Calculate dimensions
            const numGroupCols = pivotResult.rowHeaders[0]?.length || 0;
            const numDataCols = pivotResult.dataMatrix[0]?.length || 0;
            const totalColumns = numGroupCols + numDataCols;

            console.log(`Processing sheet: ${uniqueName}`, {
                numGroupCols,
                numDataCols,
                totalColumns
            });

            let currentRow = 1;

            // 1. Add custom headers
            console.log('Adding custom headers...');
            currentRow = addCustomHeaders(worksheet, config, filters, allFields, totalColumns, currentRow);

            // 2. Add pivot column headers
            console.log('Adding pivot headers...');
            currentRow = addPivotHeaders(worksheet, pivotResult.headerRows, config, numGroupCols, currentRow);

            // 3. Add data rows
            console.log('Adding data rows...');
            addDataRows(worksheet, pivotResult, config, currentRow);

            // 4. Auto-fit columns
            worksheet.columns.forEach((column, idx) => {
                if (idx < numGroupCols) {
                    column.width = 20; // Row headers
                } else {
                    column.width = 15; // Data columns
                }
            });

            // 5. Freeze panes (freeze headers and row labels)
            const freezeRow = (config.headerRowSettings?.length || 0) + pivotResult.headerRows.length + 1;

            // Ensure gridlines are disabled in the view
            worksheet.views = [
                {
                    state: 'frozen',
                    xSplit: numGroupCols,
                    ySplit: freezeRow - 1,
                    showGridLines: false
                }
            ];

            // Also attempt to set it on properties if supported (fallback)
            if (worksheet.properties) {
                (worksheet.properties as any).showGridLines = false;
            }
        });

        // 7. Create filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `${workbookName}_${timestamp}.xlsx`;

        // 7. Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        console.log(`Excel generated: ${filename}`);
        console.log('=== EXPORT COMPLETE ===');

        return { filename, buffer };

    } catch (error) {
        console.error('Excel export failed:', error);
        throw error;
    }
}

import JSZip from 'jszip';
import { exportToExcel } from './exportToExcel';
import { exportToCSV, exportRawDataToCSV, exportStreamingPivotToCSV } from './exportToCSV';
import type { Config, Column } from '../types';
import type { PivotDataResult } from './pivotHelper';

interface ExportSheetData {
    config: Config;
    pivotResult: PivotDataResult;
    filters: any[];
    allFields: Column[];
    sheetName: string;
    rawDataSource?: any; // Tableau DataTable
}

/**
 * Helper to trigger file download
 */
function downloadFile(filename: string, content: Blob | string, mimeType: string) {
    const blob = content instanceof Blob
        ? content
        : new Blob([content], { type: mimeType });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Manages the export process for both Excel and CSV formats.
 * - Excel sheets are ALWAYS downloaded as a separate .xlsx file.
 * - CSV sheets are downloaded separately:
 *   - If 1 CSV sheet: Download as .csv
 *   - If > 1 CSV sheets: Zip them and download as .zip
 */
export async function exportData(
    sheets: ExportSheetData[],
    workbookName: string = 'Report'
): Promise<void> {
    try {
        const excelSheets = sheets.filter(s => s.config.exportMode === 'formatted' || !s.config.exportMode);
        const csvSheets = sheets.filter(s => s.config.exportMode === 'datadump');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

        // 1. Handle Excel Export
        if (excelSheets.length > 0) {
            const { filename, buffer } = await exportToExcel(excelSheets, workbookName);
            downloadFile(
                filename,
                new Blob([buffer]),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
        }

        // 2. Handle CSV Export
        if (csvSheets.length > 0) {
            const csvFiles: Array<{ filename: string, content: Blob }> = [];

            for (const sheet of csvSheets) {
                let result;
                if (sheet.rawDataSource) {
                    // Use optimized path for raw data
                    // If exportMode is 'datadump' AND we have pivot columns configured, user might want pivot structure?
                    // Actually, 'datadump' usually means "Raw Data".
                    // But the user asked "What If I want the output to follow my pivot configurations?".
                    // If they select "Data Dump" mode in config, they usually expect raw data.
                    // If they select "Formatted" (Excel), they get Excel.
                    // We might need a new mode or just infer.
                    // For now, let's assume if they are in 'datadump' mode but have rawDataSource, we check if they have pivot columns.
                    // If they have pivot columns, we use Streaming Pivot.
                    // If NOT, we use Raw Data Export.

                    // However, 'datadump' is often used for "CSV Export".
                    // Let's check if the config has pivot columns.
                    const hasPivot = sheet.config.pivotColumns.length > 0 || sheet.config.groupColumns.length > 0;

                    if (hasPivot) {
                        console.log('Using Streaming Pivot for CSV export');
                        result = await exportStreamingPivotToCSV(
                            sheet.config,
                            sheet.rawDataSource,
                            sheet.filters,
                            sheet.allFields
                        );
                    } else {
                        console.log('Using Raw Data Export for CSV');
                        result = await exportRawDataToCSV(
                            sheet.config,
                            sheet.rawDataSource,
                            sheet.filters,
                            sheet.allFields
                        );
                    }
                } else {
                    // Fallback to standard path (pivot data)
                    result = await exportToCSV(
                        sheet.config,
                        sheet.pivotResult,
                        sheet.filters,
                        sheet.allFields
                    );
                }
                csvFiles.push(result);
            }

            if (csvFiles.length === 1) {
                // Single CSV: Download directly
                downloadFile(
                    csvFiles[0].filename,
                    csvFiles[0].content,
                    'text/csv;charset=utf-8;'
                );
            } else {
                // Multiple CSVs: Zip them
                const zip = new JSZip();
                csvFiles.forEach(file => {
                    zip.file(file.filename, file.content);
                });

                const zipFilename = `${workbookName}_CSV_Export_${timestamp}.zip`;
                const blob = await zip.generateAsync({ type: 'blob' });

                downloadFile(
                    zipFilename,
                    blob,
                    'application/zip'
                );
            }
        }

        if (excelSheets.length === 0 && csvSheets.length === 0) {
            console.warn('No files generated for export.');
        }

    } catch (error) {
        console.error('Export Manager failed:', error);
        throw error;
    }
}

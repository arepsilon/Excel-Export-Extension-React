import JSZip from 'jszip';
import { exportToExcel } from './exportToExcel';
import { exportToCSV } from './exportToCSV';
import type { Config, Column } from '../types';
import type { PivotDataResult } from './pivotHelper';

interface ExportSheetData {
    config: Config;
    pivotResult: PivotDataResult;
    filters: any[];
    allFields: Column[];
    sheetName: string;
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
                const { filename, content } = await exportToCSV(
                    sheet.config,
                    sheet.pivotResult,
                    sheet.filters,
                    sheet.allFields
                );
                csvFiles.push({ filename, content });
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

import React, { useMemo } from 'react';
import { CTable, CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell, CButton, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter } from '@coreui/react';
import type { Config } from '../../types';
import { processPivotData } from '../../utils/pivotHelper';
import { formatNumberValue, formatDateValue } from '../../utils/formatValue';

interface PreviewSectionProps {
    visible: boolean;
    onClose: () => void;
    config: Config;
    previewData: any[];
    gcData?: any[] | null;
    rcData?: any[] | null;
    isLoading: boolean;
    totalRows?: number;
    filters?: any[];
    allFields?: any[];
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({
    visible,
    onClose,
    config,
    previewData,
    gcData,
    rcData,
    isLoading,
    totalRows,
    filters = [],
    allFields = []
}) => {
    const { headerRows, rowHeaders, dataMatrix } = useMemo(() => {
        return processPivotData(
            previewData,
            config.groupColumns,
            config.pivotColumns,
            config.valueColumns,
            {
                showRowTotals: config.showRowTotals,
                rowTotalsPosition: config.rowTotalsPosition,
                showColumnTotals: config.showColumnTotals,
                columnTotalsPosition: config.columnTotalsPosition,
                showSubtotals: config.showSubtotals
            },
            gcData || undefined,
            rcData || undefined
        );
    }, [
        previewData,
        gcData,
        rcData,
        config.groupColumns,
        config.pivotColumns,
        config.valueColumns,
        config.showRowTotals,
        config.rowTotalsPosition,
        config.showColumnTotals,
        config.columnTotalsPosition,
        config.showSubtotals
    ]);

    // Helper to get header content
    const getHeaderContent = (row: any): string | React.ReactNode => {
        switch (row.type) {
            case 'text':
                return row.text;
            case 'column':
                const field = allFields.find(f => f.id === row.column);
                // Try to find if this field is filtered to a single value
                const filter = filters.find(f => f.id === row.column);
                if (filter && filter.value && !filter.value.includes(',')) {
                    return `${field?.name || row.column}: ${filter.value}`;
                }
                return `${field?.name || row.column}: (All)`;
            case 'filters':
                if (!row.selectedFilters || row.selectedFilters.length === 0) return '';
                return (
                    <>
                        {row.selectedFilters.map((filterId: string, idx: number) => {
                            const filter = filters.find(f => f.id === filterId);
                            const filterText = `${filter?.name || filterId}: ${filter?.value || 'All'}`;
                            return (
                                <React.Fragment key={filterId}>
                                    {idx > 0 && <br />}
                                    {filterText}
                                </React.Fragment>
                            );
                        })}
                    </>
                );
            case 'refreshDate':
                return `Data as of: ${new Date().toLocaleString()}`;
            default:
                return '';
        }
    };

    return (
        <CModal visible={visible} onClose={onClose} size="xl">
            <CModalHeader closeButton>
                <CModalTitle>
                    Preview
                    {totalRows !== undefined && totalRows > 0 && (
                        <span className="text-sm text-gray-500 font-normal ml-3">
                            (Showing {previewData.length} of {totalRows} rows)
                        </span>
                    )}
                </CModalTitle>
            </CModalHeader>
            <CModalBody className="overflow-auto max-h-[70vh]">
                {isLoading ? (
                    <div className="text-center py-10">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2 text-gray-500">Generating preview...</p>
                    </div>
                ) : (
                    <CTable bordered hover responsive className="text-sm">
                        <CTableHead>
                            {/* Render Custom Header Rows */}
                            {config.headerRowSettings?.map((row, index) => (
                                <CTableRow key={`custom-header-${index}`}>
                                    <CTableHeaderCell
                                        colSpan={config.groupColumns.length + (headerRows[0]?.length || 1)}
                                        className="p-2"
                                        style={{
                                            textAlign: row.textAlign || 'left',
                                            color: row.fontColor || 'inherit',
                                            backgroundColor: row.bgColor || 'transparent',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {getHeaderContent(row)}
                                    </CTableHeaderCell>
                                </CTableRow>
                            ))}

                            {headerRows.map((row, rowIndex) => (
                                <CTableRow key={rowIndex}>
                                    {/* Render Group Column Headers with rowspan on first row only */}
                                    {rowIndex === 0 && config.groupColumns.map(col => (
                                        <CTableHeaderCell
                                            key={col.id}
                                            rowSpan={headerRows.length}
                                            className="font-semibold align-middle"
                                            style={{
                                                color: config.pivotHeaderFormat?.fontColor,
                                                backgroundColor: config.pivotHeaderFormat?.bgColor,
                                                textAlign: config.pivotHeaderFormat?.textAlign
                                            }}
                                        >
                                            {col.name}
                                        </CTableHeaderCell>
                                    ))}

                                    {/* Render Pivot Headers */}
                                    {row.map((header, idx) => (
                                        <CTableHeaderCell
                                            key={idx}
                                            colSpan={header.colSpan}
                                            className="text-center"
                                            style={{
                                                ...header.style,
                                                color: config.pivotHeaderFormat?.fontColor,
                                                backgroundColor: header.style?.backgroundColor || config.pivotHeaderFormat?.bgColor,
                                                textAlign: config.pivotHeaderFormat?.textAlign
                                            }}
                                        >
                                            {header.label}
                                        </CTableHeaderCell>
                                    ))}
                                </CTableRow>
                            ))}
                            {/* If no header rows (no pivot/value cols), just show group cols */}
                            {headerRows.length === 0 && config.groupColumns.length > 0 && (
                                <CTableRow>
                                    {config.groupColumns.map(col => (
                                        <CTableHeaderCell
                                            key={col.id}
                                            className="font-semibold"
                                            style={{
                                                color: config.pivotHeaderFormat?.fontColor,
                                                backgroundColor: config.pivotHeaderFormat?.bgColor,
                                                textAlign: config.pivotHeaderFormat?.textAlign
                                            }}
                                        >
                                            {col.name}
                                        </CTableHeaderCell>
                                    ))}
                                </CTableRow>
                            )}
                        </CTableHead>
                        <CTableBody>
                            {previewData.length > 0 ? (
                                rowHeaders.map((rowHeader, rowIndex) => (
                                    <CTableRow key={rowIndex}>
                                        {/* Render Row Headers (Group Columns) */}
                                        {rowHeader.map((cell, cellIndex) => (
                                            cell.isVisible ? (
                                                <CTableDataCell
                                                    key={cellIndex}
                                                    rowSpan={cell.rowSpan}
                                                    colSpan={cell.colSpan || 1}
                                                    className={`${!cell.style ? 'bg-white' : ''} font-medium align-top ${cell.value === 'Grand Total' ? 'font-bold' : ''}`}
                                                    style={cell.style}
                                                >
                                                    {cell.value}
                                                </CTableDataCell>
                                            ) : null
                                        ))}

                                        {/* Render Data Cells */}
                                        {dataMatrix[rowIndex]?.map((cell, valIndex) => {
                                            const valueCol = config.valueColumns[valIndex % config.valueColumns.length];
                                            let formattedValue = cell?.value !== null && cell?.value !== undefined ? String(cell.value) : '';

                                            if (valueCol && cell && cell.value !== null && cell.value !== undefined) {
                                                if (valueCol.dataType === 'date' || valueCol.dataType === 'datetime') {
                                                    formattedValue = formatDateValue(String(cell.value), valueCol.dateFormat);
                                                } else if (typeof cell.value === 'number' || !isNaN(Number(cell.value))) {
                                                    formattedValue = formatNumberValue(Number(cell.value), valueCol.numberFormat);
                                                }
                                            }

                                            return (
                                                <CTableDataCell
                                                    key={valIndex}
                                                    className="text-right"
                                                    style={cell?.style}
                                                >
                                                    {formattedValue}
                                                </CTableDataCell>
                                            );
                                        })}
                                    </CTableRow>
                                ))
                            ) : (
                                <CTableRow>
                                    <CTableDataCell
                                        colSpan={config.groupColumns.length + (dataMatrix[0]?.length || 1)}
                                        className="text-center text-gray-400 py-8"
                                    >
                                        No data available for preview.
                                    </CTableDataCell>
                                </CTableRow>
                            )}
                        </CTableBody>
                    </CTable>
                )}
            </CModalBody>
            <CModalFooter>
                <CButton color="secondary" onClick={onClose}>
                    Close
                </CButton>
            </CModalFooter>
        </CModal>
    );
};

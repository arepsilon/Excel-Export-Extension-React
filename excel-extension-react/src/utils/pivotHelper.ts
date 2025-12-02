import type { Column, ConditionalFormatRule, CellValueRule, TopBottomRule, ColorScaleRule } from '../types';
import React from 'react';

export interface PivotRowHeader {
    value: string;
    rowSpan: number;
    colSpan?: number;
    isVisible: boolean;
    style?: React.CSSProperties;
}

export interface PivotColumnHeader {
    label: string;
    colSpan: number;
    children?: PivotColumnHeader[];
}

export interface PivotCell {
    value: string | number | null;
    style?: React.CSSProperties;
}

export interface PivotDataResult {
    headerRows: { label: string, colSpan: number, style?: React.CSSProperties }[][]; // [rowIndex][colIndex]
    rowHeaders: PivotRowHeader[][];     // [rowIndex][colIndex]
    dataMatrix: (PivotCell | null)[][]; // [rowIndex][colIndex]
}



// Helper to get color from scale
const getColorFromScale = (value: number, min: number, max: number, minColor: string, maxColor: string, midColor?: string): string => {
    if (value <= min) return minColor;
    if (value >= max) return maxColor;

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    };

    const rgbToHex = (r: number, g: number, b: number) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const interpolate = (start: number, end: number, factor: number) => Math.round(start + (end - start) * factor);

    if (midColor) {
        const mid = (min + max) / 2;
        if (value < mid) {
            const factor = (value - min) / (mid - min);
            const c1 = hexToRgb(minColor);
            const c2 = hexToRgb(midColor);
            return rgbToHex(interpolate(c1.r, c2.r, factor), interpolate(c1.g, c2.g, factor), interpolate(c1.b, c2.b, factor));
        } else {
            const factor = (value - mid) / (max - mid);
            const c1 = hexToRgb(midColor);
            const c2 = hexToRgb(maxColor);
            return rgbToHex(interpolate(c1.r, c2.r, factor), interpolate(c1.g, c2.g, factor), interpolate(c1.b, c2.b, factor));
        }
    } else {
        const factor = (value - min) / (max - min);
        const c1 = hexToRgb(minColor);
        const c2 = hexToRgb(maxColor);
        return rgbToHex(interpolate(c1.r, c2.r, factor), interpolate(c1.g, c2.g, factor), interpolate(c1.b, c2.b, factor));
    }
};

const applyConditionalFormatting = (
    cellValue: number | string | null,
    rules: ConditionalFormatRule[],
    columnValues: number[]
): React.CSSProperties => {
    if (cellValue === null) return {};
    let style: React.CSSProperties = {};
    const numValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue));

    for (const rule of rules) {
        if (rule.type === 'cellValue') {
            const r = rule as CellValueRule;
            let match = false;
            const v1 = parseFloat(String(r.value1));
            const v2 = r.value2 ? parseFloat(String(r.value2)) : 0;

            if (isNaN(numValue)) {
                if (r.operator === 'contains' && String(cellValue).includes(String(r.value1))) match = true;
                if (r.operator === 'eq' && String(cellValue) === String(r.value1)) match = true;
                if (r.operator === 'neq' && String(cellValue) !== String(r.value1)) match = true;
            } else {
                switch (r.operator) {
                    case 'gt': match = numValue > v1; break;
                    case 'lt': match = numValue < v1; break;
                    case 'gte': match = numValue >= v1; break;
                    case 'lte': match = numValue <= v1; break;
                    case 'eq': match = numValue === v1; break;
                    case 'neq': match = numValue !== v1; break;
                    case 'between': match = numValue >= v1 && numValue <= v2; break;
                }
            }

            if (match) {
                style = { ...style, color: r.style.fontColor, backgroundColor: r.style.bgColor, fontWeight: r.style.bold ? 'bold' : undefined, fontStyle: r.style.italic ? 'italic' : undefined };
            }
        } else if (rule.type === 'topBottom' && !isNaN(numValue)) {
            const r = rule as TopBottomRule;
            const sorted = [...columnValues].sort((a, b) => a - b);
            let threshold = 0;
            let match = false;

            if (r.percent) {
                const count = Math.ceil(sorted.length * (r.count / 100));
                if (r.mode === 'top') {
                    threshold = sorted[sorted.length - count];
                    match = numValue >= threshold;
                } else {
                    threshold = sorted[count - 1];
                    match = numValue <= threshold;
                }
            } else {
                if (r.mode === 'top') {
                    threshold = sorted[Math.max(0, sorted.length - r.count)];
                    match = numValue >= threshold;
                } else {
                    threshold = sorted[Math.min(sorted.length - 1, r.count - 1)];
                    match = numValue <= threshold;
                }
            }

            if (match) {
                style = { ...style, color: r.style.fontColor, backgroundColor: r.style.bgColor, fontWeight: r.style.bold ? 'bold' : undefined, fontStyle: r.style.italic ? 'italic' : undefined };
            }
        } else if (rule.type === 'colorScale' && !isNaN(numValue)) {
            const r = rule as ColorScaleRule;
            const min = Math.min(...columnValues);
            const max = Math.max(...columnValues);
            if (min !== max) {
                const bgColor = getColorFromScale(numValue, min, max, r.minColor, r.maxColor, r.midColor);
                style = { ...style, backgroundColor: bgColor };
            }
        }
    }
    return style;
};

export const processPivotData = (
    data: any[],
    groupCols: Column[],
    pivotCols: Column[],
    valueCols: Column[],
    totalsConfig?: {
        showRowTotals: boolean;
        rowTotalsPosition: 'left' | 'right';
        showColumnTotals: boolean;
        columnTotalsPosition: 'top' | 'bottom';
        showSubtotals: boolean;
        columnTotalsLabel?: string;
    },
    gcData?: any[],
    rcData?: any[]
): PivotDataResult => {
    if (!data || data.length === 0) {
        return { headerRows: [], rowHeaders: [], dataMatrix: [] };
    }

    // Helper to parse value
    const parseVal = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const clean = val.replace(/[^0-9.-]/g, '');
            return parseFloat(clean) || 0;
        }
        return 0;
    };

    // Helper to find field value in a row, trying multiple strategies
    const findFieldValue = (row: any, fieldId: string, fieldName?: string): any => {
        if (!row || typeof row !== 'object') return undefined;

        // Strategy 1: Try exact field ID match
        if (row.hasOwnProperty(fieldId) && row[fieldId] !== undefined) {
            return row[fieldId];
        }

        // Strategy 2: Try field name match
        if (fieldName && row.hasOwnProperty(fieldName) && row[fieldName] !== undefined) {
            return row[fieldName];
        }

        // Strategy 3: Try normalized ID (remove brackets and spaces)
        const normalizedId = fieldId.replace(/[\[\]]/g, '').trim();
        if (normalizedId && normalizedId !== fieldId && row.hasOwnProperty(normalizedId) && row[normalizedId] !== undefined) {
            return row[normalizedId];
        }

        // Strategy 4: Try case-insensitive match
        const rowKeys = Object.keys(row);
        const fieldIdLower = fieldId.toLowerCase();
        const normalizedIdLower = normalizedId.toLowerCase();
        const fieldNameLower = fieldName?.toLowerCase();

        const matchedKey = rowKeys.find(key => {
            const keyLower = key.toLowerCase();
            return keyLower === fieldIdLower ||
                keyLower === normalizedIdLower ||
                (fieldNameLower && keyLower === fieldNameLower);
        });

        if (matchedKey && row[matchedKey] !== undefined) {
            return row[matchedKey];
        }

        return undefined;
    };

    // 0. Identify dependencies for formulas - REMOVED (Legacy)
    // const dependencyFields = new Set<string>();
    // valueCols.forEach(vc => {
    //     dependencyFields.add(vc.id);
    // });

    // 1. Get Unique Row Keys (Group Combinations)
    const rowKeys = new Set<string>();
    const rowKeyMap = new Map<string, any>(); // Key -> Row Data

    data.forEach(row => {
        const key = groupCols.map(c => row[c.id]).join('|||');
        rowKeys.add(key);
        if (!rowKeyMap.has(key)) {
            rowKeyMap.set(key, row);
        }
    });

    let sortedRowKeys = Array.from(rowKeys).sort();

    // 2. Get Unique Column Keys (Pivot Combinations)
    let colKeys: string[] = [''];
    let colKeyMap = new Map<string, any>();

    if (pivotCols.length > 0) {
        const cKeys = new Set<string>();
        data.forEach(row => {
            const key = pivotCols.map(c => row[c.id]).join('|||');
            cKeys.add(key);
            if (!colKeyMap.has(key)) {
                colKeyMap.set(key, row);
            }
        });
        colKeys = Array.from(cKeys).sort();
    }

    // 3. Build Data Matrix & Calculate Totals
    const valueMap = new Map<string, Map<string, Map<string, any>>>();
    // Track source rows for LOD recalculation - REMOVED
    // const sourceRowsMap = new Map<string, Map<string, any[]>>();

    // Build a mapping from value column IDs to actual field names in data
    // This handles cases where the field name in data doesn't match the column ID
    const fieldNameMapping = new Map<string, string>(); // fieldId -> actualFieldName

    if (data.length > 0) {
        const firstRow = data[0];
        const availableFields = Object.keys(firstRow);

        valueCols.forEach(vc => {
            // Try to find the actual field name in the data using multiple strategies
            let actualFieldName: string | null = null;
            const normalizedId = vc.id.replace(/[\[\]]/g, '').trim();

            // Strategy 1: Exact match with fieldId (check if field exists, value can be null/undefined)
            if (firstRow.hasOwnProperty(vc.id)) {
                actualFieldName = vc.id;
            }
            // Strategy 2: Exact match with name (check if field exists)
            else if (vc.name && firstRow.hasOwnProperty(vc.name)) {
                actualFieldName = vc.name;
            }
            // Strategy 3: Normalized ID match (remove brackets)
            else if (normalizedId && normalizedId !== vc.id && firstRow.hasOwnProperty(normalizedId)) {
                actualFieldName = normalizedId;
            }
            // Strategy 4: Case-insensitive and partial matching
            else {
                const vcIdLower = vc.id.toLowerCase();
                const normalizedIdLower = normalizedId.toLowerCase();
                const vcNameLower = vc.name?.toLowerCase();

                const matchedKey = availableFields.find(key => {
                    const keyLower = key.toLowerCase();
                    // Exact case-insensitive match
                    if (keyLower === vcIdLower || keyLower === normalizedIdLower ||
                        (vcNameLower && keyLower === vcNameLower)) {
                        return true;
                    }
                    // Partial match - check if key contains the ID or vice versa
                    if (keyLower.includes(vcIdLower) || vcIdLower.includes(keyLower)) {
                        return true;
                    }
                    if (normalizedIdLower && (keyLower.includes(normalizedIdLower) || normalizedIdLower.includes(keyLower))) {
                        return true;
                    }
                    return false;
                });

                if (matchedKey) {
                    actualFieldName = matchedKey;
                }
            }

            if (actualFieldName) {
                fieldNameMapping.set(vc.id, actualFieldName);
            } else {
                // Log warning for unmapped fields
                console.warn(`Could not map value column "${vc.name}" (ID: ${vc.id}) to any field in data. Available fields: ${availableFields.join(', ')}`);
            }
        });

        console.log('Field name mapping (value column ID -> actual field name in data):',
            Array.from(fieldNameMapping.entries()));

        // Alert if some fields couldn't be mapped
        const unmappedFields = valueCols.filter(vc => !fieldNameMapping.has(vc.id));
        if (unmappedFields.length > 0 && data.length > 0) {
            // Log warning instead of alert
            console.warn(`Field Mapping Warning: Could not map ${unmappedFields.length} value column(s) to data fields.`);
        }
    }

    // Populate base values
    // DIAGNOSTIC: Track first row for debugging
    let firstRowProcessed = false;
    let diagnosticInfo: any = null;

    data.forEach(row => {
        const rKey = groupCols.map(c => row[c.id]).join('|||');
        const cKey = pivotCols.length > 0 ? pivotCols.map(c => row[c.id]).join('|||') : '';

        if (!valueMap.has(rKey)) valueMap.set(rKey, new Map());
        const rMap = valueMap.get(rKey)!;

        if (!rMap.has(cKey)) rMap.set(cKey, new Map());
        const cMap = rMap.get(cKey)!;

        // Store values
        valueCols.forEach(vc => {
            const fieldId = vc.id;
            // Find the value using multiple strategies
            const valueCol = valueCols.find(vc => vc.id === fieldId);

            // First try the mapped field name, then fall back to findFieldValue
            let value: any = undefined;
            const mappedFieldName = fieldNameMapping.get(fieldId);
            if (mappedFieldName && row.hasOwnProperty(mappedFieldName) && row[mappedFieldName] !== undefined) {
                value = row[mappedFieldName];
            } else {
                value = findFieldValue(row, fieldId, valueCol?.name);
            }

            // Store using fieldId as key (for retrieval) - this is the primary storage
            cMap.set(fieldId, value);

            // Also store using the actual field name if different (for redundancy and easier debugging)
            if (mappedFieldName && mappedFieldName !== fieldId && value !== undefined) {
                cMap.set(mappedFieldName, value);
            }

            // DIAGNOSTIC: Capture first row info
            if (!firstRowProcessed) {
                if (!diagnosticInfo) {
                    diagnosticInfo = {
                        availableFields: Object.keys(row),
                        valueColumnIds: valueCols.map(vc => vc.id),
                        valuesSample: {},
                        fieldNameMapping: Array.from(fieldNameMapping.entries())
                    };
                }
                diagnosticInfo.valuesSample[fieldId] = {
                    value: value,
                    found: value !== undefined,
                    mappedField: mappedFieldName || 'none',
                    directLookup: row.hasOwnProperty(fieldId) ? fieldId : (mappedFieldName || 'none')
                };
            }
        });

        firstRowProcessed = true;

        // Track source rows for LOD recalculation - REMOVED (Legacy)
        // if (!sourceRowsMap.has(rKey)) sourceRowsMap.set(rKey, new Map());
        // const rSourceMap = sourceRowsMap.get(rKey)!;
        // if (!rSourceMap.has(cKey)) rSourceMap.set(cKey, []);
        // rSourceMap.get(cKey)!.push(row);
    });

    // DIAGNOSTIC: Log and alert if values are missing
    if (diagnosticInfo && data.length > 0) {
        console.log('=== PIVOT DATA DIAGNOSTIC ===');
        console.log('Available fields in data:', diagnosticInfo.availableFields);
        console.log('Value column IDs from config:', diagnosticInfo.valueColumnIds);
        console.log('Field name mapping:', diagnosticInfo.fieldNameMapping || []);
        console.log('Sample values extracted:', diagnosticInfo.valuesSample);

        // Check which value columns have values
        const valueColumnStatus = valueCols.map(vc => {
            const sampleInfo = diagnosticInfo.valuesSample[vc.id];
            const value = typeof sampleInfo === 'object' && sampleInfo !== null ? sampleInfo.value : sampleInfo;
            const found = value !== undefined && value !== null;
            const mappedField = fieldNameMapping.get(vc.id);
            const directLookup = typeof sampleInfo === 'object' && sampleInfo !== null ? sampleInfo.directLookup : 'unknown';

            return {
                id: vc.id,
                name: vc.name,
                mappedField: mappedField || 'none',
                directLookup: directLookup,
                found,
                value: found ? value : 'NOT FOUND'
            };
        });

        console.log('Value column status:', valueColumnStatus);

        const missingFields = valueColumnStatus.filter(vc => !vc.found);
        if (missingFields.length > 0) {
            // alert(alertMsg); // Removed user alert
            console.error('⚠️ Some value fields not found in data:', missingFields);
            console.error('This may cause empty cells in the Excel export.');
        } else {
            console.log('✅ All value fields found in data');
        }

        console.log('=== END DIAGNOSTIC ===');
    }

    const TOTAL_KEY = '___TOTAL___';

    // Calculate Row Totals (Inject from rcData)
    if (totalsConfig?.showRowTotals && rcData && rcData.length > 0) {
        rcData.forEach(row => {
            // Build row key using group columns
            const rKey = groupCols.map(c => row[c.id]).join('|||');

            if (!valueMap.has(rKey)) valueMap.set(rKey, new Map());
            const rMap = valueMap.get(rKey)!;

            if (!rMap.has(TOTAL_KEY)) rMap.set(TOTAL_KEY, new Map());
            const totalCMap = rMap.get(TOTAL_KEY)!;

            valueCols.forEach(vc => {
                // Find value in rcData row
                let val = findFieldValue(row, vc.id, vc.name);

                // Fallback to field name mapping if available
                if (val === undefined) {
                    const mappedFieldName = fieldNameMapping.get(vc.id);
                    if (mappedFieldName) {
                        val = row[mappedFieldName];
                    }
                }

                const parsedVal = parseVal(val);
                totalCMap.set(vc.id, parsedVal);
            });
        });
    }

    // Calculate Column Totals (Inject from gcData)
    if (totalsConfig?.showColumnTotals && gcData && gcData.length > 0) {
        if (!valueMap.has(TOTAL_KEY)) valueMap.set(TOTAL_KEY, new Map());
        const grandTotalRowMap = valueMap.get(TOTAL_KEY)!;

        gcData.forEach(row => {
            // Build col key using pivot columns
            const cKey = pivotCols.length > 0 ? pivotCols.map(c => row[c.id]).join('|||') : '';

            if (!grandTotalRowMap.has(cKey)) grandTotalRowMap.set(cKey, new Map());
            const totalCMap = grandTotalRowMap.get(cKey)!;

            valueCols.forEach(vc => {
                // Find value in gcData row
                let val = findFieldValue(row, vc.id, vc.name);

                // Fallback to field name mapping if available
                if (val === undefined) {
                    const mappedFieldName = fieldNameMapping.get(vc.id);
                    if (mappedFieldName) {
                        val = row[mappedFieldName];
                    }
                }

                const parsedVal = parseVal(val);
                totalCMap.set(vc.id, parsedVal);
            });
        });

        // Also handle the Grand Total of Grand Totals (Intersection) if both exist
        // This usually comes from either GC or RC data (they should match)
        // We'll try to find a row in GC data that has no pivot cols (if that's how it's represented)
        // OR we just rely on the fact that if we have both, we might need a specific intersection value.
        // For now, let's assume GC data might contain the global total if pivotCols is empty or if there's a specific row.
        // Actually, if pivotCols > 0, GC data has one row per pivot col.
        // The intersection (Grand Total of Rows AND Columns) is usually not in GC data unless we aggregate it again.
        // BUT, the user said "GC_" sheet has Column Grand Totals.
        // If we want the bottom-right cell (Grand Total of everything), we might need to sum GC data or RC data.
        // Let's sum GC data for now to get the global total.

        if (totalsConfig?.showRowTotals) {
            const globalTotalMap = new Map<string, number>();

            // Sum up all GC values to get the global total
            gcData.forEach(row => {
                valueCols.forEach(vc => {
                    let val = findFieldValue(row, vc.id, vc.name);
                    if (val === undefined) {
                        const mappedFieldName = fieldNameMapping.get(vc.id);
                        if (mappedFieldName) val = row[mappedFieldName];
                    }
                    const parsedVal = parseVal(val);
                    const current = globalTotalMap.get(vc.id) || 0;
                    globalTotalMap.set(vc.id, current + parsedVal);
                });
            });

            if (!grandTotalRowMap.has(TOTAL_KEY)) grandTotalRowMap.set(TOTAL_KEY, new Map());
            const globalTotalCMap = grandTotalRowMap.get(TOTAL_KEY)!;

            valueCols.forEach(vc => {
                globalTotalCMap.set(vc.id, globalTotalMap.get(vc.id) || 0);
            });
        }
    }

    // 4. Inject Total Keys into Lists
    if (totalsConfig?.showRowTotals) {
        if (totalsConfig.rowTotalsPosition === 'left') {
            colKeys.unshift(TOTAL_KEY);
        } else {
            colKeys.push(TOTAL_KEY);
        }
    }

    if (totalsConfig?.showColumnTotals) {
        if (totalsConfig.columnTotalsPosition === 'top') {
            sortedRowKeys.unshift(TOTAL_KEY);
        } else {
            sortedRowKeys.push(TOTAL_KEY);
        }
    }

    // 5. Generate Row Headers
    const tempRowHeaders: PivotRowHeader[][] = sortedRowKeys.map(rKey => {
        if (rKey === TOTAL_KEY) {
            // Grand Total Row
            return groupCols.map((_, idx) => ({
                value: idx === 0 ? (totalsConfig?.columnTotalsLabel || 'Grand Total') : '',
                rowSpan: 1,
                colSpan: idx === 0 ? groupCols.length : 1,
                isVisible: idx === 0, // Only show label in first column, spanning all
                style: { fontWeight: 'bold' }
            }));
        }

        const rowData = rowKeyMap.get(rKey);
        return groupCols.map(col => ({
            value: String(rowData[col.id] || '(Blank)'),
            rowSpan: 1,
            colSpan: 1,
            isVisible: true
        }));
    });

    // Calculate spans (skip Grand Total row)
    for (let j = 0; j < groupCols.length; j++) {
        // Adjust start/end based on Grand Total position
        let startIndex = (totalsConfig?.showColumnTotals && totalsConfig.columnTotalsPosition === 'top') ? 1 : 0;
        let startRow = startIndex;
        let endIndex = (totalsConfig?.showColumnTotals && totalsConfig.columnTotalsPosition === 'bottom') ? tempRowHeaders.length - 1 : tempRowHeaders.length;

        for (let i = startIndex + 1; i < endIndex; i++) {
            const curr = tempRowHeaders[i][j];
            const prev = tempRowHeaders[i - 1][j];

            let parentsMatch = true;
            for (let p = 0; p < j; p++) {
                if (tempRowHeaders[i][p].value !== tempRowHeaders[i - 1][p].value) {
                    parentsMatch = false;
                    break;
                }
            }

            if (curr.value === prev.value && parentsMatch) {
                tempRowHeaders[startRow][j].rowSpan++;
                curr.isVisible = false;
            } else {
                startRow = i;
            }
        }
    }

    // Apply conditional formatting to row headers (groupCols)
    for (let colIdx = 0; colIdx < groupCols.length; colIdx++) {
        const groupCol = groupCols[colIdx];
        if (groupCol.conditionalFormats && groupCol.conditionalFormats.length > 0) {
            for (let rowIdx = 0; rowIdx < tempRowHeaders.length; rowIdx++) {
                const header = tempRowHeaders[rowIdx][colIdx];
                if (header.isVisible && header.value !== 'Grand Total') {
                    const style = applyConditionalFormatting(header.value, groupCol.conditionalFormats, []);
                    if (Object.keys(style).length > 0) {
                        // Apply to this header cell
                        header.style = style;

                        // Apply to all child dimension columns in this row AND all spanned rows
                        const rowSpan = header.rowSpan || 1;
                        for (let spanOffset = 0; spanOffset < rowSpan; spanOffset++) {
                            const targetRowIdx = rowIdx + spanOffset;
                            if (targetRowIdx < tempRowHeaders.length) {
                                for (let childColIdx = colIdx + 1; childColIdx < groupCols.length; childColIdx++) {
                                    const childHeader = tempRowHeaders[targetRowIdx][childColIdx];
                                    childHeader.style = { ...childHeader.style, ...style };
                                }
                            }
                        }
                    }
                }
            }
        }
    }


    // 6. Generate Data Matrix
    const rawDataMatrix: (string | number | null)[][] = [];

    sortedRowKeys.forEach(rKey => {
        const row: (string | number | null)[] = [];
        const rMap = valueMap.get(rKey);

        colKeys.forEach(cKey => {
            const cMap = rMap?.get(cKey);
            valueCols.forEach(vc => {
                // Try to get value from map first using fieldId
                let val = cMap?.get(vc.id);

                // If not found, try using the mapped field name
                if (val === undefined && cMap) {
                    const mappedFieldName = fieldNameMapping.get(vc.id);
                    if (mappedFieldName) {
                        val = cMap.get(mappedFieldName);
                    }
                }

                // If still not found, try alternative lookups (fallback for edge cases)
                if (val === undefined && cMap) {
                    // Try normalized ID
                    const normalizedId = vc.id.replace(/[\[\]]/g, '').trim();
                    val = cMap.get(normalizedId);

                    // Try name match
                    if (val === undefined && vc.name) {
                        const mapKeys = Array.from(cMap.keys());
                        const matchedKey = mapKeys.find(key =>
                            key.toLowerCase() === vc.id.toLowerCase() ||
                            key.toLowerCase() === normalizedId.toLowerCase() ||
                            key.toLowerCase() === vc.name.toLowerCase()
                        );
                        if (matchedKey) {
                            val = cMap.get(matchedKey);
                        }
                    }
                }

                row.push(val !== undefined ? val : null);
            });
        });
        rawDataMatrix.push(row);
    });

    // Apply Conditional Formatting to data cells
    const dataMatrix: (PivotCell | null)[][] = rawDataMatrix.map(row => row.map(val => ({ value: val })));

    // Final diagnostic: Check data matrix for values
    if (rawDataMatrix.length > 0) {
        const totalCells = rawDataMatrix.reduce((sum, row) => sum + row.length, 0);
        const nonNullCells = rawDataMatrix.reduce((sum, row) =>
            sum + row.filter(val => val !== null && val !== undefined).length, 0
        );
        const nullCells = totalCells - nonNullCells;

        console.log('=== DATA MATRIX SUMMARY ===');
        console.log(`Total cells: ${totalCells}`);
        console.log(`Non-null cells: ${nonNullCells}`);
        console.log(`Null cells: ${nullCells}`);
        console.log(`Fill rate: ${totalCells > 0 ? ((nonNullCells / totalCells) * 100).toFixed(1) : 0}%`);

        if (totalCells > 0 && nonNullCells === 0) {
            console.warn('CRITICAL: NO VALUES IN DATA MATRIX! All cells are empty.');
        } else if (nullCells > totalCells * 0.5) {
            console.warn(`WARNING: MANY EMPTY CELLS. Empty: ${nullCells} (${((nullCells / totalCells) * 100).toFixed(1)}%)`);
        }
    }

    if (rawDataMatrix.length > 0) {
        const numCols = rawDataMatrix[0].length;

        // Apply formatting for each data cell
        for (let rowIdx = 0; rowIdx < rawDataMatrix.length; rowIdx++) {
            for (let colIdx = 0; colIdx < numCols; colIdx++) {
                const val = rawDataMatrix[rowIdx][colIdx];
                let combinedStyle: React.CSSProperties = {};

                // 1. Check row dimension formatting (groupCols)
                for (let groupColIdx = 0; groupColIdx < groupCols.length; groupColIdx++) {
                    const groupCol = groupCols[groupColIdx];
                    if (groupCol.conditionalFormats && groupCol.conditionalFormats.length > 0) {
                        const rowHeader = tempRowHeaders[rowIdx][groupColIdx];
                        if (rowHeader && rowHeader.value !== 'Grand Total') {
                            const rowStyle = applyConditionalFormatting(rowHeader.value, groupCol.conditionalFormats, []);
                            combinedStyle = { ...combinedStyle, ...rowStyle };
                        }
                    }
                }

                // 2. Check column dimension formatting (pivotCols)
                // Determine which pivot key this column belongs to
                const pivotKeyIdx = Math.floor(colIdx / valueCols.length);
                const pivotKey = colKeys[pivotKeyIdx];

                if (pivotKey && pivotKey !== TOTAL_KEY) {
                    const pivotValues = pivotKey.split('|||');
                    for (let level = 0; level < pivotCols.length; level++) {
                        const pivotCol = pivotCols[level];
                        if (pivotCol.conditionalFormats && pivotCol.conditionalFormats.length > 0) {
                            const pivotValue = pivotValues[level] || '';
                            const colStyle = applyConditionalFormatting(pivotValue, pivotCol.conditionalFormats, []);
                            combinedStyle = { ...combinedStyle, ...colStyle };
                        }
                    }
                }

                // 3. Check value column formatting (existing logic)
                const valueColIdx = colIdx % valueCols.length;
                const valueCol = valueCols[valueColIdx];

                if (valueCol.conditionalFormats && valueCol.conditionalFormats.length > 0) {
                    // Collect all numeric values in this column for stats
                    const colValues: number[] = [];
                    for (let r = 0; r < rawDataMatrix.length; r++) {
                        const v = rawDataMatrix[r][colIdx];
                        if (typeof v === 'number') {
                            colValues.push(v);
                        } else if (typeof v === 'string' && !isNaN(parseFloat(v))) {
                            colValues.push(parseFloat(v));
                        }
                    }

                    const valueStyle = applyConditionalFormatting(val, valueCol.conditionalFormats, colValues);
                    combinedStyle = { ...combinedStyle, ...valueStyle };
                }

                // Apply combined style if any formatting was applied
                if (Object.keys(combinedStyle).length > 0) {
                    dataMatrix[rowIdx][colIdx]!.style = combinedStyle;
                }
            }
        }
    }

    // 7. Generate Column Headers
    const headerRows: { label: string, colSpan: number, style?: React.CSSProperties }[][] = [];
    const totalHeaderRows = pivotCols.length + (valueCols.length > 0 ? 1 : 0);
    for (let i = 0; i < totalHeaderRows; i++) headerRows.push([]);

    const expandedKeys = colKeys.flatMap(k => valueCols.map(v => ({ pivotKey: k, valueCol: v })));

    for (let level = 0; level < pivotCols.length; level++) {
        const row: { label: string, colSpan: number, style?: React.CSSProperties }[] = [];
        let currentLabel: string | null = null;
        let currentSpan = 0;

        expandedKeys.forEach((item, index) => {
            let label = '';
            if (item.pivotKey === TOTAL_KEY) {
                label = level === 0 ? 'Grand Total' : ''; // Only show on top level
                // Add bold style for Grand Total header
                // We need to find the header object in the row and add style
                // But here we are building the row array.
                // We can't easily add style here because 'row' is an array of objects.
                // We need to modify how 'row' is constructed or add style property to the object pushed to 'row'.
            } else {
                const pivotValues = item.pivotKey.split('|||');
                label = pivotValues[level] || '';
            }

            // Logic for merging headers
            let parentsMatch = true;
            if (index > 0) {
                const prevItem = expandedKeys[index - 1];
                if (prevItem.pivotKey === TOTAL_KEY && item.pivotKey === TOTAL_KEY) {
                    parentsMatch = true;
                } else if (prevItem.pivotKey !== TOTAL_KEY && item.pivotKey !== TOTAL_KEY) {
                    const pivotValues = item.pivotKey.split('|||');
                    const prevPivotValues = prevItem.pivotKey.split('|||');
                    for (let p = 0; p < level; p++) {
                        if (pivotValues[p] !== prevPivotValues[p]) {
                            parentsMatch = false;
                            break;
                        }
                    }
                } else {
                    parentsMatch = false;
                }
            }

            if (label === currentLabel && parentsMatch && index > 0) {
                currentSpan++;
            } else {
                if (currentLabel !== null) {
                    const isTotal = currentLabel === (totalsConfig?.columnTotalsLabel || 'Grand Total');
                    row.push({
                        label: currentLabel,
                        colSpan: currentSpan,
                        style: isTotal ? { fontWeight: 'bold' } : undefined
                    });
                }
                currentLabel = label;
                currentSpan = 1;
            }
        });
        if (currentLabel !== null) {
            const isTotal = currentLabel === (totalsConfig?.columnTotalsLabel || 'Grand Total');
            row.push({
                label: currentLabel,
                colSpan: currentSpan,
                style: isTotal ? { fontWeight: 'bold' } : undefined
            });
        }
        headerRows[level] = row;
    }

    // Apply conditional formatting to column headers (pivotCols)
    for (let level = 0; level < pivotCols.length; level++) {
        const pivotCol = pivotCols[level];
        if (pivotCol.conditionalFormats && pivotCol.conditionalFormats.length > 0) {
            for (const header of headerRows[level]) {
                if (header.label && header.label !== 'Grand Total') {
                    const style = applyConditionalFormatting(header.label, pivotCol.conditionalFormats, []);
                    if (Object.keys(style).length > 0) {
                        header.style = style;
                    }
                }
            }
        }
    }


    // Last level: Value Columns
    if (valueCols.length > 0) {
        const row: { label: string, colSpan: number, style?: React.CSSProperties }[] = [];
        expandedKeys.forEach(item => {
            row.push({ label: item.valueCol.name, colSpan: 1 });
        });
        headerRows[pivotCols.length] = row;
    }

    return {
        headerRows,
        rowHeaders: tempRowHeaders,
        dataMatrix
    };
};

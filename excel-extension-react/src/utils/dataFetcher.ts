/**
 * Utility to fetch full dataset from Tableau worksheet
 */

export async function fetchFullDataset(worksheetName: string, maxRows: number = 0): Promise<{ main: any[], gcData: any[] | null, rcData: any[] | null }> {
    try {
        const worksheets = window.tableau?.extensions?.dashboardContent?.dashboard?.worksheets;
        if (!worksheets) {
            throw new Error('Unable to access Tableau worksheets');
        }

        const fetchSheetData = async (name: string): Promise<any[]> => {
            const worksheet = worksheets.find((w: any) => w.name === name);
            if (!worksheet) {
                console.log(`Worksheet "${name}" not found`);
                return [];
            }

            // Fetch data with maxRows limit (0 = unlimited)
            const summaryData = await worksheet.getSummaryDataAsync({ maxRows: maxRows });

            // Check if using Measure Names/Measure Values structure
            const hasMeasureNames = summaryData.columns.some((col: any) => col.fieldName === 'Measure Names');
            const hasMeasureValues = summaryData.columns.some((col: any) => col.fieldName === 'Measure Values');

            // Transform to simple objects
            const data: any[] = [];

            if (hasMeasureNames && hasMeasureValues) {
                // Handle Measure Names/Measure Values pivot structure
                const measureNameIdx = summaryData.columns.findIndex((col: any) => col.fieldName === 'Measure Names');
                const measureValueIdx = summaryData.columns.findIndex((col: any) => col.fieldName === 'Measure Values');

                // Get dimension columns (excluding Measure Names and Measure Values)
                const dimensionCols = summaryData.columns.filter(
                    (col: any) => col.fieldName !== 'Measure Names' && col.fieldName !== 'Measure Values'
                );

                // Group rows by dimensions to unpivot
                const rowGroups = new Map<string, any>();

                for (const row of summaryData.data) {
                    // Build dimension key
                    const dimKey = dimensionCols.map((col: any) => {
                        const colIndex = summaryData.columns.findIndex((c: any) => c.fieldName === col.fieldName);
                        return row[colIndex].value;
                    }).join('|||');

                    // Get or create row object
                    if (!rowGroups.has(dimKey)) {
                        const rowObj: any = {};
                        dimensionCols.forEach((col: any) => {
                            const colIndex = summaryData.columns.findIndex((c: any) => c.fieldName === col.fieldName);
                            rowObj[col.fieldName] = row[colIndex].value;
                        });
                        rowGroups.set(dimKey, rowObj);
                    }

                    // Add measure value to the appropriate field
                    const rowObj = rowGroups.get(dimKey)!;
                    const measureName = row[measureNameIdx].value;
                    const measureValue = row[measureValueIdx].value;
                    rowObj[measureName] = measureValue;
                }

                data.push(...Array.from(rowGroups.values()));
            } else {
                // Standard structure - no unpivoting needed
                for (const row of summaryData.data) {
                    const rowObj: any = {};
                    summaryData.columns.forEach((col: any, idx: number) => {
                        const value = row[idx].value;
                        rowObj[col.fieldName] = value;
                    });
                    data.push(rowObj);
                }
            }
            return data;
        };

        console.log(`Fetching main data for "${worksheetName}"...`);
        const mainData = await fetchSheetData(worksheetName);

        if (mainData.length === 0) {
            throw new Error(`Worksheet "${worksheetName}" not found or empty`);
        }

        const gcSheetName = `GC_${worksheetName}`;
        console.log(`Fetching Column Grand Totals from "${gcSheetName}"...`);
        const gcData = await fetchSheetData(gcSheetName);

        const rcSheetName = `RC_${worksheetName}`;
        console.log(`Fetching Row Grand Totals from "${rcSheetName}"...`);
        const rcData = await fetchSheetData(rcSheetName);

        return {
            main: mainData,
            gcData: gcData.length > 0 ? gcData : null,
            rcData: rcData.length > 0 ? rcData : null
        };

    } catch (error) {
        console.error('Error fetching full dataset:', error);
        throw error;
    }
}

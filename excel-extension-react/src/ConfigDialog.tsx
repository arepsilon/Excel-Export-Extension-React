import { useEffect, useState } from 'react';
import { useTableau } from './hooks/useTableau';
import { useConfigState } from './hooks/useConfigState';
import { ConfigPanel } from './features/config/ConfigPanel';
import { PreviewSection } from './features/preview/PreviewSection';
import { CButton, CSpinner, CTooltip } from '@coreui/react';
import { Mail } from 'lucide-react';
import type { Column } from './types';

export default function ConfigDialog() {
    const { isInitialized, worksheets } = useTableau();
    const { config, updateConfig, addMetricGroup, removeMetricGroup, updateMetricGroup, resetConfig, setConfig } = useConfigState();
    const [allColumns, setAllColumns] = useState<Column[]>([]);
    const [filters, setFilters] = useState<any[]>([]);
    const [loadingColumns, setLoadingColumns] = useState(false);

    // Preview state
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewGCData, setPreviewGCData] = useState<any[] | null>(null);
    const [previewRCData, setPreviewRCData] = useState<any[] | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [totalPreviewRows, setTotalPreviewRows] = useState(0);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Load saved settings on init
    useEffect(() => {
        if (isInitialized && window.tableau?.extensions?.settings) {
            const activeWorksheet = window.tableau.extensions.settings.get('active_worksheet');
            let configToLoad = null;

            if (activeWorksheet) {
                configToLoad = window.tableau.extensions.settings.get(`config_${activeWorksheet}`);
            }

            // Fallback
            if (!configToLoad) {
                configToLoad = window.tableau.extensions.settings.get('config');
            }

            if (configToLoad) {
                try {
                    const parsed = JSON.parse(configToLoad);
                    console.log('Loaded saved config:', parsed);
                    setConfig(parsed);
                } catch (error) {
                    console.error('Error loading saved config:', error);
                }
            }
        }
    }, [isInitialized]);

    // Fetch columns when worksheet changes - ONLY from the view
    useEffect(() => {
        const fetchColumns = async () => {
            if (!config.selectedWorksheet || !isInitialized) return;

            setLoadingColumns(true);
            try {
                const worksheet = worksheets.find((w: any) => w.name === config.selectedWorksheet);
                if (worksheet) {
                    // Fetch datasources to get field captions and calculated status
                    const dataSources = await worksheet.getDataSourcesAsync();
                    const fieldInfoMap = new Map<string, { caption: string, isCalculatedField: boolean }>();

                    dataSources.forEach((ds: any) => {
                        ds.fields.forEach((f: any) => {
                            const info = {
                                caption: f.caption || f.name,
                                isCalculatedField: f.isCalculatedField || false
                            };
                            fieldInfoMap.set(f.name, info);
                            fieldInfoMap.set(f.id, info);
                        });
                    });

                    // Fetch more rows to detect Measure Names/Values
                    const summaryData = await worksheet.getSummaryDataAsync({ maxRows: 10000 });

                    // Check if we have Measure Names/Values structure
                    const measureNamesIdx = summaryData.columns.findIndex((c: any) => c.fieldName === 'Measure Names');
                    const measureValuesIdx = summaryData.columns.findIndex((c: any) => c.fieldName === 'Measure Values');
                    const hasMeasureValues = measureNamesIdx !== -1 && measureValuesIdx !== -1;

                    console.log('Summary Data Columns:', summaryData.columns);

                    let columns: Column[] = summaryData.columns
                        .filter((col: any) => col.fieldName !== 'Measure Names' && col.fieldName !== 'Measure Values')
                        .map((col: any) => {
                            const info = fieldInfoMap.get(col.fieldName);
                            const friendlyName = info?.caption || col.name || col.fieldName;
                            // Use isCalculatedField from datasource if available, otherwise fallback to column property
                            const isCalculated = info ? info.isCalculatedField : col.isCalculatedField;

                            return {
                                id: col.fieldName,
                                name: friendlyName,
                                dataType: col.dataType,
                                isCalculatedField: isCalculated
                            };
                        });

                    // If we have Measure Names/Values, extract the individual measure names
                    if (hasMeasureValues) {
                        const measureNames = new Set<string>();
                        summaryData.data.forEach((row: any[]) => {
                            const rawMeasureName = row[measureNamesIdx].value;
                            if (rawMeasureName) {
                                let cleanName = rawMeasureName;
                                const match = rawMeasureName.match(/\[([^\]]+)\]\.\[([^:]+):([^:]+):/);
                                if (match && match[3]) {
                                    cleanName = match[3];
                                } else {
                                    const simpleMatch = rawMeasureName.match(/\[([^\]]+)\]$/);
                                    if (simpleMatch && simpleMatch[1]) {
                                        cleanName = simpleMatch[1];
                                    }
                                }
                                measureNames.add(cleanName);
                            }
                        });

                        measureNames.forEach(measureName => {
                            const info = fieldInfoMap.get(measureName);
                            const friendlyName = info?.caption || measureName;
                            // For extracted measures, check if they are calculated fields
                            const isCalculated = info ? info.isCalculatedField : true;

                            columns.push({
                                id: measureName,
                                name: friendlyName,
                                dataType: 'float',
                                isCalculatedField: isCalculated
                            });
                        });
                        console.log('Extracted measures from Measure Values:', Array.from(measureNames));
                    }

                    console.log('Fetched columns from view:', columns);

                    // Fetch filters
                    const worksheetFilters = await worksheet.getFiltersAsync();
                    const validFilters = await Promise.all(worksheetFilters
                        .filter((f: any) => f.fieldName !== 'Measure Names')
                        .map(async (f: any) => {
                            let value = '';
                            switch (f.filterType) {
                                case 'categorical':
                                    value = f.appliedValues?.map((v: any) => v.formattedValue).join(', ') || 'All';
                                    break;
                                case 'range':
                                    value = `${f.minValue?.formattedValue || '*'} to ${f.maxValue?.formattedValue || '*'}`;
                                    break;
                                case 'relative-date':
                                    value = `${f.period} ${f.rangeType}`;
                                    break;
                                default:
                                    value = 'Complex Filter';
                            }

                            return {
                                id: f.fieldName,
                                name: f.fieldName,
                                value: value
                            };
                        }));
                    setFilters(validFilters);

                    setAllColumns(columns);
                }
            } catch (error) {
                console.error('Error fetching columns:', error);
                setAllColumns([]);
                setFilters([]);
            } finally {
                setLoadingColumns(false);
            }
        };

        fetchColumns();
    }, [config.selectedWorksheet, isInitialized, worksheets]);

    const handleAddCustomField = (name: string) => {
        const newField: Column = {
            id: `custom_${Date.now()}`,
            name: name,
            dataType: 'float',
            isCalculatedField: true,
            isCustom: true
            // lodDef removed
        };
        setAllColumns(prev => [...prev, newField]);
    };

    const handleDeleteCustomField = (fieldId: string) => {
        setAllColumns(prev => prev.filter(c => c.id !== fieldId));
    };

    const handleUpdateCustomField = (fieldId: string, name: string) => {
        setAllColumns(prev => prev.map(c =>
            c.id === fieldId
                ? { ...c, name } // lodDef removed
                : c
        ));
    };

    // Calculate available columns (excluding those already in use)
    const allFields = [...allColumns, ...(config.customFields || [])];
    const availableColumns = allFields.filter(col => {
        const usedInGroup = config.groupColumns.some(c => c.id === col.id);
        const usedInPivot = config.pivotColumns.some(c => c.id === col.id);
        const usedInValue = config.valueColumns.some(c => c.id === col.id);
        return !usedInGroup && !usedInPivot && !usedInValue;
    });

    const handleGeneratePreview = async () => {
        if (!config.selectedWorksheet) return;

        setIsLoadingPreview(true);
        // const logs: string[] = [];

        try {
            // logs.push(`Fetching data for: ${config.selectedWorksheet}`);

            // Use the centralized data fetcher
            // Import fetchFullDataset at the top of the file first!
            // But since I can't add import in this block easily without replacing whole file,
            // I will assume I added it or will add it in a separate step.
            // Actually, I should add the import first. 
            // I'll do the import in a separate tool call or just assume it's there if I replace the whole file?
            // No, I'm using replace_file_content.
            // I'll use the existing import from './utils/dataFetcher' if it exists, or add it.
            // It currently imports from './utils/lodHelper' and others.

            const { main: data, gcData, rcData } = await import('./utils/dataFetcher').then(m => m.fetchFullDataset(config.selectedWorksheet, 20000));

            // logs.push(`Fetched ${data.length} rows.`);
            // if (gcData) logs.push(`Fetched ${gcData.length} GC rows.`);
            // if (rcData) logs.push(`Fetched ${rcData.length} RC rows.`);

            setTotalPreviewRows(data.length);
            setPreviewData(data);
            setPreviewGCData(gcData);
            setPreviewRCData(rcData);

            if (data.length > 0) {
                // logs.push(`Sample row: ${JSON.stringify(data[0])}`);
            }

            // logs.push(`Config - Rows: ${config.groupColumns.map(c => c.id).join(', ')}`);
            // logs.push(`Config - Cols: ${config.pivotColumns.map(c => c.id).join(', ')}`);
            // logs.push(`Config - Vals: ${config.valueColumns.map(c => c.id).join(', ')}`);

            // Filter out Tableau system fields from configuration before passing to pivot
            const cleanGroupCols = config.groupColumns.filter(c =>
                c.id !== 'Measure Names' && c.id !== 'Measure Values'
            );
            const cleanPivotCols = config.pivotColumns.filter(c =>
                c.id !== 'Measure Names' && c.id !== 'Measure Values'
            );
            const cleanValueCols = config.valueColumns.filter(c =>
                c.id !== 'Measure Names' && c.id !== 'Measure Values'
            );

            if (cleanGroupCols.length !== config.groupColumns.length ||
                cleanPivotCols.length !== config.pivotColumns.length ||
                cleanValueCols.length !== config.valueColumns.length) {
                // logs.push('Auto-removed Measure Names/Values from configuration');

                // Update config to remove these fields
                updateConfig({
                    groupColumns: cleanGroupCols,
                    pivotColumns: cleanPivotCols,
                    valueColumns: cleanValueCols
                });
            }

            // Calculate LODs



        } finally {
            setIsLoadingPreview(false);
        }
    };

    const onShowPreview = async () => {
        if (config.exportMode === 'datadump') {
            alert('Preview only available for formatted excel report');
            return;
        }
        setShowPreviewModal(true);
        await handleGeneratePreview();
    };

    const handleSave = () => {
        // Save settings to Tableau settings
        if (window.tableau?.extensions?.settings && config.selectedWorksheet) {
            setSaveStatus('saving');

            // Save specific config for this worksheet
            window.tableau.extensions.settings.set(`config_${config.selectedWorksheet}`, JSON.stringify(config));
            // Set as active worksheet
            window.tableau.extensions.settings.set('active_worksheet', config.selectedWorksheet);

            window.tableau.extensions.settings.saveAsync().then(() => {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 3000);
            }).catch((err: any) => {
                console.error('Error saving settings:', err);
                setSaveStatus('error');
            });
        }
    };

    const handleWorksheetChange = (name: string) => {
        if (!name) return;

        // Try to load config for this worksheet
        const savedConfigStr = window.tableau.extensions.settings.get(`config_${name}`);
        if (savedConfigStr) {
            try {
                const parsed = JSON.parse(savedConfigStr);
                setConfig(parsed);
            } catch (e) {
                console.error('Error parsing saved config for sheet:', name);
                resetConfig(name);
            }
        } else {
            // No config found, reset to defaults for this sheet
            resetConfig(name);
        }
    };

    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <CSpinner color="primary" className="mb-3" />
                    <p className="text-gray-600">Initializing configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6 bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img
                                src="./eps-logo-2023_v03--blue.svg"
                                alt="Epsilon"
                                className="h-8"
                            />
                            <h1 className="text-xl font-bold text-epsilon-blue">Configure Excel Export</h1>
                        </div>
                        {loadingColumns && <CSpinner size="sm" color="primary" />}
                        <div className="flex gap-4 items-center">
                            <CTooltip
                                content="If you're facing any issues using this page or there are any issues, please contact abhishek.rao@epsilon.com"
                                placement="bottom"
                            >
                                <Mail className="text-epsilon-blue cursor-help h-5 w-5" />
                            </CTooltip>
                        </div>
                    </div>
                </header>



                <ConfigPanel
                    config={config}
                    onUpdateConfig={updateConfig}
                    worksheets={worksheets}
                    filters={filters}
                    onWorksheetChange={handleWorksheetChange}
                    availableColumns={availableColumns}
                    allFields={allFields}
                    groupColumns={config.groupColumns}
                    pivotColumns={config.pivotColumns}
                    valueColumns={config.valueColumns}
                    onColumnsUpdate={(section, columns) => {
                        updateConfig({ [`${section}Columns`]: columns });
                    }}
                    metricGroups={config.metricGroups}
                    onAddGroup={addMetricGroup}
                    onRemoveGroup={removeMetricGroup}
                    onUpdateGroup={updateMetricGroup}
                    onAddCustomField={handleAddCustomField}
                    onDeleteCustomField={handleDeleteCustomField}
                    onUpdateCustomField={handleUpdateCustomField}
                />

                <PreviewSection
                    visible={showPreviewModal}
                    onClose={() => setShowPreviewModal(false)}
                    config={config}
                    previewData={previewData}
                    gcData={previewGCData}
                    rcData={previewRCData}
                    isLoading={isLoadingPreview}
                    totalRows={totalPreviewRows}
                    filters={filters}
                    allFields={allColumns}
                />

                <div className="mt-6 flex justify-end gap-3 items-center">
                    {saveStatus === 'saved' && <span className="text-green-600 font-medium mr-2">Configuration Saved!</span>}
                    {saveStatus === 'error' && <span className="text-red-600 font-medium mr-2">Error Saving!</span>}

                    <CButton
                        color="secondary"
                        onClick={() => window.tableau?.extensions?.ui?.closeDialog('cancel')}
                    >
                        Close
                    </CButton>
                    <CButton
                        color="primary"
                        onClick={handleSave}
                        disabled={saveStatus === 'saving'}
                    >
                        {saveStatus === 'saving' ? 'Saving...' : 'Save Configuration'}
                    </CButton>
                    <CButton
                        color="primary"
                        variant="outline"
                        onClick={onShowPreview}
                        disabled={!config.selectedWorksheet || isLoadingPreview}
                        className="border-epsilon-blue text-epsilon-blue hover:bg-epsilon-blue hover:text-white"
                    >
                        {isLoadingPreview ? <CSpinner size="sm" /> : 'Preview'}
                    </CButton>
                </div>
            </div>
        </div>
    );
}

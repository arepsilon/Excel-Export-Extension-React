import { useEffect, useState } from 'react';
import { useTableau } from './hooks/useTableau';
import { CSpinner, CAlert } from '@coreui/react';
import { processPivotData } from './utils/pivotHelper';
import { fetchFullDataset } from './utils/dataFetcher';
import { exportData } from './utils/exportManager';
import type { Config } from './types';

function App() {
  const { isInitialized, worksheets } = useTableau();
  const [savedConfig, setSavedConfig] = useState<Config | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    // Load saved configuration from Tableau settings
    if (isInitialized) {
      if (window.tableau?.extensions?.settings) {
        const loadSettings = () => {
          setIsLoadingConfig(true);

          // Try to get active worksheet first
          const activeWorksheet = window.tableau.extensions.settings.get('active_worksheet');
          let configToLoad = null;

          if (activeWorksheet) {
            const savedConfigStr = window.tableau.extensions.settings.get(`config_${activeWorksheet}`);
            if (savedConfigStr) {
              configToLoad = savedConfigStr;
            }
          }

          // Fallback to legacy 'config' if no active worksheet specific config found
          if (!configToLoad) {
            configToLoad = window.tableau.extensions.settings.get('config');
          }

          if (configToLoad) {
            try {
              const parsed = JSON.parse(configToLoad);
              setSavedConfig(parsed);
            } catch (error) {
              console.error('Error loading configuration:', error);
            }
          } else {
            console.log('No saved configuration found.');
            setSavedConfig(null);
          }
          setIsLoadingConfig(false);
        };

        // Initial load
        loadSettings();

        // Listen for settings changes
        const unregisterHandler = window.tableau.extensions.settings.addEventListener(
          window.tableau.TableauEventType.SettingsChanged,
          () => {
            console.log('Settings changed, reloading config...');
            loadSettings();
          }
        );

        return () => {
          if (unregisterHandler) unregisterHandler();
        };
      } else {
        // Settings not available (shouldn't happen if initialized, but safe fallback)
        setIsLoadingConfig(false);
      }
    }
  }, [isInitialized, worksheets]);



  const handleExport = async () => {
    if (!savedConfig) {
      setExportError('Configuration not loaded. Please configure the extension first.');
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);

      const exportDataList: any[] = [];
      const settings = window.tableau.extensions.settings;

      // 1. Identify all configured worksheets
      const configuredWorksheets: { name: string, config: any }[] = [];

      // Iterate through all available worksheets
      worksheets.forEach((ws: any) => {
        const configStr = settings.get(`config_${ws.name}`);
        if (configStr) {
          try {
            const cfg = JSON.parse(configStr);
            // Include ALL configured worksheets, regardless of exportMode
            configuredWorksheets.push({ name: ws.name, config: cfg });
          } catch (e) {
            console.error(`Error parsing config for ${ws.name}`, e);
          }
        }
      });

      // Fallback: If no specific configs found, check for legacy/single config
      if (configuredWorksheets.length === 0 && savedConfig) {
        configuredWorksheets.push({ name: savedConfig.selectedWorksheet, config: savedConfig });
      }

      if (configuredWorksheets.length === 0) {
        throw new Error("No configured worksheets found to export.");
      }

      // 2. Fetch data for each configured worksheet
      await Promise.all(configuredWorksheets.map(async ({ name, config }) => {
        console.log(`Fetching data for export: ${name}`);

        // Fetch data (Main + GC + RC)
        const { main: data, gcData, rcData } = await fetchFullDataset(name);

        // Fetch columns/filters metadata for this worksheet (needed for export)
        // We need to get the worksheet object
        const worksheet = worksheets.find((w: any) => w.name === name);
        let filters: any[] = [];
        let allFields: any[] = []; // We might need to fetch this or derive it

        if (worksheet) {
          // Fetch filters
          try {
            const worksheetFilters = await worksheet.getFiltersAsync();
            filters = await Promise.all(worksheetFilters
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
                return { id: f.fieldName, name: f.fieldName, value: value };
              }));
          } catch (e) {
            console.warn(`Could not fetch filters for ${name}`, e);
          }

          // For allFields, we can try to use what's in the config or fetch basic info
          // For now, let's pass an empty array or try to reconstruct from config
          // The export function uses allFields mainly for header mapping if needed
          allFields = [...config.groupColumns, ...config.pivotColumns, ...config.valueColumns];
        }

        // Process pivot data
        const pivotResult = processPivotData(
          data,
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

        exportDataList.push({
          config,
          pivotResult,
          filters,
          allFields,
          sheetName: config.worksheetName || name
        });
      }));

      if (exportDataList.length === 0) {
        throw new Error("Failed to prepare data for export.");
      }
      // 3. Export using Export Manager (handles Excel, CSV, and Zip)
      // Determine workbook name: use the first configured workbook name found, or fallback to Tableau workbook name
      let workbookName = window.tableau.extensions.workbook.name;
      const configuredWorkbookName = configuredWorksheets.find(ws => ws.config.workbookName)?.config.workbookName;
      if (configuredWorkbookName) {
        workbookName = configuredWorkbookName;
      }

      await exportData(exportDataList, workbookName);

    } catch (error: any) {
      console.error('Export failed:', error);
      setExportError(error.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <CSpinner color="primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-gray-50 overflow-hidden">
      <div className="text-center relative flex flex-col items-center justify-center w-full h-full">
        {exportError && (
          <CAlert
            color="danger"
            dismissible
            onClose={() => setExportError(null)}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 min-w-[300px] z-10"
          >
            {exportError}
          </CAlert>
        )}

        {/* Show loading spinner if config is loading or exporting */}
        {(isExporting || isLoadingConfig) && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <CSpinner color="primary" />
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={isExporting || isLoadingConfig}
          className="focus:outline-none hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center p-4"
          title={!savedConfig ? "Configuration Required" : "Export to Excel"}
        >
          <img
            src="./excel-icon.svg"
            alt="Export to Excel"
            className="max-w-[80vw] max-h-[80vh] object-contain cursor-pointer"
          />
        </button>

        {!savedConfig && !isLoadingConfig && (
          <div className="mt-2 text-sm text-gray-500 absolute bottom-8">
            Please configure extension
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
